"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Markeer onboarding als gezien. Idempotent — schrijft alleen als de
 * timestamp nog null was, anders geen DB-roundtrip nodig.
 */
export async function markOnboardedAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.user.updateMany({
    where: { id: session.user.id, onboardedAt: null },
    data: { onboardedAt: new Date() },
  });
  revalidatePath("/dashboard");
}
