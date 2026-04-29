import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fal } from "@fal-ai/client";
import { buildCharacterDescription, buildIllustrationStyle } from "@/lib/ai/story-generator";
import { calculateAge } from "@/lib/utils/age";
import {
  uploadFromUrl,
  approvedPreviewKey,
  isOwnStorageUrl,
} from "@/lib/storage/scaleway";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";
import { loadUserGate } from "@/lib/user-gate";

fal.config({ credentials: process.env.FAL_KEY! });

interface Props {
  params: Promise<{ childId: string }>;
}

// POST: generate a preview illustration
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY niet ingesteld" }, { status: 500 });
  }

  // Block pending/suspended users from burning fal.ai credits before
  // an admin has approved the account.
  const gate = await loadUserGate(session.user.id);
  if (!gate?.isApproved) {
    return NextResponse.json(
      { error: "Je account moet eerst goedgekeurd worden" },
      { status: 403 }
    );
  }

  // Rate limit BEFORE fal.ai call (costs ~€0.01 per preview)
  const blocked = await enforceRateLimit("previewGenerate", session.user.id);
  if (blocked) return blocked;

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  const bible = {
    childName: child.name,
    dateOfBirth: child.dateOfBirth.toISOString(),
    gender: child.gender,
    hairColor: child.hairColor || undefined,
    hairStyle: child.hairStyle || undefined,
    eyeColor: child.eyeColor || undefined,
    skinColor: child.skinColor || undefined,
    wearsGlasses: child.wearsGlasses,
    hasFreckles: child.hasFreckles,
    interests: child.interests,
    mainCharacterType: child.mainCharacterType,
    mainCharacterDescription: child.mainCharacterDescription || undefined,
  };

  const charDescription = buildCharacterDescription(bible);
  const style = buildIllustrationStyle(bible);

  const prompt = `${charDescription}, standing in a sunny meadow with flowers, smiling and waving, full body portrait, looking at the viewer. ${style}`;

  // Prompt contains the child's appearance + name. Only print in dev.
  if (process.env.NODE_ENV === "development") {
    console.log("[preview] Prompt:", prompt);
  }

  try {
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input: {
        prompt,
        image_size: "square",
        num_images: 1,
        seed: Math.floor(Math.random() * 9_999_999),
        safety_tolerance: "2",
        enable_safety_checker: true,
      },
    });

    const images = (result as { data?: { images?: { url: string }[] } }).data?.images;
    const imageUrl = images?.[0]?.url ?? null;

    return NextResponse.json({
      imageUrl,
      characterPrompt: charDescription,
    });
  } catch (err) {
    console.error("Preview generation error:", err);
    return NextResponse.json(
      { error: "Preview genereren mislukt" },
      { status: 500 }
    );
  }
}

// PATCH: approve the preview (save prompt + image)
export async function PATCH(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const gate = await loadUserGate(session.user.id);
  if (!gate?.isApproved) {
    return NextResponse.json(
      { error: "Je account moet eerst goedgekeurd worden" },
      { status: 403 }
    );
  }

  const { childId } = await params;
  const body = await request.json();
  const { characterPrompt, imageUrl } = body as {
    characterPrompt: string;
    imageUrl: string | null;
  };

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  // If the approved image came from fal.ai (temporary URL), copy it to
  // our own storage so the approved preview stays accessible long-term.
  // If it's already one of our URLs (e.g. re-approval), leave it alone.
  let persistedUrl: string | null = imageUrl ?? null;
  if (imageUrl && !isOwnStorageUrl(imageUrl)) {
    try {
      persistedUrl = await uploadFromUrl(imageUrl, approvedPreviewKey(childId));
    } catch (err) {
      console.error("[preview] Opslaan approved preview mislukt:", err);
      return NextResponse.json(
        { error: "Preview kon niet worden opgeslagen. Probeer opnieuw." },
        { status: 500 }
      );
    }
  }

  const updated = await prisma.childProfile.update({
    where: { id: childId },
    data: {
      approvedCharacterPrompt: characterPrompt,
      approvedPreviewUrl: persistedUrl,
    },
  });

  return NextResponse.json(updated);
}
