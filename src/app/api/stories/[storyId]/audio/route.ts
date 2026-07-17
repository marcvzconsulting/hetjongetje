import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isTtsVoiceKey } from "@/lib/ai/tts-voices";
import {
  buildPageNarration,
  generateSpeechWithTimings,
  isTtsQuotaError,
} from "@/lib/ai/tts";
import { uploadBuffer, storyAudioPageKey } from "@/lib/storage/scaleway";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";

interface Props {
  params: Promise<{ storyId: string }>;
}

// Eén pagina (± 50-150 woorden) is voor ElevenLabs een kwestie van
// seconden, plus upload naar Scaleway. Ruim nemen voor tragere dagen.
export const maxDuration = 60;

/**
 * POST /api/stories/[storyId]/audio — genereer (of geef uit cache) de
 * voorlees-audio voor één stem en één pagina. Body: { voiceKey,
 * pageNumber }. Idempotent per (verhaal, stem, pagina): bestaat er al een
 * StoryAudio-rij, dan geven we die terug zonder kosten.
 *
 * De ingesproken tekst is bewust ALLEEN de paginatekst, zonder de
 * verhaaltitel — ook voor de eerste pagina. Zo mappen de meegeleverde
 * wordTimings 1-op-1 op de woorden die de viewer toont.
 */
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { storyId } = await params;

  let voiceKey: unknown;
  let pageNumber: unknown;
  try {
    const body = (await request.json()) as {
      voiceKey?: unknown;
      pageNumber?: unknown;
    };
    voiceKey = body?.voiceKey;
    pageNumber = body?.pageNumber;
  } catch {
    // Geen/kapotte JSON-body — valt hieronder in de 400.
  }
  if (!isTtsVoiceKey(voiceKey)) {
    return NextResponse.json({ error: "Onbekende stem" }, { status: 400 });
  }
  if (typeof pageNumber !== "number" || !Number.isInteger(pageNumber)) {
    return NextResponse.json(
      { error: "Ongeldig paginanummer" },
      { status: 400 },
    );
  }

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
    select: {
      id: true,
      title: true,
      status: true,
      pages: {
        orderBy: { pageNumber: "asc" },
        select: { pageNumber: true, text: true },
      },
    },
  });
  if (!story) {
    return NextResponse.json({ error: "Verhaal niet gevonden" }, { status: 404 });
  }
  if (story.status !== "ready" && story.status !== "partial") {
    return NextResponse.json(
      { error: "Dit verhaal is nog niet klaar om voorgelezen te worden." },
      { status: 409 },
    );
  }

  // De pagina moet bestaan én voorleesbare tekst hebben (de eindpagina
  // heeft lege tekst en krijgt dus nooit audio).
  const page = story.pages.find(
    (p) => p.pageNumber === pageNumber && p.text.trim().length > 0,
  );
  if (!page) {
    return NextResponse.json(
      { error: "Deze pagina heeft geen tekst om voor te lezen." },
      { status: 422 },
    );
  }

  // Cache-hit: al eens gegenereerd voor deze stem + pagina → gratis
  // teruggeven, inclusief de opgeslagen woordtimings.
  const existing = await prisma.storyAudio.findUnique({
    where: {
      storyId_voiceKey_pageNumber: { storyId, voiceKey, pageNumber },
    },
    select: { url: true, wordTimings: true },
  });
  if (existing) {
    return NextResponse.json({
      url: existing.url,
      voiceKey,
      pageNumber,
      wordTimings: existing.wordTimings ?? null,
      cached: true,
    });
  }

  // Rate limit pas ná de cache-check: cache-hits zijn gratis en mogen
  // nooit door de limiet geblokkeerd worden.
  const blocked = await enforceRateLimit("storyAudio", session.user.id);
  if (blocked) return blocked;

  const text = buildPageNarration(page.text);

  try {
    const { audio, wordTimings } = await generateSpeechWithTimings(
      text,
      voiceKey,
    );
    const url = await uploadBuffer(
      audio,
      storyAudioPageKey(storyId, voiceKey, pageNumber),
      "audio/mpeg",
    );

    // Race met een tweede tab/dubbelklik: de @@unique([storyId, voiceKey,
    // pageNumber]) vangt de tweede insert — dan is de al-bestaande rij
    // net zo goed.
    try {
      await prisma.storyAudio.create({
        data: {
          storyId,
          voiceKey,
          pageNumber,
          url,
          chars: text.length,
          ...(wordTimings ? { wordTimings } : {}),
        },
      });
    } catch {
      const winner = await prisma.storyAudio.findUnique({
        where: {
          storyId_voiceKey_pageNumber: { storyId, voiceKey, pageNumber },
        },
        select: { url: true, wordTimings: true },
      });
      if (winner) {
        return NextResponse.json({
          url: winner.url,
          voiceKey,
          pageNumber,
          wordTimings: winner.wordTimings ?? null,
        });
      }
      throw new Error("StoryAudio-rij opslaan mislukt");
    }

    return NextResponse.json({ url, voiceKey, pageNumber, wordTimings });
  } catch (err) {
    if (isTtsQuotaError(err)) {
      console.error(
        `[tts] ElevenLabs quota/abonnement-fout voor story ${storyId} (stem ${voiceKey}, pagina ${pageNumber}):`,
        err,
      );
      return NextResponse.json(
        {
          error:
            "Het voorlezen is tijdelijk niet beschikbaar. Probeer het later nog eens.",
        },
        { status: 503 },
      );
    }
    console.error(
      `[tts] Audio genereren mislukt voor story ${storyId} (stem ${voiceKey}, pagina ${pageNumber}):`,
      err,
    );
    return NextResponse.json(
      { error: "Audio genereren mislukt, probeer het zo opnieuw." },
      { status: 500 },
    );
  }
}
