"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";

const VALID_REASONS = new Set([
  "te_vaak",
  "niet_relevant",
  "nooit_aangemeld",
  "tijdelijk",
  "anders",
]);

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Survey-submit handler. Afmelden gebeurt eerder in de page-flow; hier
 * slaan we alleen de reden op. Token wordt opnieuw geverifieerd zodat
 * niemand random redenen kan injecteren met willekeurige e-mailadressen.
 */
export async function submitUnsubscribeReasonAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const token = getString(formData, "token");
  const reason = getString(formData, "reason");
  const note = getString(formData, "note");

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    redirect("/unsubscribe");
  }
  if (!VALID_REASONS.has(reason)) {
    redirect(`/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`);
  }
  if (reason === "anders" && note.length === 0) {
    redirect(
      `/unsubscribe?email=${encodeURIComponent(email)}&token=${token}&error=note_required`,
    );
  }

  await prisma.newsletterUnsubscribeReason.create({
    data: {
      email,
      reason,
      note: note.length > 0 ? note.slice(0, 2000) : null,
    },
  });

  redirect(
    `/unsubscribe?email=${encodeURIComponent(email)}&token=${token}&thanks=1`,
  );
}
