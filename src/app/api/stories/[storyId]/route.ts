import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ storyId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { storyId } = await params;
  const body = await request.json();

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
  });

  if (!story) {
    return NextResponse.json({ error: "Verhaal niet gevonden" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.isFavorite !== undefined) updates.isFavorite = body.isFavorite;

  // Feedback may arrive on its own ({feedbackKind: "up"|"down"|null,
  // feedbackNote?: string}). Accept either field independently so the
  // UI can update them together or just the note. `null` means clear.
  if (body.feedbackKind !== undefined) {
    const k = body.feedbackKind;
    updates.feedbackKind =
      k === "up" || k === "down" ? k : k === null ? null : undefined;
    updates.feedbackAt = updates.feedbackKind !== null ? new Date() : null;
  }
  if (body.feedbackNote !== undefined) {
    const n = typeof body.feedbackNote === "string" ? body.feedbackNote.slice(0, 1000) : null;
    updates.feedbackNote = n;
  }

  const updated = await prisma.story.update({
    where: { id: storyId },
    data: updates,
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

  await prisma.story.delete({ where: { id: storyId } });

  return NextResponse.json({ success: true });
}
