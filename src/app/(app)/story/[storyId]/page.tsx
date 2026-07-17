import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { storyToSpreads } from "@/lib/story/storyToSpreads";
import type { WordTiming } from "@/lib/ai/tts";
import { isTtsPremiumOnly } from "@/lib/ai/tts-config";
import { hasActivePaidSubscription } from "@/lib/payments/subscriptions";
import { StoryPageClient } from "./client";

interface Props {
  params: Promise<{ storyId: string }>;
}

export default async function StoryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { storyId } = await params;

  const story = await prisma.story.findFirst({
    where: {
      id: storyId,
      childProfile: { userId: session.user.id },
    },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      childProfile: { select: { name: true, id: true } },
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

  if (!story) notFound();

  // TTS-premium-gate: nieuwe voorlees-audio genereren mag alleen door
  // de eigenaar, en (wanneer de schakelaar aan staat) alleen met een
  // actief betaald abonnement of als admin. Bestaande audio afspelen
  // blijft altijd werken — dat regelt de speler zelf.
  const canGenerateAudio =
    !isTtsPremiumOnly() ||
    session.user.role === "admin" ||
    (await hasActivePaidSubscription(session.user.id));

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
    <StoryPageClient
      storyId={story.id}
      childId={story.childProfile.id}
      childName={story.childProfile.name}
      storyTitle={story.title}
      spreads={spreads}
      isFavorite={story.isFavorite}
      regenerationCount={story.regenerationCount}
      regenerationLimit={1}
      initialFeedbackKind={story.feedbackKind as "up" | "down" | null}
      initialFeedbackNote={story.feedbackNote}
      initialShareToken={story.shareToken}
      canGenerateAudio={canGenerateAudio}
      initialAudios={story.audio.map((a) => ({
        voiceKey: a.voiceKey,
        pageNumber: a.pageNumber,
        url: a.url,
        wordTimings: (a.wordTimings as unknown as WordTiming[] | null) ?? null,
      }))}
    />
  );
}
