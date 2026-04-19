"use server";

import { redirect } from "next/navigation";
import { consumeTokenAndSetPassword } from "@/lib/password-reset";

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
    if (result.reason === "too_short") {
      redirect(
        `/reset-password?token=${encodeURIComponent(token)}&error=too_short`
      );
    }
    redirect("/reset-password?error=invalid");
  }

  redirect("/login?reset=1");
}
