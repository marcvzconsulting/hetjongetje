import { bodyParagraph, wrapEditorialEmail } from "../layout";

type NewsletterWelcomeMail = {
  name?: string | null;
  unsubscribeUrl: string;
};

export function buildNewsletterWelcomeMail(opts: NewsletterWelcomeMail): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = opts.name ? `Hallo ${opts.name},` : "Hallo,";
  const subject = "Welkom op de Ons Verhaaltje-nieuwsbrief";

  const html = wrapEditorialEmail({
    preheader:
      "Bedankt voor je aanmelding. Af en toe een update, geen spam, beloofd.",
    title: subject,
    heading: "Je staat op de lijst",
    body:
      bodyParagraph(greeting) +
      bodyParagraph(
        "Bedankt voor je aanmelding op de nieuwsbrief van Ons Verhaaltje. We sturen niet vaak iets, en altijd alleen als we echt iets te vertellen hebben: een nieuwe functie, een seizoens-tip voor het voorlezen, een mooi verhaal van een lezer."
      ) +
      bodyParagraph(
        `Geen zin meer? Dat kan altijd. Klik <a href="${opts.unsubscribeUrl}" style="color:inherit;">hier om je direct uit te schrijven</a>. Eén klik, geen vragen.`
      ),
    footerNote: `Wil je je later afmelden? Je kunt deze mail bewaren — de uitschrijflink blijft werken.`,
  });

  const text = [
    greeting,
    "",
    "Bedankt voor je aanmelding op de nieuwsbrief van Ons Verhaaltje. We sturen niet vaak iets, en altijd alleen als we echt iets te vertellen hebben.",
    "",
    "Geen zin meer? Klik op deze link om je direct uit te schrijven:",
    opts.unsubscribeUrl,
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
