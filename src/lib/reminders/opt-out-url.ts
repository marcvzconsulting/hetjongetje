import { buildAppUrl } from "@/lib/url";
import { signReminderOptOutToken } from "@/lib/newsletter/unsubscribe-token";

/**
 * Build the signed retention-reminder opt-out link that goes into every
 * reminder e-mail. The HMAC token means the link only works for links we
 * generated — knowing a bare user id is no longer enough to opt someone
 * out. Uses the request-derived app URL (fine here: no account-takeover
 * risk, and the token is bound to AUTH_SECRET regardless of host).
 */
export async function buildReminderOptOutUrl(userId: string): Promise<string> {
  const token = signReminderOptOutToken(userId);
  return buildAppUrl(
    `/api/reminders/opt-out?user_id=${encodeURIComponent(userId)}&token=${token}`,
  );
}
