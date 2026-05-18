import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type NewsletterUnsubscribedMail = {
  name?: string | null;
  email: string;
  /** Bestemming van de "Schrijf me weer in"-knop. Voor account-houders
   *  is dat `/account#newsletter`; voor losse signups de homepage met
   *  het footer-formulier. Caller bepaalt. */
  resubscribeUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "Je bent uitgeschreven van de nieuwsbrief",
  heading: "Geen mails meer van ons",
  paragraphs: [
    "Hallo {{name}},",
    "Je staat niet langer op de nieuwsbrief van Ons Verhaaltje. We sturen je vanaf nu geen updates of seizoens-tips meer.",
    "Heb je je bedacht? Klik op de knop hieronder om je weer aan te melden — één klik en je staat er weer bij.",
  ],
  ctaLabel: "Schrijf me weer in",
  footerNote:
    "Deze mail wordt eenmalig verstuurd ter bevestiging. Geen actie nodig.",
};

export function newsletterUnsubscribedDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildNewsletterUnsubscribedMail(
  opts: NewsletterUnsubscribedMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "newsletter-unsubscribed",
    DEFAULTS,
    {
      name: opts.name ?? "",
      email: opts.email,
      resubscribeUrl: opts.resubscribeUrl,
    },
    {
      preheader: "Bevestiging dat je bent uitgeschreven — geen actie nodig.",
      ctaUrl: opts.resubscribeUrl,
    },
  );
}
