import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type SubscriptionStartedMail = {
  name: string;
  planName: string;
  amountCents: number;
  vatRate: number;
  /** Mollie interval string ("1 month", "12 months"). */
  interval: string;
  creditsPerInterval: number | null;
  /** When the next charge happens — also the date the user keeps
   *  access to until cancellation. */
  nextChargeAt: Date | null;
  accountUrl: string;
  subscriptionMollieId: string;
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function intervalToDutch(interval: string): string {
  const lower = interval.toLowerCase().trim();
  if (lower === "1 month") return "elke maand";
  if (lower === "12 months") return "elk jaar";
  if (/^\d+\s+months?$/.test(lower)) {
    const n = parseInt(lower, 10);
    return `elke ${n} maanden`;
  }
  if (/^\d+\s+years?$/.test(lower)) {
    const n = parseInt(lower, 10);
    return n === 1 ? "elk jaar" : `elke ${n} jaar`;
  }
  return interval;
}

function formatDateNl(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DEFAULTS: TemplateContent = {
  subject: "Je abonnement is actief — {{planName}}",
  heading: "Je abonnement is actief",
  paragraphs: [
    "Hallo {{name}},",
    "We hebben je eerste betaling van <strong>€{{amountFormatted}}</strong> ontvangen voor het {{planName}}-abonnement. <strong>{{creditsPerInterval}} verhalen</strong> per periode staan op je tegoed. Bij elke automatische incasso wordt je saldo opnieuw aangevuld.",
    "Vanaf nu wordt het bedrag <strong>{{intervalNl}}</strong> automatisch afgeschreven, zonder dat je iets hoeft te doen. Volgende automatische incasso: <strong>{{nextChargeFormatted}}</strong>.",
    "Wil je opzeggen? Dat kan elk moment via je account-pagina. Je behoudt toegang tot het einde van de lopende periode.",
    `<hr style="border:0;border-top:1px solid #e2d7c2;margin:8px 0 16px;" /><strong>Specificatie eerste betaling</strong><br />Subtotaal (excl. BTW): €{{netFormatted}}<br />BTW ({{vatRate}}%): €{{vatFormatted}}<br /><strong>Totaal: €{{amountFormatted}}</strong>`,
  ],
  ctaLabel: "Naar je account",
  footerNote: "Abonnement-id: {{subscriptionMollieId}}",
};

export function subscriptionStartedDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildSubscriptionStartedMail(
  opts: SubscriptionStartedMail,
): Promise<TemplateRender> {
  const grossCents = opts.amountCents;
  const netCents = Math.round(grossCents / (1 + opts.vatRate / 100));
  const vatCents = grossCents - netCents;

  return renderEditableTemplate(
    "subscription-started",
    DEFAULTS,
    {
      name: opts.name,
      planName: opts.planName,
      amountFormatted: eurosFromCents(grossCents),
      netFormatted: eurosFromCents(netCents),
      vatFormatted: eurosFromCents(vatCents),
      vatRate: opts.vatRate,
      intervalNl: intervalToDutch(opts.interval),
      creditsPerInterval: opts.creditsPerInterval ?? "—",
      nextChargeFormatted: opts.nextChargeAt
        ? formatDateNl(opts.nextChargeAt)
        : intervalToDutch(opts.interval),
      subscriptionMollieId: opts.subscriptionMollieId,
      accountUrl: opts.accountUrl,
    },
    {
      ctaUrl: opts.accountUrl,
      preheader: `Eerste betaling van €${eurosFromCents(grossCents)} ontvangen. Volgende incasso ${intervalToDutch(opts.interval)}.`,
    },
  );
}
