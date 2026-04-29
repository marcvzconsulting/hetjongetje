/**
 * Brevo transactional email client. Uses the REST API directly via fetch
 * so we don't pull in the heavy official SDK.
 *
 * When BREVO_API_KEY is absent the helper falls back to console-logging the
 * mail contents so local development works without real credentials.
 */

type SendMailOpts = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  /** Override the Reply-To (defaults to info@onsverhaaltje.nl). */
  replyTo?: { email: string; name?: string };
  /** Brevo tags (visible in dashboard analytics). */
  tags?: string[];
};

const SENDER = { name: "Ons Verhaaltje", email: "info@onsverhaaltje.nl" };

export async function sendMail(opts: SendMailOpts): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    // Only print the full payload in local development. In any deployed
    // environment we'd be writing recipient emails, names, and (for
    // reset/welcome flows) tokens straight into Vercel runtime logs.
    console.log("[email] BREVO_API_KEY not set — skipping send");
    if (process.env.NODE_ENV === "development") {
      console.log(`[email]   to: ${opts.toName ? `${opts.toName} <${opts.to}>` : opts.to}`);
      console.log(`[email]   subject: ${opts.subject}`);
      console.log(`[email]   text:\n${opts.text}`);
    }
    return;
  }

  const payload = {
    sender: SENDER,
    to: [opts.toName ? { email: opts.to, name: opts.toName } : { email: opts.to }],
    replyTo: opts.replyTo ?? { email: SENDER.email, name: SENDER.name },
    subject: opts.subject,
    htmlContent: opts.html,
    textContent: opts.text,
    tags: opts.tags,
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}
