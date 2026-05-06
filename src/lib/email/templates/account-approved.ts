import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type AccountApprovedMail = {
  name: string;
  /** Credits the admin set on approval — used in the "X verhaal(en) klaar" line. */
  credits: number;
  dashboardUrl: string;
};

export function buildAccountApprovedMail(opts: AccountApprovedMail): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Welkom — je account is geactiveerd";
  const safeName = escapeHtml(opts.name);
  const creditsLine =
    opts.credits === 1
      ? "Er staat <strong>1 verhaal</strong> klaar om mee te beginnen."
      : opts.credits > 1
        ? `Er staan <strong>${opts.credits} verhalen</strong> klaar om mee te beginnen.`
        : "Je kunt direct aan de slag.";

  const html = wrapEditorialEmail({
    preheader: "Je profiel is goedgekeurd. Maak het eerste verhaal.",
    title: subject,
    heading: "Je account is klaar",
    body:
      bodyParagraph(`Hallo ${safeName},`) +
      bodyParagraph(
        `We hebben je account goedgekeurd — welkom bij Ons Verhaaltje. ${creditsLine}`,
      ) +
      bodyParagraph(
        "Vul het profiel van je kindje in (naam, leeftijd, knuffel, kleine details) en kies dan vanavond een aanleiding. Wij maken er een verhaal van.",
      ) +
      bodyParagraph(
        "Drie minuten en je hebt iets om voor te lezen waar zij of hij zichzelf in herkent.",
      ),
    cta: { label: "Maak het eerste verhaal", url: opts.dashboardUrl },
    footerNote:
      "Vragen of werkt iets niet zoals verwacht? Beantwoord deze mail dan kijken we mee.",
  });

  const text = [
    `Hallo ${opts.name},`,
    "",
    `Je account is goedgekeurd — welkom bij Ons Verhaaltje.`,
    opts.credits === 1
      ? "Er staat 1 verhaal klaar om mee te beginnen."
      : opts.credits > 1
        ? `Er staan ${opts.credits} verhalen klaar om mee te beginnen.`
        : "Je kunt direct aan de slag.",
    "",
    "Vul het profiel van je kindje in en kies een aanleiding — drie minuten en je hebt iets om voor te lezen.",
    "",
    "Naar je bibliotheek:",
    opts.dashboardUrl,
    "",
    "— Ons Verhaaltje",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
