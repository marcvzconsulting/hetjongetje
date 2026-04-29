"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createMagicLinkToken,
  buildMagicLinkUrl,
} from "@/lib/magic-link";
import { sendMail } from "@/lib/email/client";
import { buildMagicLinkMail } from "@/lib/email/templates/magic-link";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit/api-rate-limit";

const LIFETIME_MINUTES = 15;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Request a magic-link login email. Same anti-enumeration pattern as
 * the password-reset flow: we always redirect to the "sent" page,
 * regardless of whether the email exists or whether the rate-limit
 * was hit. The actual mail is only sent for real accounts.
 */
export async function requestMagicLinkAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/login?error=missing_email");
  }

  const ip = await getClientIp();
  const ipLimit = await rateLimit({
    key: `magic-link-ip:${ip}`,
    ...RATE_LIMITS.passwordResetIp,
  });
  if (!ipLimit.allowed) {
    redirect("/login?magic=sent");
  }
  const emailLimit = await rateLimit({
    key: `magic-link-email:${email}`,
    ...RATE_LIMITS.passwordResetEmail,
  });
  if (!emailLimit.allowed) {
    redirect("/login?magic=sent");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const { token } = await createMagicLinkToken(user.id);
    const url = await buildMagicLinkUrl(token);
    const mail = buildMagicLinkMail({
      name: user.name,
      loginUrl: url,
      lifetimeMinutes: LIFETIME_MINUTES,
    });
    try {
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["magic-link"],
      });
    } catch (err) {
      // Don't leak failures to the client — same anti-enumeration rule
      // as forgot-password. Log only the user id, never the link itself
      // (single-use bearer token, must not end up in runtime logs).
      console.error(
        `[magic-link] Send failed for user ${user.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  redirect("/login?magic=sent");
}
