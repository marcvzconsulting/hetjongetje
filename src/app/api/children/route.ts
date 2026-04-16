import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  try {
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

    if (!name || !dateOfBirth || !gender || !mainCharacterType) {
      return NextResponse.json(
        { error: "Naam, geboortedatum, geslacht en personagetype zijn verplicht" },
        { status: 400 }
      );
    }

    const child = await prisma.childProfile.create({
      data: {
        userId: session.user.id,
        name,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        interests: interests || [],
        pets: pets || null,
        friends: friends || null,
        favoriteThings: favoriteThings || null,
        fears: fears || [],
        mainCharacterType,
        mainCharacterDescription: mainCharacterDescription || null,
        hairColor: hairColor || null,
        hairStyle: hairStyle || null,
        eyeColor: eyeColor || null,
        skinColor: skinColor || null,
        wearsGlasses: wearsGlasses || false,
        hasFreckles: hasFreckles || false,
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
