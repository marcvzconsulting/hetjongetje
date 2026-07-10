import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type ReminderMail = {
  name: string;
  profileUrl: string;
  unsubscribeUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "Klaar voor het eerste verhaal?",
  heading: "Je account staat klaar",
  paragraphs: [
    "Hallo {{name}},",
    "Je hebt zojuist een account aangemaakt bij Ons Verhaaltje. Super! De volgende stap: vertel ons even wie je kind is.",
    "Met een paar gegevens (naam, leeftijd, favoriete dingen) maken wij straks een uniek verhaal speciaal voor jouw kind.",
  ],
  ctaLabel: "Profiel maken",
  footerNote: "Dit is een eenmalige reminder. Wil je geen mails meer? Klik op afmelden.",
};

export function day1ProfileReminderDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildDay1ProfileReminderMail(
  opts: ReminderMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "day1-profile-reminder",
    DEFAULTS,
    {
      name: opts.name,
      profileUrl: opts.profileUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    },
    {
      preheader: "Vertel ons over je kind — het eerste verhaal volgt snel.",
      ctaUrl: opts.profileUrl,
    },
  );
}
