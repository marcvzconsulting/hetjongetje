import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseJsonBody, updateStorySchema } from "@/lib/validation";
import { deleteStoryStorage } from "@/lib/storage/user-cleanup";

interface Props {
  params: Promise<{ storyId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, updateStorySchema);
  if (parsed instanceof NextResponse) return parsed;

  const { storyId } = await params;

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
  });

  if (!story) {
    return NextResponse.json({ error: "Verhaal niet gevonden" }, { status: 404 });
  }

  // Feedback-update mag los of samen met de note komen. `null` =
  // expliciet wissen; `undefined` = niet aanraken.
  const data: Prisma.StoryUpdateInput = {
    title: parsed.title,
    isFavorite: parsed.isFavorite,
    ...(parsed.feedbackKind !== undefined && {
      feedbackKind: parsed.feedbackKind,
      feedbackAt: parsed.feedbackKind === null ? null : new Date(),
    }),
    ...(parsed.feedbackNote !== undefined && {
      feedbackNote: parsed.feedbackNote,
    }),
  };

  const updated = await prisma.story.update({
    where: { id: storyId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { storyId } = await params;

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
  });

  if (!story) {
    return NextResponse.json({ error: "Verhaal niet gevonden" }, { status: 404 });
  }

  // Delete every bucket object for this story (page illustrations, ending
  // image, read-aloud audio) BEFORE the row — the DB is the only place the
  // URLs live, so afterwards they'd be unreachable and leak on public URLs.
  const cleanup = await deleteStoryStorage(storyId);
  if (cleanup.failed.length > 0) {
    console.error(
      `[stories] ${cleanup.failed.length} storage targets failed to delete for story ${storyId}:`,
      cleanup.failed
    );
  }

  await prisma.story.delete({ where: { id: storyId } });

  return NextResponse.json({ success: true });
}
