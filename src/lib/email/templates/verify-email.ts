import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type VerifyEmailMail = {
  name?: string | null;
  verifyUrl: string;
  /** Aantal gratis verhalen dat klaarstaat; 0 = niet noemen. */
  credits: number;
};

export function buildVerifyEmailMail(opts: VerifyEmailMail): {
  subject: string;
  html: string;
  text: string;
} {
  const greetingPlain = opts.name ? `Hallo ${opts.name},` : "Hallo,";
  const greeting = opts.name ? `Hallo ${escapeHtml(opts.name)},` : "Hallo,";
  const subject = "Bevestig je e-mailadres voor Ons Verhaaltje";
  const reward =
    opts.credits > 1
      ? `Daarna staan je ${opts.credits} gratis verhalen klaar.`
      : opts.credits === 1
        ? "Daarna staat je gratis verhaal klaar."
        : "Daarna is je account compleet.";

  const html = wrapEditorialEmail({
    preheader: `Eén klik om je adres te bevestigen. ${reward}`,
    title: subject,
    heading: "Bevestig je e-mailadres",
    body:
      bodyParagraph(greeting) +
      bodyParagraph(
        `Klik op de knop hieronder om te bevestigen dat dit adres van jou is. ${reward}`,
      ) +
      bodyParagraph(
        "Open de link in de browser waarin je bent ingelogd. De link werkt zeven dagen. Heb jij geen account aangemaakt? Dan kun je deze mail negeren.",
      ),
    cta: { label: "E-mailadres bevestigen", url: opts.verifyUrl },
    footerNote: `Werkt de knop niet? Kopieer deze link in je browser:<br /><span style="word-break:break-all;">${opts.verifyUrl}</span>`,
  });

  const text = [
    greetingPlain,
    "",
    `Bevestig dat dit e-mailadres van jou is. ${reward}`,
    "",
    opts.verifyUrl,
    "",
    "Open de link in de browser waarin je bent ingelogd. De link werkt zeven dagen.",
    "",
    "Heb jij geen account aangemaakt? Dan kun je deze mail negeren.",
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
