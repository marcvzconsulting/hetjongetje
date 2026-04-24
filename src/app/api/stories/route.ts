import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
import { reserveStoryCredit, refundStoryCredit } from "@/lib/user-gate";
import { sendMail } from "@/lib/email/client";
import { buildFirstStoryMail } from "@/lib/email/templates/first-story";
import { buildAppUrl } from "@/lib/url";

// Allow extra time: story gen + illustrations + uploads
export const maxDuration = 120;

/**
 * Upload a fal.ai (or any) image URL to our Scaleway bucket.
 * Returns the Scaleway URL, or null on failure (so a story can still save
 * with missing illustrations instead of crashing).
 */
async function persistImage(
  sourceUrl: string | null | undefined,
  key: string
): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    return await uploadFromUrl(sourceUrl, key);
  } catch (err) {
    console.error(`[storage] Upload mislukt voor ${key}:`, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Rate limit BEFORE any AI calls — these cost real money per request
  const blocked = await enforceRateLimit("storyCreate", session.user.id);
  if (blocked) return blocked;

  let creditReserved = false;
  try {
    const body = await request.json();
    const { childId, characterBible, storyRequest } = body as {
      childId: string;
      characterBible: CharacterBible;
      storyRequest: StoryRequest;
    };

    if (!childId || !characterBible || !storyRequest) {
      return NextResponse.json(
        { error: "childId, characterBible en storyRequest zijn verplicht" },
        { status: 400 }
      );
    }

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, userId: session.user.id },
    });
    if (!child) {
      return NextResponse.json(
        { error: "Kindprofiel niet gevonden" },
        { status: 404 }
      );
    }

    // Reserve one story credit atomically. Admins bypass. New accounts with
    // status=pending or credits=0 get blocked before any paid AI call runs.
    const reserved = await reserveStoryCredit(session.user.id);
    if (!reserved.ok) {
      if (reserved.reason === "not_approved") {
        return NextResponse.json(
          {
            error:
              "Je account is nog niet goedgekeurd. Wacht even of neem contact op.",
          },
          { status: 403 }
        );
      }
      if (reserved.reason === "no_credits") {
        return NextResponse.json(
          {
            error:
              "Je hebt geen verhalen meer over. Neem contact op om je tegoed bij te vullen.",
          },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: "Account niet gevonden" },
        { status: 401 }
      );
    }
    creditReserved = true;

    // Pre-generate a storyId so we can use it for both the DB row and
    // the storage keys, keeping illustrations grouped per story in the bucket.
    const storyId = randomUUID();

    // 1. Generate story in Dutch
    let generatedStory = await generateStory(characterBible, storyRequest);

    // 2. Generate illustrations with fal.ai (if key is set)
    if (process.env.FAL_KEY) {
      try {
        generatedStory = await generateIllustrations(generatedStory, characterBible);
      } catch (err) {
        console.error("[generate] Illustraties mislukt (verhaal gaat door):", err);
      }
    } else {
      console.warn("[generate] FAL_KEY niet ingesteld — geen illustraties");
    }

    // 3. Persist fal.ai URLs to our own storage (in parallel).
    //    fal.ai URLs are temporary — without this step illustrations vanish.
    const pageUploads = generatedStory.pages.map((page, index) =>
      persistImage(page.imageUrl, storyPageKey(storyId, index + 1))
    );
    const endingUpload = persistImage(
      generatedStory.endingImageUrl,
      storyEndingKey(storyId)
    );

    const [pageUrls, endingUrl] = await Promise.all([
      Promise.all(pageUploads),
      endingUpload,
    ]);

    // 4. Save to database
    const allPages = [
      ...generatedStory.pages.map((page, index) => ({
        pageNumber: index + 1,
        text: page.text,
        illustrationUrl: pageUrls[index],
        illustrationPrompt: page.illustrationPrompt,
        illustrationDescription: page.illustrationPrompt,
      })),
      // Ending illustration as a separate page
      {
        pageNumber: generatedStory.pages.length + 1,
        text: "",
        illustrationUrl: endingUrl,
        illustrationPrompt: generatedStory.endingIllustrationPrompt,
        illustrationDescription: generatedStory.endingIllustrationPrompt,
      },
    ];

    const story = await prisma.story.create({
      data: {
        id: storyId,
        childProfileId: childId,
        title: generatedStory.title,
        subtitle: generatedStory.tag,
        language: "nl",
        setting: storyRequest.setting,
        status: "ready",
        generationParams: JSON.parse(JSON.stringify(storyRequest)),
        pages: {
          create: allPages.map(({ pageNumber, text, illustrationUrl, illustrationPrompt, illustrationDescription }) => ({
            pageNumber,
            text,
            illustrationUrl,
            illustrationPrompt,
            illustrationDescription,
          })),
        },
      },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    // 5. Update character bible
    if (generatedStory.characterBibleUpdate) {
      const currentBible = (child.characterBible as Record<string, unknown>) || {};
      const previousAdventures = (currentBible.previousAdventures as Array<Record<string, string>>) || [];
      previousAdventures.push({
        title: generatedStory.title,
        setting: storyRequest.setting,
        summary: generatedStory.characterBibleUpdate,
      });
      await prisma.childProfile.update({
        where: { id: childId },
        data: {
          characterBible: { ...currentBible, previousAdventures },
        },
      });
    }

    // 6. First-story celebration mail — only once per user, idempotent via
    // `firstStoryEmailSentAt`. Best-effort: never block the response.
    (async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            email: true,
            name: true,
            firstStoryEmailSentAt: true,
          },
        });
        if (!user || user.firstStoryEmailSentAt) return;

        const storyUrl = await buildAppUrl(`/story/${story.id}`);
        const mail = buildFirstStoryMail({
          userName: user.name,
          childName: child.name,
          storyTitle: story.title,
          storyUrl,
        });
        await sendMail({
          to: user.email,
          toName: user.name,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          tags: ["first-story"],
        });
        await prisma.user.update({
          where: { id: session.user.id },
          data: { firstStoryEmailSentAt: new Date() },
        });
      } catch (mailErr) {
        console.error("[first-story] mail send failed", mailErr);
      }
    })();

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Story generation error:", error);
    if (creditReserved) {
      await refundStoryCredit(session.user.id).catch((refundErr) => {
        console.error("[credits] refund failed:", refundErr);
      });
    }
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van het verhaal" },
      { status: 500 }
    );
  }
}
