import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type FirstStoryMail = {
  userName: string;
  childName: string;
  storyTitle: string;
  storyUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "Het eerste verhaal voor {{childName}} is klaar",
  heading: "Het eerste verhaaltje",
  paragraphs: [
    "Hallo {{name}},",
    "Mooi moment: <em>{{storyTitle}}</em> staat klaar om voor te lezen aan {{childName}}. Het eerste verhaal op hun plankje.",
    "Een tip voor vanavond: lees 'm samen onder een kleedje, in het zachte licht van een lampje. Laat ze mee-raden wat er op de volgende bladzijde gebeurt.",
    "De volgende keer gaat het makkelijker, want wij hebben nu al aardig in kaart wie {{childName}} is. Eén zin over wat er die dag speelt is genoeg.",
  ],
  ctaLabel: "Naar het verhaal",
  footerNote:
    "Aan het einde van het jaar bundel je de mooiste verhalen in een echt gedrukt boekje. Iets om later nog eens terug te lezen.",
};

export function firstStoryDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildFirstStoryMail(
  opts: FirstStoryMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "first-story",
    DEFAULTS,
    {
      // Map userName onto the canonical "name" var so the template
      // editor can refer to a single variable across all templates.
      name: opts.userName,
      childName: opts.childName,
      storyTitle: opts.storyTitle,
      storyUrl: opts.storyUrl,
    },
    {
      ctaUrl: opts.storyUrl,
      preheader: `"${opts.storyTitle}" staat voor je klaar, om samen voor te lezen.`,
    },
  );
}
