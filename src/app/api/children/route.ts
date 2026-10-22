import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeChildName, normalizeNamesIn } from "@/lib/utils/name";
import { childProfileCreateSchema, parseJsonBody } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const children = await prisma.childProfile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(children);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, childProfileCreateSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const child = await prisma.childProfile.create({
      data: {
        userId: session.user.id,
        name: normalizeChildName(parsed.name),
        dateOfBirth: new Date(parsed.dateOfBirth),
        gender: parsed.gender,
        interests: parsed.interests ?? [],
        pets:
          (normalizeNamesIn(parsed.pets) as Prisma.InputJsonValue | undefined) ??
          (parsed.pets as Prisma.InputJsonValue | undefined),
        friends:
          (normalizeNamesIn(parsed.friends) as Prisma.InputJsonValue | undefined) ??
          (parsed.friends as Prisma.InputJsonValue | undefined),
        favoriteThings: parsed.favoriteThings as Prisma.InputJsonValue | undefined,
        fears: parsed.fears ?? [],
        mainCharacterType: parsed.mainCharacterType,
        mainCharacterDescription: parsed.mainCharacterDescription ?? null,
        hairColor: parsed.hairColor ?? null,
        hairStyle: parsed.hairStyle ?? null,
        eyeColor: parsed.eyeColor ?? null,
        skinColor: parsed.skinColor ?? null,
        wearsGlasses: parsed.wearsGlasses ?? false,
        hasFreckles: parsed.hasFreckles ?? false,
        characterBible: undefined,
        referenceImages: [],
      },
    });

    return NextResponse.json(child, { status: 201 });
  } catch (error) {
    console.error("Create child error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het aanmaken van het profiel" },
      { status: 500 }
    );
  }
}
