import {
  renderEditableTemplate,
  type TemplateContent,
  type TemplateRender,
} from "../template-store";

type AccountDeletionRequestedMail = {
  name: string;
  /** Moment waarop het account definitief gewist wordt (aanvraag + 30 dagen). */
  deleteAt: Date;
  /** Link naar /verwijdering — na inloggen staat daar de herstelknop. */
  restoreUrl: string;
};

function formatDateNl(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DEFAULTS: TemplateContent = {
  subject: "Je account wordt over 30 dagen verwijderd",
  heading: "We hebben je verwijderverzoek ontvangen",
  paragraphs: [
    "Hallo {{name}},",
    "Je hebt gevraagd om je account bij Ons Verhaaltje te verwijderen. Dat vinden we jammer, maar we regelen het netjes voor je.",
    "Op <strong>{{deleteAtFormatted}}</strong> wissen we je account definitief — inclusief alle kindprofielen, foto's, verhalen en boekjes. Tot die tijd staat je account op slot en sturen we je geen mails meer.",
    "Bedenk je je? Log dan gewoon in en klik op <strong>&ldquo;Herstel mijn account&rdquo;</strong> — daarmee annuleer je de verwijdering en staat alles er weer zoals je het achterliet.",
    "Heb je dit niet zelf aangevraagd? Log dan in om je account te herstellen en wijzig daarna meteen je wachtwoord.",
  ],
  ctaLabel: "Herstel mijn account",
  footerNote:
    "Vragen over de verwijdering of je gegevens? Antwoord op deze mail, dan kijken we mee.",
};

export function accountDeletionRequestedDefaults(): TemplateContent {
  return DEFAULTS;
}

export async function buildAccountDeletionRequestedMail(
  opts: AccountDeletionRequestedMail,
): Promise<TemplateRender> {
  return renderEditableTemplate(
    "account-deletion-requested",
    DEFAULTS,
    {
      name: opts.name,
      deleteAtFormatted: formatDateNl(opts.deleteAt),
      restoreUrl: opts.restoreUrl,
    },
    {
      ctaUrl: opts.restoreUrl,
      preheader: `Definitieve verwijdering op ${formatDateNl(opts.deleteAt)} — inloggen annuleert het verzoek.`,
    },
  );
}
