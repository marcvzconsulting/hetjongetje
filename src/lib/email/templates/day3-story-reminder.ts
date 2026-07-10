import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type ReminderMail = {
  name: string;
  childName: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "{{childName}}'s eerste verhaal wacht",
  heading: "Tijd voor het eerste verhaal",
  paragraphs: [
    "Hallo {{name}},",
    "Je hebt {{childName}}'s profiel ingevuld — super! Nu kan het echte werk beginnen: het eerste personaliseerde verhaal.",
    "In minder dan een minuut heb je een uniek verhaal dat speciaal voor {{childName}} is geschreven. Klaar?",
  ],
  ctaLabel: "Verhaal maken",
  footerNote: "Dit is een eenmalige reminder. Wil je geen mails meer? Klik op afmelden.",
};

export function day3StoryReminderDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildDay3StoryReminderMail(
  opts: ReminderMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "day3-story-reminder",
    DEFAULTS,
    {
      name: opts.name,
      childName: opts.childName,
      dashboardUrl: opts.dashboardUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    },
    {
      preheader: "{{childName}} heeft een verhaal nodig.",
      ctaUrl: opts.dashboardUrl,
    },
  );
}
