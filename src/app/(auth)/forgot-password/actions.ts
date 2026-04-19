"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createPasswordResetToken,
  buildResetUrl,
} from "@/lib/password-reset";

export async function requestResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?error=missing");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // We intentionally always redirect to the "sent" state so we don't leak
  // which emails have accounts.
  if (user) {
    const { token } = await createPasswordResetToken({ userId: user.id });
    const url = buildResetUrl(token);
    // TODO: send via email. For now we log the link so it's usable in dev.
    console.log(
      `[password-reset] Reset link for ${user.email}: ${url}`
    );
  }

  redirect("/forgot-password?sent=1");
}
