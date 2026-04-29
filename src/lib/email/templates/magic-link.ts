import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type MagicLinkMail = {
  name?: string | null;
  loginUrl: string;
  /** Lifetime in minutes — shown in the body so the recipient knows
   *  how quickly to act. */
  lifetimeMinutes: number;
};

export function buildMagicLinkMail(opts: MagicLinkMail): {
  subject: string;
  html: string;
  text: string;
} {
  const greetingPlain = opts.name ? `Hallo ${opts.name},` : "Hallo,";
  const greeting = opts.name ? `Hallo ${escapeHtml(opts.name)},` : "Hallo,";
  const subject = "Je login-link voor Ons Verhaaltje";

  const html = wrapEditorialEmail({
    preheader: `Klik om in te loggen. Werkt ${opts.lifetimeMinutes} minuten.`,
    title: subject,
    heading: "Je login-link",
    body:
      bodyParagraph(greeting) +
      bodyParagraph(
        "Je vroeg om een login-link voor Ons Verhaaltje. Klik op de knop hieronder om direct in te loggen — geen wachtwoord nodig.",
      ) +
      bodyParagraph(
        `De link werkt <strong>${opts.lifetimeMinutes} minuten</strong> en kan maar één keer gebruikt worden. Vroeg jij niet om deze mail? Dan kun je hem negeren — er is niets veranderd aan je account.`,
      ),
    cta: { label: "Inloggen", url: opts.loginUrl },
    footerNote: `Werkt de knop niet? Kopieer deze link in je browser:<br /><span style="word-break:break-all;">${opts.loginUrl}</span>`,
  });

  const text = [
    greetingPlain,
    "",
    "Je vroeg om een login-link voor Ons Verhaaltje.",
    "",
    "Klik op deze link om in te loggen:",
    opts.loginUrl,
    "",
    `De link werkt ${opts.lifetimeMinutes} minuten en kan maar één keer gebruikt worden.`,
    "",
    "Vroeg jij niet om deze mail? Dan kun je hem negeren — er is niets veranderd aan je account.",
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
