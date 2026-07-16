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
import { sendMail } from "@/lib/email/client";
import { buildAdminStoryIncompleteMail } from "@/lib/email/templates/admin-story-incomplete";
import { buildAppUrl } from "@/lib/url";
import { getAdminNotifyEmails } from "@/lib/admin/notify";

/**
 * Maximum number of free regenerations a parent can run on the same
 * story. Hardcoded for now — admin can flip via DB / a future setting
 * if behaviour shows we should be more or less generous. AI cost per
 * regen ≈ €0.15, so 1 still leaves healthy margin on a €1.95 single
 * credit and ~€1/story subscription rate.
 */
const MAX_REGENERATIONS_PER_STORY = 1;

/**
 * Snelknoppen uit de "Niet helemaal goed?"-modal. Elke knop mapt naar
 * een vaste instructiezin; korter/langer schakelen daarnaast de
 * length-parameter om zodat het woordbudget in de prompt meebeweegt.
 */
const QUICK_ADJUSTMENTS = {
  shorter:
    "Maak deze versie duidelijk korter en compacter dan de vorige.",
  longer:
    "Maak deze versie langer en rijker dan de vorige, met meer detail en meer verhaal.",
  funnier:
    "Maak deze versie grappiger: meer humor, gekke momenten en grapjes die een kind snapt.",
  calmer:
    "Maak deze versie rustiger en zachter: minder spanning, meer een kalm slaapverhaaltje-gevoel.",
} as const;
type QuickAdjustment = keyof typeof QUICK_ADJUSTMENTS;

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
  let quickAdjustments: QuickAdjustment[] = [];
  try {
    const body = (await request.json()) as {
      feedback?: unknown;
      quickAdjustments?: unknown;
    };
    if (typeof body?.feedback === "string") {
      regenerationFeedback = body.feedback.trim().slice(0, 1000) || undefined;
    }
    if (Array.isArray(body?.quickAdjustments)) {
      quickAdjustments = body.quickAdjustments.filter(
        (a): a is QuickAdjustment =>
          typeof a === "string" && a in QUICK_ADJUSTMENTS,
      );
    }
  } catch {
    // No body / not JSON — fine, regen without extra feedback.
  }

  // Snelknoppen: korter/langer zetten óók de echte length-parameter om
  // (betrouwbaarder woordbudget dan alleen prompt-feedback); alle
  // knoppen voegen een instructiezin toe aan de regeneration-feedback.
  const lengthOverride = quickAdjustments.includes("longer")
    ? ("lang" as const)
    : quickAdjustments.includes("shorter")
      ? ("kort" as const)
      : undefined;
  const combinedFeedback =
    [
      ...quickAdjustments.map((a) => QUICK_ADJUSTMENTS[a]),
      regenerationFeedback,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 1200) || undefined;

  const storyRequest: StoryRequest = {
    ...baseRequest,
    ...(lengthOverride ? { length: lengthOverride } : {}),
    regenerationFeedback: combinedFeedback,
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

    // Detect partial generation (failed illustration on één of meer
    // verhaal-pagina's). De ending tellen we niet mee. Bij partial geven
    // we de regen niet door (status partial + admin-mail), maar credit
    // is hier sowieso al niet weer ingehouden — regenerate kost geen
    // extra storyCredit.
    const failedPageNumbers: number[] = [];
    pageUrls.forEach((url, i) => {
      if (url === null) failedPageNumbers.push(i + 1);
    });
    const isPartial = failedPageNumbers.length > 0;

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
          status: isPartial ? "partial" : "ready",
          // Wipe any earlier feedback — the parent is reacting to the
          // OLD version; we want a fresh judgment on the new one.
          feedbackKind: null,
          feedbackNote: null,
          feedbackAt: null,
          pages: { create: newPages },
        },
      }),
    ]);

    // Bij partial: admin-notificatie. We geven hier geen credit terug —
    // regenerate kost de gebruiker geen extra credit, dus er valt niets
    // terug te geven. Wel resetten we de regenerationCount-bump zodat de
    // parent het opnieuw mag proberen.
    if (isPartial) {
      try {
        await prisma.story.update({
          where: { id: storyId },
          data: { regenerationCount: story.regenerationCount },
        });
      } catch (resetErr) {
        console.error("[regen] partial regen-count reset failed:", resetErr);
      }
      (async () => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true },
          });
          const reviewUrl = await buildAppUrl(`/admin/users/${session.user.id}`);
          const mail = buildAdminStoryIncompleteMail({
            storyId,
            storyTitle: generated.title,
            childName: story.childProfile.name,
            userEmail: user?.email ?? session.user.id,
            failedPages: failedPageNumbers,
            totalPages: generated.pages.length,
            reviewUrl,
          });
          for (const to of getAdminNotifyEmails()) {
            try {
              await sendMail({
                to,
                subject: mail.subject,
                html: mail.html,
                text: mail.text,
                tags: ["admin-story-incomplete"],
              });
            } catch (perAddressErr) {
              console.error(
                `[regen] partial admin mail to ${to} failed`,
                perAddressErr instanceof Error ? perAddressErr.message : perAddressErr,
              );
            }
          }
        } catch (err) {
          console.error("[regen] partial admin mail build failed", err);
        }
      })();
    }

    return NextResponse.json({ ok: true, storyId, partial: isPartial });
  } catch (err) {
    console.error(`[regen] failed for story ${storyId}`, err);
    return NextResponse.json(
      { error: "Genereren mislukt — probeer het zo opnieuw." },
      { status: 500 },
    );
  }
}
