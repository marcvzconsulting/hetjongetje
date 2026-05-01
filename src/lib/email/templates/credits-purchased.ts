import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type CreditsPurchasedMail = {
  name: string;
  /** How many credits the user just bought. */
  creditAmount: number;
  /** Total paid in cents — formatted as "12,00" inside the body. */
  amountCents: number;
  /** VAT rate as integer percent (21 / 9). Shown on the receipt line. */
  vatRate: number;
  dashboardUrl: string;
  /** Internal order id, shown small at the bottom for reference. */
  orderId: string;
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function buildCreditsPurchasedMail(opts: CreditsPurchasedMail): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Bevestiging — ${opts.creditAmount} ${
    opts.creditAmount === 1 ? "verhaal" : "verhalen"
  } toegevoegd`;
  const safeName = escapeHtml(opts.name);
  const amountStr = eurosFromCents(opts.amountCents);
  // Compute VAT split for the receipt line. Mollie processes a gross
  // amount; we present the split to keep the consumer-side bookkeeping
  // transparent (and ours).
  const grossCents = opts.amountCents;
  const netCents = Math.round(grossCents / (1 + opts.vatRate / 100));
  const vatCents = grossCents - netCents;

  const html = wrapEditorialEmail({
    preheader: `Je credits staan klaar. €${amountStr} ontvangen.`,
    title: subject,
    heading: "Bedankt voor je bestelling",
    body:
      bodyParagraph(`Hallo ${safeName},`) +
      bodyParagraph(
        `We hebben je betaling van <strong>€${amountStr}</strong> ontvangen. ${opts.creditAmount} ${
          opts.creditAmount === 1 ? "verhaal" : "verhalen"
        } staat ${opts.creditAmount === 1 ? "klaar" : "klaar"} op je account — je kunt direct beginnen.`,
      ) +
      `<hr style="border:0;border-top:1px solid #e2d7c2;margin:24px 0;" />` +
      bodyParagraph(
        `<strong>Specificatie</strong><br />` +
          `Subtotaal (excl. BTW): €${eurosFromCents(netCents)}<br />` +
          `BTW (${opts.vatRate}%): €${eurosFromCents(vatCents)}<br />` +
          `<strong>Totaal: €${amountStr}</strong>`,
      ) +
      bodyParagraph(
        "Credits verlopen niet, dus je kunt ze rustig opmaken op het tempo dat bij jullie avond past.",
      ),
    cta: { label: "Naar je verhalen", url: opts.dashboardUrl },
    footerNote: `Bestelnummer: ${escapeHtml(opts.orderId)}`,
  });

  const text = [
    `Hallo ${opts.name},`,
    "",
    `We hebben je betaling van €${amountStr} ontvangen. ${opts.creditAmount} ${
      opts.creditAmount === 1 ? "verhaal staat" : "verhalen staan"
    } klaar op je account.`,
    "",
    `Subtotaal (excl. BTW): €${eurosFromCents(netCents)}`,
    `BTW (${opts.vatRate}%):    €${eurosFromCents(vatCents)}`,
    `Totaal:                   €${amountStr}`,
    "",
    "Credits verlopen niet, dus je kunt ze rustig opmaken.",
    "",
    "Naar je verhalen:",
    opts.dashboardUrl,
    "",
    `Bestelnummer: ${opts.orderId}`,
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
