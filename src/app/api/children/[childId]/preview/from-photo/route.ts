import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fal } from "@fal-ai/client";
import Anthropic from "@anthropic-ai/sdk";
import { buildIllustrationStyle } from "@/lib/ai/story-generator";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";

fal.config({ credentials: process.env.FAL_KEY! });

const anthropic = new Anthropic();

export const maxDuration = 60;

interface Props {
  params: Promise<{ childId: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY niet ingesteld" }, { status: 500 });
  }

  // Rate limit BEFORE Claude Vision + fal.ai calls (each ~€0.01-0.02)
  const blocked = await enforceRateLimit("photoUpload", session.user.id);
  if (blocked) return blocked;

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  const formData = await request.formData();
  const photo = formData.get("photo") as File | null;

  if (!photo) {
    return NextResponse.json({ error: "Geen foto ontvangen" }, { status: 400 });
  }

  try {
    // 1. Convert photo to base64 for Claude Vision
    const photoBuffer = Buffer.from(await photo.arrayBuffer());
    const base64 = photoBuffer.toString("base64");
    const mediaType = photo.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    // 2. Ask Claude to describe the child's appearance from the photo
    const visionResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Describe this child's physical appearance in English for an illustrator. Be specific and concise. Include:
- Approximate age
- Gender presentation
- Hair color (be specific: light brown, dark blonde, etc.)
- Hair style (short, long, curly, straight, pigtails, etc.)
- Eye color if visible
- Skin tone (fair, light, medium, olive, tan, brown, dark brown, etc.)
- Whether they wear glasses
- Any distinctive features (dimples, freckles, etc.)

Format as a single comma-separated description, like:
"a 3 year old girl, fair skin, long curly light brown hair, blue eyes, round chubby cheeks, small dimples"

Only output the description, nothing else.`,
            },
          ],
        },
      ],
    });

    const descriptionText = visionResponse.content.find((c) => c.type === "text");
    if (!descriptionText || descriptionText.type !== "text") {
      throw new Error("Geen beschrijving van Claude ontvangen");
    }

    // Clean up the description (remove quotes if present)
    let characterPrompt = descriptionText.text.trim().replace(/^["']|["']$/g, "");

    // 3. Generate illustration with FLUX Schnell using the description (same model as stories)
    const bible = {
      childName: child.name,
      dateOfBirth: child.dateOfBirth.toISOString(),
      gender: child.gender,
      interests: child.interests,
      mainCharacterType: child.mainCharacterType,
    };
    const style = buildIllustrationStyle(bible);

    const illustrationPrompt = `${characterPrompt}, standing in a sunny meadow with flowers, smiling and waving, full body portrait, looking at the viewer. ${style}`;

    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input: {
        prompt: illustrationPrompt,
        image_size: "square",
        num_images: 1,
        seed: Math.floor(Math.random() * 9_999_999),
        safety_tolerance: "2",
        enable_safety_checker: true,
      },
    });

    const images = (result as { data?: { images?: { url: string }[] } }).data?.images;
    const imageUrl = images?.[0]?.url ?? null;

    if (!imageUrl) {
      throw new Error("Geen illustratie gegenereerd");
    }

    // 4. Original photo is NOT stored — only the text description and illustration are returned
    return NextResponse.json({
      imageUrl,
      characterPrompt,
    });
  } catch (err) {
    console.error("Photo-to-illustration error:", err);
    return NextResponse.json(
      { error: "Foto kon niet worden verwerkt. Probeer een andere foto." },
      { status: 500 }
    );
  }
}
