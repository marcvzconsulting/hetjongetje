import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

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

export function buildSubscriptionCancelledMail(
  opts: SubscriptionCancelledMail,
): { subject: string; html: string; text: string } {
  const subject = `Je abonnement is opgezegd — bevestiging`;
  const safeName = escapeHtml(opts.name);
  const safePlan = escapeHtml(opts.planName);

  const accessLine = opts.endsAt
    ? `Je behoudt toegang tot <strong>${escapeHtml(formatDateNl(opts.endsAt))}</strong>. Tot die datum kun je gewoon verhalen blijven maken — daarna stopt het abonnement automatisch.`
    : "Je behoudt toegang tot het einde van de lopende periode. Daarna stopt het abonnement automatisch.";

  const html = wrapEditorialEmail({
    preheader: opts.endsAt
      ? `Toegang loopt door tot ${formatDateNl(opts.endsAt)}.`
      : "Geen toekomstige incasso's meer ingepland.",
    title: subject,
    heading: "Je abonnement is opgezegd",
    body:
      bodyParagraph(`Hallo ${safeName},`) +
      bodyParagraph(
        `We hebben je opzegging van het <strong>${safePlan}</strong>-abonnement ontvangen. Er worden geen nieuwe bedragen meer afgeschreven.`,
      ) +
      bodyParagraph(accessLine) +
      bodyParagraph(
        "Reeds gegenereerde verhalen blijven natuurlijk in je bibliotheek staan, ook nadat je abonnement is afgelopen.",
      ) +
      bodyParagraph(
        `Mocht je later toch terug willen komen, dan kun je elk moment opnieuw een abonnement starten — je oude verhalen staan dan nog gewoon voor je klaar.`,
      ),
    cta: { label: "Opnieuw abonneren", url: opts.subscribeUrl },
    footerNote:
      "Heb je per ongeluk opgezegd of vragen over de afhandeling? Antwoord op deze mail dan kijken we mee.",
  });

  const text = [
    `Hallo ${opts.name},`,
    "",
    `We hebben je opzegging van het ${opts.planName}-abonnement ontvangen. Er worden geen nieuwe bedragen meer afgeschreven.`,
    "",
    opts.endsAt
      ? `Je behoudt toegang tot ${formatDateNl(opts.endsAt)}. Daarna stopt het abonnement automatisch.`
      : "Je behoudt toegang tot het einde van de lopende periode. Daarna stopt het abonnement automatisch.",
    "",
    "Reeds gegenereerde verhalen blijven in je bibliotheek staan, ook na afloop.",
    "",
    "Wil je later terugkomen? Je kunt elk moment opnieuw abonneren via:",
    opts.subscribeUrl,
    "",
    "Je account:",
    opts.accountUrl,
    "",
    "— Ons Verhaaltje",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
