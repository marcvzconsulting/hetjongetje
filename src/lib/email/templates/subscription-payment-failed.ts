import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";
import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type SubscriptionPaymentFailedMail = {
  name: string;
  planName: string;
  /** Einde van de al betaalde periode — tot die datum blijft de
   *  toegang gewoon werken. */
  endsAt: Date | null;
  accountUrl: string;
};

function formatDateNl(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DEFAULTS: TemplateContent = {
  subject: "De incasso van je abonnement is mislukt",
  heading: "De incasso is niet gelukt",
  paragraphs: [
    "Hallo {{name}},",
    "De automatische incasso voor je <strong>{{planName}}</strong>-abonnement is helaas mislukt. Dat kan gebeuren door onvoldoende saldo, een verlopen kaart of een stornering bij de bank.",
    "We proberen het binnenkort automatisch opnieuw. Je hoeft meestal niets te doen, maar controleer voor de zekerheid even je rekening of betaalmethode.",
    "Je toegang blijft gewoon werken tot <strong>{{endsAtFormatted}}</strong>. Lukt de incasso daarna nog steeds niet, dan worden er geen nieuwe verhalen-credits meer toegevoegd.",
    "Vragen, of wil je je betaalgegevens wijzigen? Antwoord op deze mail, dan helpen we je verder.",
  ],
  ctaLabel: "Naar mijn account",
  footerNote:
    "Is het bedrag inmiddels toch afgeschreven? Dan kun je deze mail negeren, de status wordt automatisch bijgewerkt.",
};

export function subscriptionPaymentFailedDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildSubscriptionPaymentFailedMail(
  opts: SubscriptionPaymentFailedMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "subscription-payment-failed",
    DEFAULTS,
    {
      name: opts.name,
      planName: opts.planName,
      endsAtFormatted: opts.endsAt
        ? formatDateNl(opts.endsAt)
        : "het einde van de lopende periode",
      accountUrl: opts.accountUrl,
    },
    {
      ctaUrl: opts.accountUrl,
      preheader: "We proberen het binnenkort opnieuw, je toegang blijft voorlopig gewoon werken.",
    },
  );
}

// ── Admin-notificatie (ops) ─────────────────────────────────────────

type AdminSubscriptionPaymentFailedMail = {
  userName: string;
  userEmail: string;
  planName: string;
  /** Mollie payment-status die binnenkwam ("failed" | "expired" | "cancelled"). */
  paymentStatus: string;
  endsAt: Date | null;
  adminUrl: string;
};

export function buildAdminSubscriptionPaymentFailedMail(
  opts: AdminSubscriptionPaymentFailedMail,
): { subject: string; html: string; text: string } {
  const subject = `Incasso mislukt: ${opts.userName} (${opts.planName})`;
  const endsAtStr = opts.endsAt ? formatDateNl(opts.endsAt) : "onbekend";

  const html = wrapEditorialEmail({
    preheader: `Verlenging van ${opts.userEmail} kwam binnen als "${opts.paymentStatus}".`,
    title: subject,
    heading: "Incasso mislukt",
    body:
      bodyParagraph(
        `Een terugkerende abonnementsbetaling is niet gelukt. Het abonnement staat nu op <strong>past_due</strong>; Mollie probeert het doorgaans zelf opnieuw.`,
      ) +
      `<hr style="border:0;border-top:1px solid #e2d7c2;margin:24px 0;" />` +
      bodyParagraph(
        `<strong>Klant:</strong> ${escapeHtml(opts.userName)} (${escapeHtml(opts.userEmail)})<br />` +
          `<strong>Plan:</strong> ${escapeHtml(opts.planName)}<br />` +
          `<strong>Betaalstatus:</strong> ${escapeHtml(opts.paymentStatus)}<br />` +
          `<strong>Toegang tot:</strong> ${escapeHtml(endsAtStr)}`,
      ),
    cta: { label: "Bekijk klant in admin", url: opts.adminUrl },
    footerNote:
      "Je ontvangt deze mail als ops-notificatie bij elke mislukte incasso.",
  });

  const text = [
    "Incasso mislukt — abonnement staat op past_due.",
    "",
    `Klant:        ${opts.userName} (${opts.userEmail})`,
    `Plan:         ${opts.planName}`,
    `Betaalstatus: ${opts.paymentStatus}`,
    `Toegang tot:  ${endsAtStr}`,
    "",
    "Bekijk klant in admin:",
    opts.adminUrl,
  ].join("\n");

  return { subject, html, text };
}
