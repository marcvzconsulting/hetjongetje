import { bodyParagraph, wrapEditorialEmail } from "../layout";
import { escapeHtml } from "../escape";

type AdminNewSignupMail = {
  userName: string;
  userEmail: string;
  createdAt: Date;
  reviewUrl: string;
};

function formatDateTime(date: Date): string {
  return date.toLocaleString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildAdminNewSignupMail(opts: AdminNewSignupMail): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Nieuwe aanmelding: ${opts.userName}`;

  const html = wrapEditorialEmail({
    preheader: `${opts.userName} (${opts.userEmail}) wacht op goedkeuring.`,
    title: subject,
    heading: "Nieuwe aanvraag",
    body:
      bodyParagraph(
        `Er heeft zich zojuist een nieuwe gebruiker aangemeld. Die staat op <em>pending</em> en wacht op jouw goedkeuring.`
      ) +
      `<hr style="border:0;border-top:1px solid #e2d7c2;margin:24px 0;" />` +
      bodyParagraph(
        `<strong>Naam:</strong> ${escapeHtml(opts.userName)}<br />` +
          `<strong>E-mail:</strong> ${escapeHtml(opts.userEmail)}<br />` +
          `<strong>Aangemeld op:</strong> ${escapeHtml(formatDateTime(opts.createdAt))}`
      ),
    cta: { label: "Bekijk in admin", url: opts.reviewUrl },
    footerNote:
      "Je ontvangt deze mail omdat we nog in de testfase zitten en elke nieuwe aanmelding handmatig goedkeuren.",
  });

  const text = [
    "Nieuwe aanmelding wacht op goedkeuring.",
    "",
    `Naam:       ${opts.userName}`,
    `E-mail:     ${opts.userEmail}`,
    `Aangemeld:  ${formatDateTime(opts.createdAt)}`,
    "",
    "Bekijk in admin:",
    opts.reviewUrl,
  ].join("\n");

  return { subject, html, text };
}
