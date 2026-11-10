"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { sendVerifyEmailMail } from "@/lib/auth/verify-email-mail";

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

/**
 * Stuur de bevestigingsmail opnieuw. Begrensd op drie per uur per account,
 * zodat de knop geen mailkanon wordt.
 */
export async function resendVerifyEmailAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerifiedAt: true,
      pendingStarterCredits: true,
    },
  });
  if (!user || user.emailVerifiedAt) redirect("/dashboard");

  const limit = await rateLimit({
    key: `verify-email-resend:${user.id}`,
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!limit.allowed) redirect("/dashboard?bevestigen=te-vaak");

  const sent = await sendVerifyEmailMail({
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.pendingStarterCredits,
  });
  redirect(`/dashboard?bevestigen=${sent ? "verstuurd" : "mail-mislukt"}`);
}
