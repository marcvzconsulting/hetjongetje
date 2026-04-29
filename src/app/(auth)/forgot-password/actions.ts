"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createPasswordResetToken,
  buildResetUrl,
} from "@/lib/password-reset";
import { sendMail } from "@/lib/email/client";
import { buildPasswordResetMail } from "@/lib/email/templates/password-reset";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit/api-rate-limit";

const USER_LIFETIME_HOURS = 1;

async function getClientIp(): Promise<string> {
  const h = await headers();
  // Vercel proxies the real client IP via x-forwarded-for; first entry
  // is the original client. Fall back to a stable bucket if unset.
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function requestResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?error=missing");
  }

  // Rate-limit by IP first (defends against email enumeration scanning)
  // and by email second (mailbox-flood prevention). On any limit hit we
  // pretend the request succeeded — same response as the unknown-email
  // path — so an attacker can't tell limits from valid lookups.
  const ip = await getClientIp();
  const ipLimit = await rateLimit({
    key: `password-reset-ip:${ip}`,
    ...RATE_LIMITS.passwordResetIp,
  });
  if (!ipLimit.allowed) {
    redirect("/forgot-password?sent=1");
  }
  const emailLimit = await rateLimit({
    key: `password-reset-email:${email}`,
    ...RATE_LIMITS.passwordResetEmail,
  });
  if (!emailLimit.allowed) {
    redirect("/forgot-password?sent=1");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // We intentionally always redirect to the "sent" state so we don't leak
  // which emails have accounts.
  if (user) {
    const { token } = await createPasswordResetToken({ userId: user.id });
    const url = await buildResetUrl(token);

    const mail = buildPasswordResetMail({
      name: user.name,
      resetUrl: url,
      lifetimeHours: USER_LIFETIME_HOURS,
    });

    try {
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["password-reset"],
      });
    } catch (err) {
      // Don't leak failures to the client. We deliberately do NOT log the
      // email or the reset URL: both are PII / single-use credentials that
      // would land in Vercel runtime logs (not Sentry — those are scrubbed).
      // If a mail provider outage means a user can't reset, an admin can
      // generate a fresh link from /admin/users/<id>.
      console.error(
        `[password-reset] Send failed for user ${user.id}`,
        err instanceof Error ? err.message : err
      );
    }
  }

  redirect("/forgot-password?sent=1");
}
