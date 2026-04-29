import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type LoraReadyMail = {
  userName: string;
  childName: string;
  generateUrl: string;
};

export function buildLoraReadyMail(opts: LoraReadyMail): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${opts.childName} is klaar voor de illustraties`;
  const userName = escapeHtml(opts.userName);
  const childName = escapeHtml(opts.childName);

  const html = wrapEditorialEmail({
    preheader: `Vanaf nu herken je ${opts.childName} in elk verhaal — zelfde gezicht, zelfde ogen, zelfde haar.`,
    title: subject,
    heading: `${opts.childName} is herkend`,
    body:
      bodyParagraph(`Hallo ${userName},`) +
      bodyParagraph(
        `We hebben ${childName} getraind in onze illustrator. Vanaf het volgende verhaaltje zie je echt <em>hen</em> terug op de plaatjes — zelfde gezicht, zelfde ogen, zelfde haar.`
      ) +
      bodyParagraph(
        "Eén detail: elke illustratie blijft met de hand opnieuw gemaakt, dus een klein verschil tussen verhalen is normaal. Denk aan dezelfde persoon op een andere bladzijde van een boek."
      ) +
      bodyParagraph(
        `De originele foto&rsquo;s van ${childName} zijn inmiddels weggegooid (binnen 7 dagen, zoals beloofd). Alleen het model met hun uiterlijk blijft, zolang ${childName}&rsquo;s profiel bestaat.`
      ),
    cta: { label: "Maak een verhaal", url: opts.generateUrl },
    footerNote:
      "Wil je de herkenning uitzetten? Dat kan altijd in het profiel van je kind.",
  });

  const text = [
    `Hallo ${opts.userName},`,
    "",
    `We hebben ${opts.childName} getraind in onze illustrator. Vanaf het volgende verhaaltje zie je echt hen terug op de plaatjes — zelfde gezicht, zelfde ogen, zelfde haar.`,
    "",
    "Eén detail: elke illustratie blijft met de hand opnieuw gemaakt, dus een klein verschil tussen verhalen is normaal. Denk aan dezelfde persoon op een andere bladzijde van een boek.",
    "",
    `De originele foto's van ${opts.childName} zijn inmiddels weggegooid (binnen 7 dagen, zoals beloofd). Alleen het model met hun uiterlijk blijft, zolang ${opts.childName}'s profiel bestaat.`,
    "",
    "Maak een verhaal:",
    opts.generateUrl,
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
