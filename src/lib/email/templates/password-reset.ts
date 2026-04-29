import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type PasswordResetMail = {
  name?: string | null;
  resetUrl: string;
  /** Token lifetime in hours. */
  lifetimeHours: number;
};

export function buildPasswordResetMail(opts: PasswordResetMail): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = opts.name ? `Hallo ${escapeHtml(opts.name)},` : "Hallo,";
  const greetingPlain = opts.name ? `Hallo ${opts.name},` : "Hallo,";
  const subject = "Kies een nieuw wachtwoord voor Ons Verhaaltje";

  const html = wrapEditorialEmail({
    preheader: `Klik op de link om een nieuw wachtwoord in te stellen. ${opts.lifetimeHours} uur geldig.`,
    title: subject,
    heading: "Een nieuwe sleutel",
    body:
      bodyParagraph(greeting) +
      bodyParagraph(
        "Je vroeg om een nieuw wachtwoord. Klik op de knop hieronder om er een in te stellen."
      ) +
      bodyParagraph(
        `De link is <strong>${opts.lifetimeHours} uur</strong> geldig. Gebruikt iemand anders deze mail ongevraagd? Dan kun je hem negeren, er verandert niks aan je account.`
      ),
    cta: { label: "Wachtwoord kiezen", url: opts.resetUrl },
    footerNote: `Werkt de knop niet? Kopieer dan deze link in je browser:<br /><span style="word-break:break-all;">${opts.resetUrl}</span>`,
  });

  const text = [
    greetingPlain,
    "",
    "Je vroeg om een nieuw wachtwoord voor Ons Verhaaltje.",
    "",
    "Kies een nieuw wachtwoord via deze link:",
    opts.resetUrl,
    "",
    `De link is ${opts.lifetimeHours} uur geldig.`,
    "",
    "Gebruikt iemand anders deze mail ongevraagd? Dan kun je hem negeren, er verandert niks aan je account.",
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
