import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { storyToSpreads } from "@/lib/story/storyToSpreads";
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
    },
  });

  if (!story) notFound();

  const spreads = storyToSpreads({
    title: story.title,
    subtitle: story.subtitle,
    setting: story.setting,
    childName: story.childProfile.name,
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
    />
  );
}
