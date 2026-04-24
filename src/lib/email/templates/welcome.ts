import { bodyParagraph, wrapEditorialEmail } from "../layout";

type WelcomeMail = {
  name: string;
  profileUrl: string;
};

export function buildWelcomeMail(opts: WelcomeMail): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Welkom bij Ons Verhaaltje";

  const html = wrapEditorialEmail({
    preheader:
      "Fijn dat je er bent. Zo maak je in een paar minuten het eerste verhaal.",
    title: subject,
    heading: `Welkom, ${opts.name}`,
    body:
      bodyParagraph(
        "Fijn dat je er bent. Ons Verhaaltje is er om voor jouw kind elke avond een persoonlijk verhaaltje te kunnen maken, met hun naam, hun knuffel, de mensen om hen heen."
      ) +
      bodyParagraph(
        "In een paar minuten ben je klaar: vul het profiel van je kind in, vertel ons kort wat er vanavond speelt, en wij maken er een voorleesverhaal van."
      ) +
      bodyParagraph(
        "Aan het einde van het jaar bundel je de mooiste verhalen in een echt gedrukt boekje. Iets om later nog eens terug te lezen."
      ),
    cta: { label: "Maak het eerste profiel", url: opts.profileUrl },
    footerNote:
      "Vragen of opmerkingen? Beantwoord deze mail gewoon, we lezen alles zelf.",
  });

  const text = [
    `Welkom, ${opts.name}.`,
    "",
    "Fijn dat je er bent. Ons Verhaaltje is er om voor jouw kind elke avond een persoonlijk verhaaltje te kunnen maken, met hun naam, hun knuffel, de mensen om hen heen.",
    "",
    "In een paar minuten ben je klaar: vul het profiel van je kind in, vertel ons kort wat er vanavond speelt, en wij maken er een voorleesverhaal van.",
    "",
    "Aan het einde van het jaar bundel je de mooiste verhalen in een echt gedrukt boekje.",
    "",
    "Maak het eerste profiel:",
    opts.profileUrl,
    "",
    "Vragen of opmerkingen? Beantwoord deze mail gewoon, we lezen alles zelf.",
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
