import { bodyParagraph, wrapEditorialEmail } from "../layout";

type ContactFormMail = {
  fromName: string;
  fromEmail: string;
  message: string;
  /** Submitter's IP (for abuse tracing only, never shown). */
  ip?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMessage(message: string): string {
  return message
    .split(/\n{2,}/)
    .map((para) => bodyParagraph(escapeHtml(para).replace(/\n/g, "<br />")))
    .join("");
}

export function buildContactFormMail(opts: ContactFormMail): {
  subject: string;
  html: string;
  text: string;
  replyTo: { email: string; name: string };
} {
  const subject = `Contactformulier: bericht van ${opts.fromName}`;

  const html = wrapEditorialEmail({
    preheader: `${opts.fromName} (${opts.fromEmail}) stuurde een bericht via het contactformulier.`,
    title: subject,
    heading: "Nieuw contactbericht",
    body:
      bodyParagraph(
        `<strong>Van:</strong> ${escapeHtml(opts.fromName)} &lt;${escapeHtml(
          opts.fromEmail
        )}&gt;`
      ) +
      `<hr style="border:0;border-top:1px solid #e2d7c2;margin:24px 0;" />` +
      renderMessage(opts.message),
    footerNote: opts.ip
      ? `Verstuurd vanaf IP ${escapeHtml(opts.ip)}.`
      : undefined,
  });

  const text = [
    `Nieuw bericht via het contactformulier.`,
    ``,
    `Van: ${opts.fromName} <${opts.fromEmail}>`,
    opts.ip ? `IP: ${opts.ip}` : null,
    ``,
    `---`,
    ``,
    opts.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject,
    html,
    text,
    replyTo: { email: opts.fromEmail, name: opts.fromName },
  };
}
