import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type ReminderMail = {
  name: string;
  /** Directe deeplink naar de profielwizard. */
  profileUrl: string;
  /** Unsubscribe-link voor onderaan (verplicht omdat dit een marketing-
   *  achtige mail is, geen pure transactionele bevestiging). */
  unsubscribeUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "Maak je profiel af — dan kan je eerste verhaal komen",
  heading: "Nog één stap voor het eerste verhaal",
  paragraphs: [
    "Hallo {{name}},",
    "Je hebt een paar dagen geleden een account aangemaakt bij Ons Verhaaltje, maar nog geen kindprofiel ingevuld. Zonder profiel kunnen we geen persoonlijk verhaal maken.",
    "Vul het profiel in en in 5 minuten staat het eerste verhaal klaar — met de naam, de knuffel en de mensen om je kind heen.",
  ],
  ctaLabel: "Profiel afmaken",
  footerNote:
    "Dit is een eenmalige reminder. Wil je geen mails meer? Klik op afmelden hieronder.",
};

export function profileIncompleteReminderDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildProfileIncompleteReminderMail(
  opts: ReminderMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "profile-incomplete-reminder",
    DEFAULTS,
    {
      name: opts.name,
      profileUrl: opts.profileUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    },
    {
      preheader: "Een paar minuten en je eerste verhaal staat klaar.",
      ctaUrl: opts.profileUrl,
    },
  );
}
