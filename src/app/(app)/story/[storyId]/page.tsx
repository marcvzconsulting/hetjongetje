import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { StoryReader } from "@/components/story/story-reader";

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

  return (
    <StoryReader
      storyId={story.id}
      title={story.title}
      subtitle={story.subtitle}
      childName={story.childProfile.name}
      childId={story.childProfile.id}
      isFavorite={story.isFavorite}
      pages={story.pages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        illustrationUrl: p.illustrationUrl,
        illustrationDescription: p.illustrationDescription,
      }))}
    />
  );
}
