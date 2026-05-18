import { prisma } from "@/lib/db";
import { bodyParagraph, wrapEditorialEmail } from "./layout";
import { escapeHtml } from "./escape";

/**
 * Shape every editable mail-template renders from. Each builder ships a
 * matching `defaults` object hard-coded in the templates/* file; admin
 * may override the same fields via /admin/email-templates which writes
 * an EmailTemplate row.
 *
 * `paragraphs` allows raw HTML (so links, <strong>, etc keep working);
 * variables go in `{{name}}`-form and get replaced — escaped — at send
 * time. Internal HTML in the default copy is therefore ALWAYS authored
 * by us; admin-supplied HTML inside paragraph strings is kept as-is on
 * purpose so simple <a href>-edits remain possible.
 */
export type TemplateContent = {
  subject: string;
  heading: string;
  paragraphs: string[];
  ctaLabel?: string | null;
  footerNote?: string | null;
};

export type TemplateRender = {
  /** Final inbox subject — variables substituted, no HTML. */
  subject: string;
  /** Full HTML email ready to ship. */
  html: string;
  /** Plain-text fallback. */
  text: string;
};

export type TemplateRenderOptions = {
  /** Optional cta destination URL — never overridable, always set in code. */
  ctaUrl?: string;
  /** Optional preheader override; falls back to first paragraph stripped. */
  preheader?: string;
};

/**
 * Try to load admin-overridden content for `code`. Returns null when no
 * row exists, so callers fall back to their hard-coded defaults.
 */
export async function loadTemplateOverride(
  code: string,
): Promise<TemplateContent | null> {
  const row = await prisma.emailTemplate.findUnique({ where: { code } });
  if (!row) return null;
  const paragraphs = Array.isArray(row.bodyParagraphs)
    ? (row.bodyParagraphs as unknown as string[]).filter(
        (p) => typeof p === "string",
      )
    : [];
  return {
    subject: row.subject,
    heading: row.heading,
    paragraphs,
    ctaLabel: row.ctaLabel,
    footerNote: row.footerNote,
  };
}

/**
 * Substitute `{{name}}` placeholders with HTML-escaped values from
 * `vars`. Missing vars are left as the literal `{{name}}` so they're
 * obvious in preview rather than silently disappearing.
 */
function substitute(input: string, vars: Record<string, unknown>): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    if (!(key in vars)) return `{{${key}}}`;
    const v = vars[key];
    if (v === null || v === undefined) return "";
    return escapeHtml(String(v));
  });
}

/**
 * Same as `substitute` but for the plain-text fallback — strips HTML
 * tags from the substituted result and decodes the escapes.
 */
function substitutePlain(input: string, vars: Record<string, unknown>): string {
  return input
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      if (!(key in vars)) return `{{${key}}}`;
      const v = vars[key];
      return v === null || v === undefined ? "" : String(v);
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Merge defaults with an optional admin override, substitute variables,
 * and render to a final TemplateRender. The single entry point all
 * editable templates use — keeps fall-back-on-missing-row, escape rules
 * and chrome-wrap consistent in one place.
 */
export async function renderEditableTemplate(
  code: string,
  defaults: TemplateContent,
  vars: Record<string, unknown>,
  opts: TemplateRenderOptions = {},
): Promise<TemplateRender> {
  const override = await loadTemplateOverride(code);
  const merged: TemplateContent = override ?? defaults;

  const subject = substitutePlain(merged.subject, vars);
  const heading = substitute(merged.heading, vars);
  const paragraphs = merged.paragraphs.map((p) => substitute(p, vars));
  const ctaLabel = merged.ctaLabel ? substitute(merged.ctaLabel, vars) : null;
  const footerNote = merged.footerNote
    ? substitute(merged.footerNote, vars)
    : null;

  const preheader =
    opts.preheader ??
    paragraphs[0]?.replace(/<[^>]+>/g, "").slice(0, 110) ??
    subject;

  const html = wrapEditorialEmail({
    preheader,
    title: subject,
    heading,
    body: paragraphs.map((p) => bodyParagraph(p)).join(""),
    cta: ctaLabel && opts.ctaUrl ? { label: ctaLabel, url: opts.ctaUrl } : undefined,
    footerNote: footerNote ?? undefined,
  });

  const textParts: string[] = [];
  textParts.push(subject);
  textParts.push("");
  for (const p of merged.paragraphs) {
    textParts.push(substitutePlain(p, vars));
    textParts.push("");
  }
  if (ctaLabel && opts.ctaUrl) {
    textParts.push(`${substitutePlain(ctaLabel, vars)}: ${opts.ctaUrl}`);
    textParts.push("");
  }
  if (footerNote) {
    textParts.push(substitutePlain(footerNote, vars));
    textParts.push("");
  }
  textParts.push("— Ons Verhaaltje");

  return { subject, html, text: textParts.join("\n") };
}

/**
 * Catalogue of editable templates — keeps the admin index in sync with
 * the actual files and tells the editor which `{{vars}}` are available
 * so the admin doesn't have to guess. Adding a template = add a row
 * here AND make the matching builder call `renderEditableTemplate`.
 */
export const EDITABLE_TEMPLATES = [
  {
    code: "welcome",
    label: "Welkom (na registratie)",
    description: "Eerste mail die nieuwe gebruikers ontvangen na registratie.",
    vars: ["name", "profileUrl"],
  },
  {
    code: "account-approved",
    label: "Account goedgekeurd",
    description: "Verstuurd zodra admin een account voor het eerst goedkeurt.",
    vars: ["name", "credits", "dashboardUrl"],
  },
  {
    code: "first-story",
    label: "Eerste verhaal klaar",
    description: "Bevestiging dat het eerste gegenereerde verhaal klaarstaat.",
    vars: ["name", "childName", "storyTitle", "storyUrl"],
  },
  {
    code: "credits-purchased",
    label: "Credits gekocht",
    description: "Bevestiging na aanschaf van een credit-pakket.",
    vars: [
      "name",
      "packName",
      "creditAmount",
      "amountFormatted",
      "vatRate",
      "newBalance",
      "orderId",
      "dashboardUrl",
    ],
  },
  {
    code: "subscription-started",
    label: "Abonnement gestart",
    description: "Welkomstmail na de eerste abonnements-betaling.",
    vars: [
      "name",
      "planName",
      "amountFormatted",
      "vatRate",
      "intervalNl",
      "creditsPerInterval",
      "nextChargeFormatted",
      "subscriptionMollieId",
      "accountUrl",
    ],
  },
  {
    code: "subscription-cancelled",
    label: "Abonnement opgezegd",
    description: "Bevestiging dat een abonnement is opgezegd.",
    vars: ["name", "planName", "endsAtFormatted", "accountUrl", "subscribeUrl"],
  },
  {
    code: "newsletter-welcome",
    label: "Nieuwsbrief welkom",
    description: "Welkomstmail na nieuwsbrief-aanmelding.",
    vars: ["email", "unsubscribeUrl"],
  },
  {
    code: "newsletter-unsubscribed",
    label: "Nieuwsbrief afgemeld",
    description: "Bevestigingsmail na afmelden van de nieuwsbrief.",
    vars: ["email", "resubscribeUrl"],
  },
] as const;

export type EditableTemplateCode = (typeof EDITABLE_TEMPLATES)[number]["code"];

export function findEditableTemplate(code: string) {
  return EDITABLE_TEMPLATES.find((t) => t.code === code);
}
