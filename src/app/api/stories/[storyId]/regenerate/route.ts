import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateStory,
  type CharacterBible,
  type StoryRequest,
} from "@/lib/ai/story-generator";
import { generateIllustrations } from "@/lib/ai/illustration-generator";
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
  const child = story.childProfile;
  const characterBible = (child.characterBible ?? {}) as Record<string, unknown>;
  const bible: CharacterBible = {
    childName: child.name,
    dateOfBirth: child.dateOfBirth.toISOString(),
    gender: child.gender,
    hairColor: (characterBible.hairColor as string | undefined) ?? child.hairColor ?? undefined,
    hairStyle: (characterBible.hairStyle as string | undefined) ?? child.hairStyle ?? undefined,
    eyeColor: (characterBible.eyeColor as string | undefined) ?? child.eyeColor ?? undefined,
    skinColor: (characterBible.skinColor as string | undefined) ?? child.skinColor ?? undefined,
    wearsGlasses: child.wearsGlasses ?? undefined,
    hasFreckles: child.hasFreckles ?? undefined,
    interests: (characterBible.interests as string[] | undefined) ?? [],
    pets: characterBible.pets as CharacterBible["pets"],
    friends: characterBible.friends as CharacterBible["friends"],
    favoriteThings: characterBible.favoriteThings as CharacterBible["favoriteThings"],
    fears: characterBible.fears as string[] | undefined,
    mainCharacterType: child.mainCharacterType,
    mainCharacterDescription: child.mainCharacterDescription ?? undefined,
    approvedCharacterPrompt: child.approvedCharacterPrompt ?? undefined,
    previousAdventures: characterBible.previousAdventures as CharacterBible["previousAdventures"],
    loraUrl: child.loraUrl ?? undefined,
    loraTriggerWord: child.loraTriggerWord ?? undefined,
  };
  const storyRequest = story.generationParams as unknown as StoryRequest;

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
