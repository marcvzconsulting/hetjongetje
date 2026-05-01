import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

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

export function buildSubscriptionStartedMail(opts: SubscriptionStartedMail): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Je abonnement is actief — ${opts.planName}`;
  const safeName = escapeHtml(opts.name);
  const safePlan = escapeHtml(opts.planName);
  const safeInterval = escapeHtml(intervalToDutch(opts.interval));

  const amountStr = eurosFromCents(opts.amountCents);
  const grossCents = opts.amountCents;
  const netCents = Math.round(grossCents / (1 + opts.vatRate / 100));
  const vatCents = grossCents - netCents;

  const nextChargeLine = opts.nextChargeAt
    ? `Volgende automatische incasso: <strong>${escapeHtml(formatDateNl(opts.nextChargeAt))}</strong>.`
    : `Volgende incasso: ${safeInterval}.`;

  const creditLine =
    opts.creditsPerInterval && opts.creditsPerInterval > 0
      ? `<strong>${opts.creditsPerInterval} ${
          opts.creditsPerInterval === 1 ? "verhaal" : "verhalen"
        }</strong> per periode staan op je tegoed. Bij elke automatische incasso wordt je saldo opnieuw aangevuld.`
      : `Je hebt nu toegang tot je abonnement.`;

  const html = wrapEditorialEmail({
    preheader: `Eerste betaling van €${amountStr} ontvangen. Volgende incasso ${safeInterval}.`,
    title: subject,
    heading: "Je abonnement is actief",
    body:
      bodyParagraph(`Hallo ${safeName},`) +
      bodyParagraph(
        `We hebben je eerste betaling van <strong>€${amountStr}</strong> ontvangen voor het ${safePlan}-abonnement. ${creditLine}`,
      ) +
      bodyParagraph(
        `Vanaf nu wordt het bedrag <strong>${safeInterval}</strong> automatisch afgeschreven, zonder dat je iets hoeft te doen. ${nextChargeLine}`,
      ) +
      bodyParagraph(
        "Wil je opzeggen? Dat kan elk moment via je account-pagina. Je behoudt toegang tot het einde van de lopende periode.",
      ) +
      `<hr style="border:0;border-top:1px solid #e2d7c2;margin:24px 0;" />` +
      bodyParagraph(
        `<strong>Specificatie eerste betaling</strong><br />` +
          `Subtotaal (excl. BTW): €${eurosFromCents(netCents)}<br />` +
          `BTW (${opts.vatRate}%): €${eurosFromCents(vatCents)}<br />` +
          `<strong>Totaal: €${amountStr}</strong>`,
      ),
    cta: { label: "Naar je account", url: opts.accountUrl },
    footerNote: `Abonnement-id: ${escapeHtml(opts.subscriptionMollieId)}`,
  });

  const text = [
    `Hallo ${opts.name},`,
    "",
    `Je eerste betaling van €${amountStr} voor het ${opts.planName}-abonnement is ontvangen.`,
    "",
    opts.creditsPerInterval && opts.creditsPerInterval > 0
      ? `${opts.creditsPerInterval} ${
          opts.creditsPerInterval === 1 ? "verhaal staat" : "verhalen staan"
        } op je tegoed; deze wordt elke periode aangevuld.`
      : "Je hebt nu toegang tot je abonnement.",
    "",
    `Vanaf nu wordt het bedrag ${intervalToDutch(opts.interval)} automatisch afgeschreven.`,
    opts.nextChargeAt
      ? `Volgende incasso: ${formatDateNl(opts.nextChargeAt)}.`
      : "",
    "",
    "Opzeggen kan elk moment via je account.",
    "",
    `Subtotaal (excl. BTW): €${eurosFromCents(netCents)}`,
    `BTW (${opts.vatRate}%):    €${eurosFromCents(vatCents)}`,
    `Totaal:                   €${amountStr}`,
    "",
    "Naar je account:",
    opts.accountUrl,
    "",
    `Abonnement-id: ${opts.subscriptionMollieId}`,
    "",
    "— Ons Verhaaltje",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
