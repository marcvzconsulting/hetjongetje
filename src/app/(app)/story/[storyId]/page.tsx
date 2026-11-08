import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { storyToSpreads } from "@/lib/story/storyToSpreads";
import { amsterdamMinutes } from "@/lib/reader/night";
import { loadReaderSettings } from "@/lib/reader/settings";
import {
  resolveOverflowMode,
  resolveReaderVersion,
} from "@/lib/reader/version";
import { StoryPageClient } from "./client";

interface Props {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ lezer?: string | string[]; tekst?: string | string[] }>;
}

export default async function StoryPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { storyId } = await params;
  const query = await searchParams;

  const story = await prisma.story.findFirst({
    where: {
      id: storyId,
      childProfile: { userId: session.user.id },
    },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      childProfile: { select: { name: true, id: true } },
    },
  });

  if (!story) notFound();

  const readerSettings = await loadReaderSettings();

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
      readerVersion={resolveReaderVersion(query.lezer)}
      overflowMode={resolveOverflowMode(query.tekst)}
      readerSettings={readerSettings}
      serverMinutes={amsterdamMinutes(new Date())}
    />
  );
}
