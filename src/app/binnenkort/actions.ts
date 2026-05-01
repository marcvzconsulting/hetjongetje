"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { sendMail } from "@/lib/email/client";
import { buildContactFormMail } from "@/lib/email/templates/contact-form";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_MESSAGE = "(geen bericht achtergelaten)";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Server action for the "boekje binnenkort" interest form. Mirrors the
 * /contact flow (same rate limiting, same email pipeline) but:
 *   - message is optional (people often just want a notification),
 *   - redirects stay on /binnenkort,
 *   - the email subject is prefixed so support sees this came from the
 *     book-coming-soon page rather than the general contact channel.
 */
export async function submitBinnenkortAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const messageRaw = String(formData.get("message") ?? "").trim();
  const honeypot = String(formData.get("website") ?? "").trim();

  // Bots typically fill every visible-looking field; play dead.
  if (honeypot) {
    redirect("/binnenkort?sent=1");
  }

  if (!name || !email) {
    redirect("/binnenkort?error=missing");
  }
  if (!EMAIL_RE.test(email)) {
    redirect("/binnenkort?error=email");
  }
  if (messageRaw.length > 5000) {
    redirect("/binnenkort?error=long");
  }

  const ip = await getClientIp();
  const limit = await rateLimit({
    key: `binnenkort-form:${ip}`,
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!limit.allowed) {
    redirect("/binnenkort?error=ratelimit");
  }

  const message = messageRaw || NO_MESSAGE;
  const mail = buildContactFormMail({
    fromName: `[boekje-binnenkort] ${name}`,
    fromEmail: email,
    message,
    ip,
  });

  try {
    await sendMail({
      to: "info@onsverhaaltje.nl",
      toName: "Ons Verhaaltje",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
      tags: ["binnenkort-interest"],
    });
  } catch (err) {
    console.error("[binnenkort] send failed", err);
    redirect("/binnenkort?error=send");
  }

  redirect("/binnenkort?sent=1");
}
