/**
 * Admin-melding wanneer een verhaal-generatie afsluit met één of meer
 * mislukte illustraties (status="partial"). Niet editable via /admin/
 * email-templates — interne ops-mail, geen klant-gerichte tekst.
 */

type Opts = {
  storyId: string;
  storyTitle: string;
  childName: string;
  userEmail: string;
  failedPages: number[];
  totalPages: number;
  reviewUrl: string;
};

export function buildAdminStoryIncompleteMail(opts: Opts): {
  subject: string;
  html: string;
  text: string;
} {
  const failedList = opts.failedPages.join(", ");
  const subject = `[Ops] Verhaal "${opts.storyTitle}" mist ${opts.failedPages.length}/${opts.totalPages} illustraties`;

  const html = `<!doctype html>
<html lang="nl">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f1e3a;">
  <h1 style="font-size: 18px; margin: 0 0 12px;">Verhaal incompleet gegenereerd</h1>
  <p style="font-size: 14px; line-height: 1.55; margin: 0 0 16px;">
    Een verhaal is opgeslagen met status <strong>partial</strong> — fal.ai
    gaf zelfs na retry null voor de illustraties op pagina${opts.failedPages.length === 1 ? "" : "'s"} <strong>${failedList}</strong>.
    De klant heeft hun credit teruggekregen en kan opnieuw genereren.
  </p>
  <table style="font-size: 13px; border-collapse: collapse; margin: 0 0 20px;">
    <tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Titel</td><td>${opts.storyTitle}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Kind</td><td>${opts.childName}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Klant</td><td>${opts.userEmail}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Mislukte pagina's</td><td>${failedList} (van ${opts.totalPages})</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Story-id</td><td><code>${opts.storyId}</code></td></tr>
  </table>
  <p style="font-size: 14px;">
    <a href="${opts.reviewUrl}" style="color: #8a7340;">Bekijk in admin →</a>
  </p>
  <p style="font-size: 12px; color: #6b6a82; margin-top: 24px; line-height: 1.5;">
    Check de Vercel-logs voor de fal.ai-error. Vaak is het rate-limit of
    een content-filter dat klaagt over de prompt.
  </p>
</body></html>`;

  const text = `Verhaal incompleet gegenereerd

Titel: ${opts.storyTitle}
Kind: ${opts.childName}
Klant: ${opts.userEmail}
Mislukte pagina's: ${failedList} (van ${opts.totalPages})
Story-id: ${opts.storyId}

De klant heeft hun credit teruggekregen.

Admin: ${opts.reviewUrl}`;

  return { subject, html, text };
}
