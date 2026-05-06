import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type SubscriptionCancelledMail = {
  name: string;
  planName: string;
  /** End of the period the user already paid for — they keep access
   *  until this date. */
  endsAt: Date | null;
  accountUrl: string;
  subscribeUrl: string;
};

function formatDateNl(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DEFAULTS: TemplateContent = {
  subject: "Je abonnement is opgezegd — bevestiging",
  heading: "Je abonnement is opgezegd",
  paragraphs: [
    "Hallo {{name}},",
    "We hebben je opzegging van het <strong>{{planName}}</strong>-abonnement ontvangen. Er worden geen nieuwe bedragen meer afgeschreven.",
    "Je behoudt toegang tot <strong>{{endsAtFormatted}}</strong>. Tot die datum kun je gewoon verhalen blijven maken — daarna stopt het abonnement automatisch.",
    "Reeds gegenereerde verhalen blijven natuurlijk in je bibliotheek staan, ook nadat je abonnement is afgelopen.",
    "Mocht je later toch terug willen komen, dan kun je elk moment opnieuw een abonnement starten — je oude verhalen staan dan nog gewoon voor je klaar.",
  ],
  ctaLabel: "Opnieuw abonneren",
  footerNote:
    "Heb je per ongeluk opgezegd of vragen over de afhandeling? Antwoord op deze mail dan kijken we mee.",
};

export function subscriptionCancelledDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildSubscriptionCancelledMail(
  opts: SubscriptionCancelledMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "subscription-cancelled",
    DEFAULTS,
    {
      name: opts.name,
      planName: opts.planName,
      endsAtFormatted: opts.endsAt
        ? formatDateNl(opts.endsAt)
        : "het einde van de lopende periode",
      accountUrl: opts.accountUrl,
      subscribeUrl: opts.subscribeUrl,
    },
    {
      ctaUrl: opts.subscribeUrl,
      preheader: opts.endsAt
        ? `Toegang loopt door tot ${formatDateNl(opts.endsAt)}.`
        : "Geen toekomstige incasso's meer ingepland.",
    },
  );
}
