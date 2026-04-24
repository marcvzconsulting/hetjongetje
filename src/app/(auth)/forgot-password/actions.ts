"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createPasswordResetToken,
  buildResetUrl,
} from "@/lib/password-reset";
import { sendMail } from "@/lib/email/client";
import { buildPasswordResetMail } from "@/lib/email/templates/password-reset";

const USER_LIFETIME_HOURS = 1;

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
    const url = await buildResetUrl(token);

    const mail = buildPasswordResetMail({
      name: user.name,
      resetUrl: url,
      lifetimeHours: USER_LIFETIME_HOURS,
    });

    try {
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["password-reset"],
      });
    } catch (err) {
      // Don't leak failures to the client. Keep the reset link in logs so an
      // admin can retrieve it manually if the mail provider is down.
      console.error(
        `[password-reset] Send failed for ${user.email}. Reset URL: ${url}`,
        err
      );
    }
  }

  redirect("/forgot-password?sent=1");
}
