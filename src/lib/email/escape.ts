/**
 * Single source of truth for HTML escaping in email templates.
 *
 * Why centralised: layout helpers like `bodyParagraph(html)` accept raw
 * HTML on purpose so individual templates can mark up their copy.
 * That means every piece of user-supplied text (names, titles,
 * descriptions, email addresses) MUST be run through `escapeHtml`
 * before being spliced in. Having one helper rather than copy-pasted
 * versions per template makes audits cheap and prevents drift.
 *
 * Rule of thumb when adding a new template: anything that came from a
 * `User`, `ChildProfile`, `Story` or form-input gets escapeHtml. URLs
 * that are constructed server-side from our own paths do not need it.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
