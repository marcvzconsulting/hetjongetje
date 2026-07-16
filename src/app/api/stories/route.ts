import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateStory,
  type CharacterBible,
  type StoryRequest,
} from "@/lib/ai/story-generator";
import { generateIllustrations } from "@/lib/ai/illustration-generator";
import { computeStoryAiCostCents } from "@/lib/ai/pricing";
import { parseJsonBody, createStorySchema } from "@/lib/validation";
import {
  uploadFromUrl,
  storyPageKey,
  storyEndingKey,
} from "@/lib/storage/scaleway";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";
import { maybeAlertFalBalanceExhausted } from "@/lib/ai/fal-balance";
import { reserveStoryCredit, refundStoryCredit } from "@/lib/user-gate";
import { sendMail } from "@/lib/email/client";
import { buildFirstStoryMail } from "@/lib/email/templates/first-story";
import { buildAdminStoryIncompleteMail } from "@/lib/email/templates/admin-story-incomplete";
import { buildAppUrl } from "@/lib/url";
import { getAdminNotifyEmails } from "@/lib/admin/notify";

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

  const parsed = await parseJsonBody(request, createStorySchema);
  if (parsed instanceof NextResponse) return parsed;
  const childId = parsed.childId;
  const characterBible = parsed.characterBible as CharacterBible;
  const storyRequest = parsed.storyRequest as StoryRequest;
  // Sequel-context wordt uitsluitend server-side opgebouwd (hieronder,
  // uit het geverifieerde vorige verhaal). Een client die zelf `sequel`
  // in de storyRequest stopt, wordt genegeerd.
  delete storyRequest.sequel;
  delete storyRequest.sequelOfStoryId;

  let creditReserved = false;
  try {

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, userId: session.user.id },
    });
    if (!child) {
      return NextResponse.json(
        { error: "Kindprofiel niet gevonden" },
        { status: 404 }
      );
    }

    // Vervolg-verhaal: haal het vorige verhaal op en verifieer dat het
    // bij dit kind hoort (het kind is hierboven al aan de ingelogde user
    // gekoppeld). De volledige tekst gaat als context mee naar de
    // generator; sequel + sequelOfStoryId persisteren in generationParams
    // zodat een regenerate hetzelfde vervolg blijft.
    if (parsed.sequelOfStoryId) {
      const prevStory = await prisma.story.findFirst({
        where: { id: parsed.sequelOfStoryId, childProfileId: childId },
        include: { pages: { orderBy: { pageNumber: "asc" } } },
      });
      if (prevStory) {
        storyRequest.sequel = {
          title: prevStory.title,
          text: prevStory.pages
            .map((p) => p.text)
            .filter(Boolean)
            .join("\n\n"),
        };
        storyRequest.sequelOfStoryId = prevStory.id;
      }
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
        await maybeAlertFalBalanceExhausted(err, "verhaal-illustraties");
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

    // Detecteer of er pagina's zonder illustratie zijn. fal.ai-fails na
    // de retry in generateIllustrations OF R2-upload-fails resulteren
    // beide in null. We tellen alleen de eerste 6 verhaal-pagina's mee,
    // niet de ending — een missende ending laten we niet de status op
    // partial zetten omdat het verhaal wel leesbaar is.
    const failedPageNumbers: number[] = [];
    pageUrls.forEach((url, i) => {
      if (url === null) failedPageNumbers.push(i + 1);
    });
    const isPartial = failedPageNumbers.length > 0;

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

    // AI-kosten optellen op basis van usage-info die de generators
    // hebben meegegeven. Als één van beide ontbreekt (bv. tekst-call
    // mislukt en we hebben fallback content), valt aiCostCents terug
    // op null en gebruikt het dashboard de schatting.
    const aiCostCents =
      generatedStory.textUsage && generatedStory.imageUsage
        ? computeStoryAiCostCents(
            generatedStory.textUsage,
            generatedStory.imageUsage,
          )
        : null;

    const story = await prisma.story.create({
      data: {
        id: storyId,
        childProfileId: childId,
        title: generatedStory.title,
        subtitle: generatedStory.tag,
        language: "nl",
        setting: storyRequest.setting,
        status: isPartial ? "partial" : "ready",
        // storyRequest is een plain object met alleen string-waarden, dus
        // veilig als-is naar Prisma's Json-veld te schrijven. De
        // eerdere JSON.parse(JSON.stringify(...))-omleiding was bedoeld
        // tegen niet-serialiseerbare velden, maar maskeerde liever
        // datacorruptie dan dat 't beschermde.
        generationParams: storyRequest as unknown as Prisma.InputJsonValue,
        aiCostCents,
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

    // Partial-flow: credit teruggeven + admin waarschuwen. Best-effort
    // — een mislukte mail mag de response niet blokkeren.
    if (isPartial) {
      try {
        await refundStoryCredit(session.user.id);
      } catch (refundErr) {
        console.error("[stories] partial-refund failed:", refundErr);
      }
      (async () => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true },
          });
          const reviewUrl = await buildAppUrl(`/admin/users/${session.user.id}`);
          const mail = buildAdminStoryIncompleteMail({
            storyId: story.id,
            storyTitle: story.title,
            childName: child.name,
            userEmail: user?.email ?? session.user.id,
            failedPages: failedPageNumbers,
            totalPages: generatedStory.pages.length,
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
                `[stories] partial admin mail to ${to} failed`,
                perAddressErr instanceof Error ? perAddressErr.message : perAddressErr,
              );
            }
          }
        } catch (err) {
          console.error("[stories] partial admin mail build failed", err);
        }
      })();
    }

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
    //
    // Belt-and-braces: also verify this is genuinely the user's first story.
    // The flag was added later, so accounts that pre-date it have it null
    // even though they already have many stories. Without this guard those
    // users would receive the "first story" mail on their next generation.
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

        const storyCount = await prisma.story.count({
          where: { childProfile: { userId: session.user.id } },
        });
        if (storyCount > 1) {
          // Pre-existing user — backfill the flag so we never re-check.
          await prisma.user.update({
            where: { id: session.user.id },
            data: { firstStoryEmailSentAt: new Date() },
          });
          return;
        }

        const storyUrl = await buildAppUrl(`/story/${story.id}`);
        const mail = await buildFirstStoryMail({
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
