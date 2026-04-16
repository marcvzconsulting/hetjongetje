import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ childId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
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

  const body = await request.json();
  const {
    name,
    dateOfBirth,
    gender,
    interests,
    pets,
    friends,
    favoriteThings,
    fears,
    mainCharacterType,
    mainCharacterDescription,
    hairColor,
    hairStyle,
    eyeColor,
    skinColor,
    wearsGlasses,
    hasFreckles,
  } = body;

  const updated = await prisma.childProfile.update({
    where: { id: childId },
    data: {
      ...(name !== undefined && { name }),
      ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
      ...(gender !== undefined && { gender }),
      ...(interests !== undefined && { interests }),
      ...(pets !== undefined && { pets }),
      ...(friends !== undefined && { friends }),
      ...(favoriteThings !== undefined && { favoriteThings }),
      ...(fears !== undefined && { fears }),
      ...(hairColor !== undefined && { hairColor }),
      ...(hairStyle !== undefined && { hairStyle }),
      ...(eyeColor !== undefined && { eyeColor }),
      ...(skinColor !== undefined && { skinColor }),
      ...(wearsGlasses !== undefined && { wearsGlasses }),
      ...(hasFreckles !== undefined && { hasFreckles }),
      ...(mainCharacterType !== undefined && { mainCharacterType }),
      ...(mainCharacterDescription !== undefined && { mainCharacterDescription }),
    },
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
