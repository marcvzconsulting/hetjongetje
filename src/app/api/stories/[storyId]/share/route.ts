import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ storyId: string }>;
}

/** ~22 base64url chars → ~132 bits entropy. Unguessable in practice. */
function newShareToken(): string {
  return randomBytes(16).toString("base64url");
}

export async function POST(_request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { storyId } = await params;

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
    select: { id: true, shareToken: true },
  });
  if (!story) {
    return NextResponse.json({ error: "Verhaal niet gevonden" }, { status: 404 });
  }

  // Idempotent: bestaande token wordt gewoon terug gegeven.
  const token = story.shareToken ?? newShareToken();
  if (!story.shareToken) {
    await prisma.story.update({
      where: { id: storyId },
      data: { shareToken: token },
    });
  }

  return NextResponse.json({ shareToken: token });
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { storyId } = await params;

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
    select: { id: true },
  });
  if (!story) {
    return NextResponse.json({ error: "Verhaal niet gevonden" }, { status: 404 });
  }

  await prisma.story.update({
    where: { id: storyId },
    data: { shareToken: null },
  });

  return NextResponse.json({ shareToken: null });
}
