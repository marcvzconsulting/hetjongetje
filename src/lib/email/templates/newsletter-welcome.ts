import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type NewsletterWelcomeMail = {
  name?: string | null;
  email: string;
  unsubscribeUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "Welkom op de Ons Verhaaltje-nieuwsbrief",
  heading: "Je staat op de lijst",
  paragraphs: [
    "Hallo {{name}},",
    "Bedankt voor je aanmelding op de nieuwsbrief van Ons Verhaaltje. We sturen niet vaak iets, en altijd alleen als we echt iets te vertellen hebben: een nieuwe functie, een seizoens-tip voor het voorlezen, een mooi verhaal van een lezer.",
    `Geen zin meer? Dat kan altijd. Klik <a href="{{unsubscribeUrl}}" style="color:inherit;">hier om je direct uit te schrijven</a>. Eén klik, geen vragen.`,
  ],
  footerNote:
    "Wil je je later afmelden? Je kunt deze mail bewaren — de uitschrijflink blijft werken.",
};

export function newsletterWelcomeDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildNewsletterWelcomeMail(
  opts: NewsletterWelcomeMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "newsletter-welcome",
    DEFAULTS,
    {
      name: opts.name ?? "",
      email: opts.email,
      unsubscribeUrl: opts.unsubscribeUrl,
    },
    {
      preheader:
        "Bedankt voor je aanmelding. Af en toe een update, geen spam, beloofd.",
    },
  );
}
