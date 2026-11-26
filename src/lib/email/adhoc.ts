/**
 * Losse ("ad-hoc") mail vanuit de admin, in dezelfde editorial layout als
 * alle transactionele mails. Puur en zonder server-imports, zodat de
 * admin-pagina er ook een live voorbeeld in de browser mee kan renderen.
 *
 * Tekst is platte tekst: alles wordt ge-escaped. Alleen **vet** wordt
 * omgezet naar <strong>, zodat een losse mail geen willekeurige HTML kan
 * bevatten.
 */
import { wrapEditorialEmail, bodyParagraph } from "./layout";
import { escapeHtml } from "./escape";

export type AdhocMailContent = {
  subject: string;
  heading: string;
  /** Platte tekst; alinea's gescheiden door een lege regel. */
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function splitParagraphs(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

export function isSafeCtaUrl(url: string): boolean {
  return /^https:\/\/[^\s"'<>]+$/i.test(url);
}

export function renderAdhocMail(c: AdhocMailContent): {
  html: string;
  text: string;
} {
  const paragraphs = splitParagraphs(c.body);
  const cta =
    c.ctaLabel && c.ctaUrl && isSafeCtaUrl(c.ctaUrl)
      ? { label: c.ctaLabel, url: c.ctaUrl }
      : undefined;
  const preheader = (paragraphs.find((p) => p.length > 20) ?? c.heading)
    .replace(/\*\*/g, "")
    .slice(0, 110);

  const html = wrapEditorialEmail({
    preheader,
    title: c.subject || c.heading,
    heading: c.heading,
    body: paragraphs.map((p) => bodyParagraph(inline(p))).join(""),
    cta,
    footerNote: c.footerNote ? inline(c.footerNote) : undefined,
  });

  const text = [
    c.heading,
    "",
    ...paragraphs.map((p) => p.replace(/\*\*/g, "")).flatMap((p) => [p, ""]),
    ...(cta ? [`${cta.label}: ${cta.url}`, ""] : []),
    ...(c.footerNote ? [c.footerNote.replace(/\*\*/g, ""), ""] : []),
    "onsverhaaltje.nl · info@onsverhaaltje.nl",
  ].join("\n");

  return { html, text };
}
