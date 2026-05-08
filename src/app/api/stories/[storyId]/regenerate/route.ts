import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateStory,
  type CharacterBible,
  type StoryRequest,
} from "@/lib/ai/story-generator";
import { generateIllustrations } from "@/lib/ai/illustration-generator";
import { computeStoryAiCostCents } from "@/lib/ai/pricing";
import {
  uploadFromUrl,
  storyPageKey,
  storyEndingKey,
} from "@/lib/storage/scaleway";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";

/**
 * Maximum number of free regenerations a parent can run on the same
 * story. Hardcoded for now — admin can flip via DB / a future setting
 * if behaviour shows we should be more or less generous. AI cost per
 * regen ≈ €0.15, so 1 still leaves healthy margin on a €1.95 single
 * credit and ~€1/story subscription rate.
 */
const MAX_REGENERATIONS_PER_STORY = 1;

export const maxDuration = 120;

async function persistImage(
  sourceUrl: string | null | undefined,
  key: string,
): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    return await uploadFromUrl(sourceUrl, key);
  } catch (err) {
    console.error(`[storage] Upload mislukt voor ${key}:`, err);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ storyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { storyId } = await context.params;

  // Same rate limit bucket as initial story creation — both run AI.
  const blocked = await enforceRateLimit("storyCreate", session.user.id);
  if (blocked) return blocked;

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      childProfile: true,
    },
  });
  if (!story) {
    return NextResponse.json({ error: "Verhaal niet gevonden" }, { status: 404 });
  }

  if (story.regenerationCount >= MAX_REGENERATIONS_PER_STORY) {
    return NextResponse.json(
      {
        error:
          "Je hebt dit verhaal al opnieuw gegenereerd. Genereer een nieuw verhaal als je iets anders wilt.",
        code: "regen_limit_reached",
      },
      { status: 403 },
    );
  }
  if (!story.generationParams) {
    return NextResponse.json(
      { error: "Origineel verzoek niet teruggevonden — kan niet opnieuw genereren." },
      { status: 422 },
    );
  }

  // Rebuild the character-bible from the current child profile so the
  // regen reflects any profile edits since the original generation.
  // Most fields live as direct columns on ChildProfile; only
  // `previousAdventures` accumulates inside the JSON `characterBible`
  // field. Reading from the wrong place silently produces empty
  // interests/pets/friends and turns the prompt into a generic blank.
  const child = story.childProfile;
  const characterBibleJson = (child.characterBible ?? {}) as Record<string, unknown>;
  const bible: CharacterBible = {
    childName: child.name,
    dateOfBirth: child.dateOfBirth.toISOString(),
    gender: child.gender,
    hairColor: child.hairColor ?? undefined,
    hairStyle: child.hairStyle ?? undefined,
    eyeColor: child.eyeColor ?? undefined,
    skinColor: child.skinColor ?? undefined,
    wearsGlasses: child.wearsGlasses,
    hasFreckles: child.hasFreckles,
    interests: child.interests ?? [],
    pets: (child.pets ?? undefined) as CharacterBible["pets"],
    friends: (child.friends ?? undefined) as CharacterBible["friends"],
    favoriteThings: (child.favoriteThings ?? undefined) as CharacterBible["favoriteThings"],
    fears: child.fears ?? undefined,
    mainCharacterType: child.mainCharacterType,
    mainCharacterDescription: child.mainCharacterDescription ?? undefined,
    approvedCharacterPrompt: child.approvedCharacterPrompt ?? undefined,
    previousAdventures: characterBibleJson.previousAdventures as CharacterBible["previousAdventures"],
    loraUrl: child.loraUrl ?? undefined,
    loraTriggerWord: child.loraTriggerWord ?? undefined,
  };
  const baseRequest = story.generationParams as unknown as StoryRequest;

  // Optional parent guidance for THIS regeneration. Body may be empty
  // (e.g. preflight); read JSON defensively.
  let regenerationFeedback: string | undefined;
  try {
    const body = (await request.json()) as { feedback?: unknown };
    if (typeof body?.feedback === "string") {
      regenerationFeedback = body.feedback.trim().slice(0, 1000) || undefined;
    }
  } catch {
    // No body / not JSON — fine, regen without extra feedback.
  }

  const storyRequest: StoryRequest = {
    ...baseRequest,
    regenerationFeedback,
  };

  try {
    let generated = await generateStory(bible, storyRequest);

    if (process.env.FAL_KEY) {
      try {
        generated = await generateIllustrations(generated, bible);
      } catch (err) {
        console.error("[regen] Illustraties mislukt (verhaal gaat door):", err);
      }
    }

    // Upload new illustrations under fresh keys so we never collide with
    // the about-to-be-deleted page rows. Suffix with the new regen
    // count so each regenerate has its own folder of assets.
    const newCount = story.regenerationCount + 1;
    const pageUploads = generated.pages.map((page, i) =>
      persistImage(
        page.imageUrl,
        `${storyPageKey(storyId, i + 1)}.r${newCount}`,
      ),
    );
    const endingUpload = persistImage(
      generated.endingImageUrl,
      `${storyEndingKey(storyId)}.r${newCount}`,
    );
    const [pageUrls, endingUrl] = await Promise.all([
      Promise.all(pageUploads),
      endingUpload,
    ]);

    const newPages = [
      ...generated.pages.map((page, i) => ({
        pageNumber: i + 1,
        text: page.text,
        illustrationUrl: pageUrls[i],
        illustrationPrompt: page.illustrationPrompt,
        illustrationDescription: page.illustrationPrompt,
      })),
      {
        pageNumber: generated.pages.length + 1,
        text: "",
        illustrationUrl: endingUrl,
        illustrationPrompt: generated.endingIllustrationPrompt,
        illustrationDescription: generated.endingIllustrationPrompt,
      },
    ];

    // AI-kosten van de regen optellen bij wat we al hadden — een
    // regenerate kost de generatie van een nieuw verhaal bovenop het
    // origineel. Bij ontbrekende usage-info (bv. tekst-generatie ging
    // mis) tellen we niets bij; dan blijft het oude bedrag staan.
    const regenCostCents =
      generated.textUsage && generated.imageUsage
        ? computeStoryAiCostCents(generated.textUsage, generated.imageUsage)
        : 0;
    const newAiCostCents =
      regenCostCents > 0
        ? (story.aiCostCents ?? 0) + regenCostCents
        : story.aiCostCents;

    // Replace pages atomically — wipe the old set, insert the new one,
    // bump counter + title in case Claude renamed the story.
    await prisma.$transaction([
      prisma.storyPage.deleteMany({ where: { storyId } }),
      prisma.story.update({
        where: { id: storyId },
        data: {
          title: generated.title,
          subtitle: generated.tag,
          regenerationCount: newCount,
          aiCostCents: newAiCostCents,
          // Wipe any earlier feedback — the parent is reacting to the
          // OLD version; we want a fresh judgment on the new one.
          feedbackKind: null,
          feedbackNote: null,
          feedbackAt: null,
          pages: { create: newPages },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, storyId });
  } catch (err) {
    console.error(`[regen] failed for story ${storyId}`, err);
    return NextResponse.json(
      { error: "Genereren mislukt — probeer het zo opnieuw." },
      { status: 500 },
    );
  }
}
