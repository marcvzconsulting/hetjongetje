import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  childProfileUpdateSchema,
  parseJsonBody,
} from "@/lib/validation";
import { normalizeChildName, normalizeNamesIn } from "@/lib/utils/name";
import { deleteChildStorage } from "@/lib/storage/user-cleanup";
import { cancelLoraTraining } from "@/lib/ai/lora-training";

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
    name: parsed.name ? normalizeChildName(parsed.name) : undefined,
    dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : undefined,
    gender: parsed.gender,
    interests: parsed.interests,
    pets:
      (normalizeNamesIn(parsed.pets) as Prisma.InputJsonValue | undefined) ??
      (parsed.pets as Prisma.InputJsonValue | undefined),
    friends:
      (normalizeNamesIn(parsed.friends) as Prisma.InputJsonValue | undefined) ??
      (parsed.friends as Prisma.InputJsonValue | undefined),
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

  // Stop any in-flight LoRA training so we don't keep paying fal for a job
  // whose profile is about to disappear.
  if (child.loraStatus === "training" && child.loraTrainingRequestId) {
    await cancelLoraTraining(child.loraTrainingRequestId).catch((e) =>
      console.error("[children] LoRA cancel on delete failed:", e)
    );
  }

  // Wipe every bucket object for this child FIRST — its AI preview, LoRA
  // photos + zip, and all story assets. The DB rows are the only place the
  // URLs live, so once the row is gone the objects are unreachable; delete
  // storage before the cascade or they leak forever on a public URL.
  const cleanup = await deleteChildStorage(childId);
  if (cleanup.failed.length > 0) {
    console.error(
      `[children] ${cleanup.failed.length} storage targets failed to delete for child ${childId}:`,
      cleanup.failed
    );
  }

  await prisma.childProfile.delete({ where: { id: childId } });

  return NextResponse.json({ success: true });
}
