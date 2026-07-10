"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminWithIdentity } from "@/lib/admin/identity";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit-log";
import { sendMail } from "@/lib/email/client";
import { findEditableTemplate } from "@/lib/email/template-store";
import { renderEditableTemplate, type TemplateContent } from "@/lib/email/template-store";
import { trim, nullIfEmpty } from "@/lib/form";

/**
 * Read the form's `paragraphs` field (one paragraph per blank-line
 * separated block, like a plain-text email body) and return the array.
 * Empty paragraphs get filtered so trailing newlines don't leak into
 * the rendered output.
 */
function parseParagraphs(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export async function saveTemplateAction(formData: FormData) {
  const { audit } = await requireAdminWithIdentity();
  const code = trim(formData.get("code"));
  const meta = findEditableTemplate(code);
  if (!meta) {
    redirect("/admin/email-templates?error=unknown_template");
  }

  const subject = trim(formData.get("subject"));
  const heading = trim(formData.get("heading"));
  const paragraphs = parseParagraphs(String(formData.get("paragraphs") ?? ""));
  const ctaLabel = nullIfEmpty(trim(formData.get("ctaLabel")));
  const footerNote = nullIfEmpty(trim(formData.get("footerNote")));

  if (!subject || !heading || paragraphs.length === 0) {
    redirect(`/admin/email-templates/${code}?error=required_fields_missing`);
  }

  await prisma.emailTemplate.upsert({
    where: { code },
    create: {
      code,
      subject,
      heading,
      bodyParagraphs: paragraphs,
      ctaLabel,
      footerNote,
      updatedById: audit.actorId,
    },
    update: {
      subject,
      heading,
      bodyParagraphs: paragraphs,
      ctaLabel,
      footerNote,
      updatedById: audit.actorId,
    },
  });

  await logAdminAction({
    ...audit,
    action: "email_template.update",
    targetType: "email_template",
    targetId: code,
  });

  revalidatePath(`/admin/email-templates/${code}`);
  revalidatePath(`/admin/email-templates`);
  redirect(`/admin/email-templates/${code}?saved=1`);
}

export async function resetTemplateAction(formData: FormData) {
  const { audit } = await requireAdminWithIdentity();
  const code = trim(formData.get("code"));
  await prisma.emailTemplate.delete({ where: { code } }).catch(() => {});
  await logAdminAction({
    ...audit,
    action: "email_template.reset",
    targetType: "email_template",
    targetId: code,
  });
  revalidatePath(`/admin/email-templates/${code}`);
  revalidatePath(`/admin/email-templates`);
  redirect(`/admin/email-templates/${code}?saved=reset`);
}

/**
 * Render the template (override-or-default) with sample variables and
 * mail it to the admin's own address so they can preview the result in
 * a real inbox.
 */
export async function sendTestTemplateAction(formData: FormData) {
  const { audit, session } = await requireAdminWithIdentity();
  const code = trim(formData.get("code"));
  const meta = findEditableTemplate(code);
  if (!meta) {
    redirect("/admin/email-templates?error=unknown_template");
  }
  const adminEmail = session.user?.email;
  if (!adminEmail) {
    redirect(`/admin/email-templates/${code}?error=no_admin_email`);
  }

  // Sample vars — exposes typical-shape values for every supported var.
  const sampleVars: Record<string, unknown> = sampleVarsFor(meta.code);

  // Pull whatever default the template ships with — but the renderer's
  // override-fallback works even when defaults aren't reachable, since
  // we always have a row in DB OR fall through to a builder default.
  const fallbackDefaults: TemplateContent = {
    subject: "(default ontbreekt)",
    heading: "(default ontbreekt)",
    paragraphs: ["(default ontbreekt)"],
  };
  const rendered = await renderEditableTemplate(
    meta.code,
    fallbackDefaults,
    sampleVars,
    {
      ctaUrl: typeof sampleVars.ctaUrl === "string" ? sampleVars.ctaUrl : "https://onsverhaaltje.nl",
    },
  );

  await sendMail({
    to: adminEmail,
    toName: session.user?.name ?? "Admin",
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    tags: ["template-test"],
  });

  await logAdminAction({
    ...audit,
    action: "email_template.test_send",
    targetType: "email_template",
    targetId: code,
  });

  redirect(`/admin/email-templates/${code}?saved=test_sent`);
}

/**
 * Realistic-looking placeholder values for each template's variables —
 * keep in sync with EDITABLE_TEMPLATES.vars in template-store.ts so the
 * test mail actually reads correctly.
 */
function sampleVarsFor(code: string): Record<string, unknown> {
  const common = {
    name: "Sanne",
    email: "test@onsverhaaltje.nl",
    profileUrl: "https://onsverhaaltje.nl/profile/new",
    dashboardUrl: "https://onsverhaaltje.nl/dashboard",
    accountUrl: "https://onsverhaaltje.nl/account",
    subscribeUrl: "https://onsverhaaltje.nl/subscribe",
    unsubscribeUrl: "https://onsverhaaltje.nl/unsubscribe?token=demo",
  };
  switch (code) {
    case "account-approved":
      return { ...common, credits: 1 };
    case "first-story":
      return {
        ...common,
        childName: "Noor",
        storyTitle: "Noor en het maanlicht",
        storyUrl: "https://onsverhaaltje.nl/story/demo",
      };
    case "credits-purchased":
      return {
        ...common,
        creditAmount: 10,
        amountFormatted: "12,00",
        netFormatted: "9,92",
        vatFormatted: "2,08",
        vatRate: 21,
        orderId: "ord_demo123",
      };
    case "subscription-started":
      return {
        ...common,
        planName: "Per maand",
        amountFormatted: "7,95",
        netFormatted: "6,57",
        vatFormatted: "1,38",
        vatRate: 21,
        intervalNl: "elke maand",
        creditsPerInterval: 8,
        nextChargeFormatted: "5 juni 2026",
        subscriptionMollieId: "sub_demo123",
      };
    case "subscription-cancelled":
      return {
        ...common,
        planName: "Per maand",
        endsAtFormatted: "5 juni 2026",
      };
    case "day3-story-reminder":
    case "day7-login-reminder":
      return { ...common, childName: "Noor" };
    default:
      return common;
  }
}
