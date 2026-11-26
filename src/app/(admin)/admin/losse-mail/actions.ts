"use server";

import { z } from "zod";
import { requireAdminWithIdentity } from "@/lib/admin/identity";
import { logAdminAction } from "@/lib/admin/audit-log";
import { sendMail } from "@/lib/email/client";
import {
  renderAdhocMail,
  splitParagraphs,
  isSafeCtaUrl,
  type AdhocMailContent,
} from "@/lib/email/adhoc";

export type AdhocState = { kind: "idle" | "success" | "error"; message: string };

const MAX_RECIPIENTS = 10;
const emailSchema = z.string().email();

function readContent(formData: FormData): AdhocMailContent {
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    subject: s("subject"),
    heading: s("heading"),
    body: String(formData.get("body") ?? ""),
    ctaLabel: s("ctaLabel") || undefined,
    ctaUrl: s("ctaUrl") || undefined,
    footerNote: s("footerNote") || undefined,
  };
}

function validate(c: AdhocMailContent): string | null {
  if (!c.subject || !c.heading || splitParagraphs(c.body).length === 0) {
    return "Onderwerp, kop en tekst zijn verplicht.";
  }
  if (c.ctaLabel && !c.ctaUrl) return "Vul ook de link van de knop in.";
  if (c.ctaUrl && !isSafeCtaUrl(c.ctaUrl)) {
    return "De link van de knop moet met https:// beginnen.";
  }
  return null;
}

/**
 * Eén server action voor beide knoppen: `intent=test` stuurt naar het
 * eigen admin-adres, `intent=send` naar de ontvangers (ieder een eigen
 * mail, zodat ze elkaars adres niet zien).
 */
export async function adhocMailAction(
  _prev: AdhocState,
  formData: FormData,
): Promise<AdhocState> {
  const { audit, session } = await requireAdminWithIdentity();
  const intent = String(formData.get("intent") ?? "");
  const content = readContent(formData);
  const invalid = validate(content);
  if (invalid) return { kind: "error", message: invalid };

  const { html, text } = renderAdhocMail(content);

  if (intent === "test") {
    const adminEmail = session.user?.email;
    if (!adminEmail) {
      return { kind: "error", message: "Je admin-account heeft geen e-mailadres." };
    }
    try {
      await sendMail({
        to: adminEmail,
        toName: session.user?.name ?? "Admin",
        subject: `[TEST] ${content.subject}`,
        html,
        text,
        tags: ["adhoc-test"],
      });
    } catch {
      return { kind: "error", message: "Testmail versturen is mislukt." };
    }
    return { kind: "success", message: `Testmail gestuurd naar ${adminEmail}.` };
  }

  if (intent !== "send") return { kind: "error", message: "Onbekende actie." };

  const recipients = Array.from(
    new Set(
      String(formData.get("to") ?? "")
        .split(/[\s,;]+/)
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  if (recipients.length === 0) {
    return { kind: "error", message: "Vul minstens één ontvanger in." };
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return {
      kind: "error",
      message: `Maximaal ${MAX_RECIPIENTS} ontvangers per keer. Gebruik voor meer de nieuwsbrief.`,
    };
  }
  const bad = recipients.filter((r) => !emailSchema.safeParse(r).success);
  if (bad.length > 0) {
    return { kind: "error", message: `Ongeldig e-mailadres: ${bad.join(", ")}` };
  }

  const failed: string[] = [];
  for (const to of recipients) {
    try {
      await sendMail({ to, subject: content.subject, html, text, tags: ["adhoc"] });
    } catch (err) {
      console.error("[adhoc-mail] send failed", err instanceof Error ? err.message : err);
      failed.push(to);
    }
  }

  await logAdminAction({
    ...audit,
    action: "email.adhoc_send",
    targetType: "email",
    targetId: recipients.join(", "),
    metadata: { subject: content.subject, failed },
  });

  if (failed.length > 0) {
    return {
      kind: "error",
      message: `Niet gelukt voor: ${failed.join(", ")}. De rest is verstuurd.`,
    };
  }
  return {
    kind: "success",
    message: `Verstuurd naar ${recipients.join(", ")}. Je vindt ze terug in de maillog van Brevo.`,
  };
}
