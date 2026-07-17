import { cache } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { storyToSpreads } from "@/lib/story/storyToSpreads";
import type { WordTiming } from "@/lib/ai/tts";
import { PublicStoryReader } from "./client";

interface Props {
  params: Promise<{ token: string }>;
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,32}$/;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

// Wrapped in React.cache so generateMetadata and the page body share one
// DB round-trip per request instead of loading the full story (pages +
// audio + timings) twice.
const loadSharedStory = cache(async (token: string) => {
  if (!TOKEN_PATTERN.test(token)) return null;
  return prisma.story.findFirst({
    where: { shareToken: token, status: "ready" },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      childProfile: { select: { name: true } },
      audio: {
        select: {
          voiceKey: true,
          url: true,
          pageNumber: true,
          wordTimings: true,
        },
      },
    },
  });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const story = await loadSharedStory(token);
  if (!story) {
    return {
      title: "Verhaal niet gevonden — Ons Verhaaltje",
      robots: { index: false, follow: false },
    };
  }
  const childName = story.childProfile.name;
  const title = `${story.title} — een verhaal voor ${childName}`;
  const description = `Een gepersonaliseerd voorleesverhaal gemaakt voor ${childName}, gedeeld via Ons Verhaaltje.`;
  return {
    title,
    description,
    // Public-but-not-discoverable: parents share with family directly.
    // We don't want Google indexeren van persoonlijke verhalen.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Ons Verhaaltje",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedStoryPage({ params }: Props) {
  const { token } = await params;

  // Rate-limit per IP: 60 requests / minuut. Genoeg voor normale lees-sessies
  // (images zijn server-cached), strak genoeg om brute-forcing van tokens
  // te ontmoedigen.
  const ip = await getClientIp();
  const rl = await rateLimit({
    key: `share-view:${ip}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    // We laten dit als 404 ogen — anders geeft 429 een attacker info dat
    // ze in de buurt zijn.
    notFound();
  }

  const story = await loadSharedStory(token);
  if (!story) notFound();

  const spreads = storyToSpreads({
    title: story.title,
    subtitle: story.subtitle,
    setting: story.setting,
    childName: story.childProfile.name,
    createdAt: story.createdAt,
    pages: story.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text,
      illustrationUrl: p.illustrationUrl,
      illustrationDescription: p.illustrationDescription,
      illustrationPrompt: p.illustrationPrompt,
    })),
  });

  return (
    <PublicStoryReader
      storyId={story.id}
      childName={story.childProfile.name}
      storyTitle={story.title}
      spreads={spreads}
      audios={story.audio.map((a) => ({
        voiceKey: a.voiceKey,
        pageNumber: a.pageNumber,
        url: a.url,
        wordTimings: (a.wordTimings as unknown as WordTiming[] | null) ?? null,
      }))}
    />
  );
}
