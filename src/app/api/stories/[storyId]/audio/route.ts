import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isTtsVoiceKey } from "@/lib/ai/tts-voices";
import {
  buildStoryNarration,
  generateSpeech,
  isTtsQuotaError,
} from "@/lib/ai/tts";
import { uploadBuffer, storyAudioKey } from "@/lib/storage/scaleway";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";

interface Props {
  params: Promise<{ storyId: string }>;
}

// ElevenLabs doet er voor een heel verhaal (± 3-6k tekens) makkelijk
// 15-30s over; plus upload naar Scaleway. Ruim nemen.
export const maxDuration = 60;

/**
 * POST /api/stories/[storyId]/audio — genereer (of geef uit cache) de
 * voorlees-audio voor één stem. Idempotent per (verhaal, stem): bestaat
 * er al een StoryAudio-rij, dan geven we die URL terug zonder kosten.
 */
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { storyId } = await params;

  let voiceKey: unknown;
  try {
    const body = (await request.json()) as { voiceKey?: unknown };
    voiceKey = body?.voiceKey;
  } catch {
    // Geen/kapotte JSON-body — valt hieronder in de 400.
  }
  if (!isTtsVoiceKey(voiceKey)) {
    return NextResponse.json({ error: "Onbekende stem" }, { status: 400 });
  }

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
    select: {
      id: true,
      title: true,
      status: true,
      childProfile: { select: { id: true } },
      pages: {
        orderBy: { pageNumber: "asc" },
        select: { text: true },
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

  // Cache-hit: al eens gegenereerd voor deze stem → gratis teruggeven.
  const existing = await prisma.storyAudio.findUnique({
    where: { storyId_voiceKey: { storyId, voiceKey } },
    select: { url: true },
  });
  if (existing) {
    return NextResponse.json({ url: existing.url, voiceKey, cached: true });
  }

  // Rate limit pas ná de cache-check: cache-hits zijn gratis en mogen
  // nooit door de limiet geblokkeerd worden.
  const blocked = await enforceRateLimit("storyAudio", session.user.id);
  if (blocked) return blocked;

  const text = buildStoryNarration(
    story.title,
    story.pages.map((p) => p.text),
  );
  if (!text) {
    return NextResponse.json(
      { error: "Dit verhaal heeft geen tekst om voor te lezen." },
      { status: 422 },
    );
  }

  try {
    const audioBuffer = await generateSpeech(text, voiceKey);
    const url = await uploadBuffer(
      audioBuffer,
      storyAudioKey(storyId, voiceKey),
      "audio/mpeg",
    );

    // Race met een tweede tab/dubbelklik: de @@unique([storyId, voiceKey])
    // vangt de tweede insert — dan is de al-bestaande rij net zo goed.
    try {
      await prisma.storyAudio.create({
        data: { storyId, voiceKey, url, chars: text.length },
      });
    } catch {
      const winner = await prisma.storyAudio.findUnique({
        where: { storyId_voiceKey: { storyId, voiceKey } },
        select: { url: true },
      });
      if (winner) {
        return NextResponse.json({ url: winner.url, voiceKey });
      }
      throw new Error("StoryAudio-rij opslaan mislukt");
    }

    return NextResponse.json({ url, voiceKey });
  } catch (err) {
    if (isTtsQuotaError(err)) {
      console.error(
        `[tts] ElevenLabs quota/abonnement-fout voor story ${storyId} (stem ${voiceKey}):`,
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
      `[tts] Audio genereren mislukt voor story ${storyId} (stem ${voiceKey}):`,
      err,
    );
    return NextResponse.json(
      { error: "Audio genereren mislukt — probeer het zo opnieuw." },
      { status: 500 },
    );
  }
}
