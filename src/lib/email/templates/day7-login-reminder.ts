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
  subject: "{{childName}}'s eerste verhaal is klaar voor je",
  heading: "We missen je",
  paragraphs: [
    "Hallo {{name}},",
    "Het is even geleden dat we je zagen. {{childName}} wacht op het eerste verhaal — persoonlijk geschreven, met alles wat jij over je kind hebt verteld.",
    "Minder dan een minuut om in te loggen en het verhaal te lezen. Kom je terug?",
  ],
  ctaLabel: "Inloggen",
  footerNote: "Dit is een eenmalige reminder. Wil je geen mails meer? Klik op afmelden.",
};

export function day7LoginReminderDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildDay7LoginReminderMail(
  opts: ReminderMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "day7-login-reminder",
    DEFAULTS,
    {
      name: opts.name,
      childName: opts.childName,
      dashboardUrl: opts.dashboardUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    },
    {
      preheader: "We missen {{childName}}'s eerste verhaal.",
      ctaUrl: opts.dashboardUrl,
    },
  );
}
