import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  childProfileUpdateSchema,
  parseJsonBody,
} from "@/lib/validation";

interface Props {
  params: Promise<{ childId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, childProfileUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  // Bouw alleen de velden die expliciet meegegeven zijn — Prisma slaat
  // 'undefined' over, dus partial-update werkt vanzelf.
  const data: Prisma.ChildProfileUpdateInput = {
    name: parsed.name,
    dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : undefined,
    gender: parsed.gender,
    interests: parsed.interests,
    pets: parsed.pets as Prisma.InputJsonValue | undefined,
    friends: parsed.friends as Prisma.InputJsonValue | undefined,
    favoriteThings: parsed.favoriteThings as Prisma.InputJsonValue | undefined,
    fears: parsed.fears,
    hairColor: parsed.hairColor,
    hairStyle: parsed.hairStyle,
    eyeColor: parsed.eyeColor,
    skinColor: parsed.skinColor,
    wearsGlasses: parsed.wearsGlasses,
    hasFreckles: parsed.hasFreckles,
    mainCharacterType: parsed.mainCharacterType,
    mainCharacterDescription: parsed.mainCharacterDescription,
  };

  const updated = await prisma.childProfile.update({
    where: { id: childId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  await prisma.childProfile.delete({ where: { id: childId } });

  return NextResponse.json({ success: true });
}
