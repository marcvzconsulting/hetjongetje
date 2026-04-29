import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type PasswordChangedMail = {
  name?: string | null;
  loginUrl: string;
  /** How the change happened, affects copy slightly. */
  source: "reset" | "account";
};

export function buildPasswordChangedMail(opts: PasswordChangedMail): {
  subject: string;
  html: string;
  text: string;
} {
  const greetingPlain = opts.name ? `Hallo ${opts.name},` : "Hallo,";
  const greeting = opts.name ? `Hallo ${escapeHtml(opts.name)},` : "Hallo,";
  const subject = "Je wachtwoord is gewijzigd";

  const how =
    opts.source === "reset"
      ? "via een reset-link uit je mailbox"
      : "via de account-instellingen";

  const html = wrapEditorialEmail({
    preheader:
      "Ter bevestiging: je wachtwoord is zojuist veranderd. Was jij dat niet, neem contact op.",
    title: subject,
    heading: "Je wachtwoord is veranderd",
    body:
      bodyParagraph(greeting) +
      bodyParagraph(
        `We sturen deze mail ter bevestiging: je wachtwoord voor Ons Verhaaltje is zojuist gewijzigd (${how}).`
      ) +
      bodyParagraph(
        "Was jij dit niet? Neem dan direct contact op via <a href=\"mailto:info@onsverhaaltje.nl\" style=\"color:inherit;\">info@onsverhaaltje.nl</a>, dan helpen we je het account meteen vergrendelen."
      ),
    cta: { label: "Naar inloggen", url: opts.loginUrl },
    footerNote:
      "Heb jij dit zelf gedaan? Dan hoef je niets te doen, deze mail is puur ter bevestiging.",
  });

  const text = [
    greetingPlain,
    "",
    `We sturen deze mail ter bevestiging: je wachtwoord voor Ons Verhaaltje is zojuist gewijzigd (${how}).`,
    "",
    "Was jij dit niet? Neem dan direct contact op via info@onsverhaaltje.nl, dan helpen we je het account meteen vergrendelen.",
    "",
    "Naar inloggen:",
    opts.loginUrl,
    "",
    "Heb jij dit zelf gedaan? Dan hoef je niets te doen, deze mail is puur ter bevestiging.",
    "",
    "— Ons Verhaaltje",
  ].join("\n");

  return { subject, html, text };
}
