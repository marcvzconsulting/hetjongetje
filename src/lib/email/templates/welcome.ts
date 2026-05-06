import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type WelcomeMail = {
  name: string;
  profileUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "Welkom bij Ons Verhaaltje",
  heading: "Welkom, {{name}}",
  paragraphs: [
    "Fijn dat je er bent. Ons Verhaaltje is er om voor jouw kind elke avond een persoonlijk verhaaltje te kunnen maken, met hun naam, hun knuffel, de mensen om hen heen.",
    "In een paar minuten ben je klaar: vul het profiel van je kind in, vertel ons kort wat er vanavond speelt, en wij maken er een voorleesverhaal van.",
    "Aan het einde van het jaar bundel je de mooiste verhalen in een echt gedrukt boekje. Iets om later nog eens terug te lezen.",
  ],
  ctaLabel: "Maak het eerste profiel",
  footerNote:
    "Vragen of opmerkingen? Beantwoord deze mail gewoon, we lezen alles zelf.",
};

export function welcomeDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildWelcomeMail(
  opts: WelcomeMail,
): Promise<TemplateRender> {
  return renderEditableTemplate("welcome", DEFAULTS, opts, {
    ctaUrl: opts.profileUrl,
    preheader:
      "Fijn dat je er bent. Zo maak je in een paar minuten het eerste verhaal.",
  });
}
