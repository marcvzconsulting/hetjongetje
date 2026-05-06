import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type AccountApprovedMail = {
  name: string;
  /** Credits on the account at approval time — flowed into the body
   *  copy via the {{credits}} variable. */
  credits: number;
  dashboardUrl: string;
};

const DEFAULTS: TemplateContent = {
  subject: "Welkom — je account is geactiveerd",
  heading: "Je account is klaar",
  paragraphs: [
    "Hallo {{name}},",
    "We hebben je account goedgekeurd — welkom bij Ons Verhaaltje. Er staan <strong>{{credits}} verhalen</strong> klaar om mee te beginnen.",
    "Vul het profiel van je kindje in (naam, leeftijd, knuffel, kleine details) en kies dan vanavond een aanleiding. Wij maken er een verhaal van.",
    "Drie minuten en je hebt iets om voor te lezen waar zij of hij zichzelf in herkent.",
  ],
  ctaLabel: "Maak het eerste verhaal",
  footerNote:
    "Vragen of werkt iets niet zoals verwacht? Beantwoord deze mail dan kijken we mee.",
};

export function accountApprovedDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildAccountApprovedMail(
  opts: AccountApprovedMail,
): Promise<TemplateRender> {
  return renderEditableTemplate("account-approved", DEFAULTS, opts, {
    ctaUrl: opts.dashboardUrl,
    preheader: "Je profiel is goedgekeurd. Maak het eerste verhaal.",
  });
}
