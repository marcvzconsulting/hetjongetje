"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { consumeTokenAndSetPassword } from "@/lib/password-reset";
import { buildAppUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildPasswordChangedMail } from "@/lib/email/templates/password-changed";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    redirect("/reset-password?error=missing_token");
  }
  if (!newPassword || !confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=missing`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=mismatch`);
  }

  const result = await consumeTokenAndSetPassword(token, newPassword);
  if (!result.ok) {
    if (result.reason === "invalid_or_expired") {
      redirect("/reset-password?error=invalid");
    }
    // Any policy violation surfaces back to the form with the reason
    // so the page can render a friendly message.
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=${result.reason}`
    );
  }

  // Confirmation mail — best-effort, shouldn't block the redirect on failure.
  try {
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { email: true, name: true },
    });
    if (user) {
      const loginUrl = await buildAppUrl("/login");
      const mail = buildPasswordChangedMail({
        name: user.name,
        loginUrl,
        source: "reset",
      });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["password-changed"],
      });
    }
  } catch (mailError) {
    console.error("[password-reset] confirmation mail failed", mailError);
  }

  redirect("/login?reset=1");
}
