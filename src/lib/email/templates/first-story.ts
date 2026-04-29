import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type FirstStoryMail = {
  userName: string;
  childName: string;
  storyTitle: string;
  storyUrl: string;
};

export function buildFirstStoryMail(opts: FirstStoryMail): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Het eerste verhaal voor ${opts.childName} is klaar`;
  // Pre-escaped versions for HTML interpolation.
  const userName = escapeHtml(opts.userName);
  const childName = escapeHtml(opts.childName);
  const storyTitle = escapeHtml(opts.storyTitle);

  const html = wrapEditorialEmail({
    // preheader is auto-escaped by wrapEditorialEmail.
    preheader: `"${opts.storyTitle}" staat voor je klaar, om samen voor te lezen.`,
    title: subject,
    heading: "Het eerste verhaaltje",
    body:
      bodyParagraph(`Hallo ${userName},`) +
      bodyParagraph(
        `Mooi moment: <em>${storyTitle}</em> staat klaar om voor te lezen aan ${childName}. Het eerste verhaal op hun plankje.`
      ) +
      bodyParagraph(
        "Een tip voor vanavond: lees 'm samen onder een kleedje, in het zachte licht van een lampje. Laat ze mee-raden wat er op de volgende bladzijde gebeurt."
      ) +
      bodyParagraph(
        `De volgende keer gaat het makkelijker, want wij hebben nu al aardig in kaart wie ${childName} is. Eén zin over wat er die dag speelt is genoeg.`
      ),
    cta: { label: "Naar het verhaal", url: opts.storyUrl },
    footerNote:
      "Aan het einde van het jaar bundel je de mooiste verhalen in een echt gedrukt boekje. Iets om later nog eens terug te lezen.",
  });

  const text = [
    `Hallo ${opts.userName},`,
    "",
    `Mooi moment: "${opts.storyTitle}" staat klaar om voor te lezen aan ${opts.childName}. Het eerste verhaal op hun plankje.`,
    "",
    "Een tip voor vanavond: lees 'm samen onder een kleedje, in het zachte licht van een lampje. Laat ze mee-raden wat er op de volgende bladzijde gebeurt.",
    "",
    `De volgende keer gaat het makkelijker, want wij hebben nu al aardig in kaart wie ${opts.childName} is. Eén zin over wat er die dag speelt is genoeg.`,
    "",
    "Naar het verhaal:",
    opts.storyUrl,
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
