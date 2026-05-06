import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type CreditsPurchasedMail = {
  name: string;
  /** How many credits the user just bought — used in subject and copy. */
  creditAmount: number;
  /** Total paid in cents. */
  amountCents: number;
  /** VAT rate as integer percent (21 / 9). */
  vatRate: number;
  dashboardUrl: string;
  /** Internal order id, shown small at the bottom for reference. */
  orderId: string;
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const DEFAULTS: TemplateContent = {
  subject: "Bevestiging — {{creditAmount}} verhalen toegevoegd",
  heading: "Bedankt voor je bestelling",
  paragraphs: [
    "Hallo {{name}},",
    "We hebben je betaling van <strong>€{{amountFormatted}}</strong> ontvangen. {{creditAmount}} verhalen staan klaar op je account — je kunt direct beginnen.",
    `<hr style="border:0;border-top:1px solid #e2d7c2;margin:8px 0 16px;" /><strong>Specificatie</strong><br />Subtotaal (excl. BTW): €{{netFormatted}}<br />BTW ({{vatRate}}%): €{{vatFormatted}}<br /><strong>Totaal: €{{amountFormatted}}</strong>`,
    "Credits verlopen niet, dus je kunt ze rustig opmaken op het tempo dat bij jullie avond past.",
  ],
  ctaLabel: "Naar je verhalen",
  footerNote: "Bestelnummer: {{orderId}}",
};

export function creditsPurchasedDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildCreditsPurchasedMail(
  opts: CreditsPurchasedMail,
): Promise<TemplateRender> {
  const grossCents = opts.amountCents;
  const netCents = Math.round(grossCents / (1 + opts.vatRate / 100));
  const vatCents = grossCents - netCents;

  return renderEditableTemplate(
    "credits-purchased",
    DEFAULTS,
    {
      name: opts.name,
      creditAmount: opts.creditAmount,
      amountFormatted: eurosFromCents(grossCents),
      netFormatted: eurosFromCents(netCents),
      vatFormatted: eurosFromCents(vatCents),
      vatRate: opts.vatRate,
      orderId: opts.orderId,
      dashboardUrl: opts.dashboardUrl,
    },
    {
      ctaUrl: opts.dashboardUrl,
      preheader: `Je credits staan klaar. €${eurosFromCents(grossCents)} ontvangen.`,
    },
  );
}
