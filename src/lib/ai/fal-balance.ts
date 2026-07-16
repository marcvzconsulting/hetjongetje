import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { buildAdminFalBalanceMail } from "@/lib/email/templates/admin-fal-balance";
import { getAdminNotifyEmails } from "@/lib/admin/notify";

/**
 * fal.ai-tegoedbewaking. Twee signalen:
 *  1. proactief — de cron /api/cron/fal-balance haalt dagelijks het saldo
 *     op en mailt de admin onder de drempel;
 *  2. reactief — generatie-routes herkennen de 403 "Exhausted balance"
 *     en mailen direct (met dedupe, zodat 20 mislukte generaties niet
 *     20 mails opleveren).
 *
 * Het saldo-endpoint is een alpha-API van fal (rest.alpha.fal.ai) —
 * niet formeel gedocumenteerd, dus we behandelen elke fout als
 * "saldo onbekend" en laten de app gewoon doordraaien.
 */

const BALANCE_URL = "https://rest.alpha.fal.ai/billing/user_balance";

/** Tag in het e-maillogboek; ook gebruikt voor de dedupe-query. */
export const FAL_BALANCE_MAIL_TAG = "admin-fal-balance";

/** Dollars; onder deze waarde mailt de dagelijkse cron. */
export function falBalanceThreshold(): number {
  const raw = Number(process.env.FAL_BALANCE_ALERT_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

/** Haal het saldo op (in dollars). null = niet op te vragen. */
export async function fetchFalBalance(): Promise<number | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(BALANCE_URL, {
      headers: { Authorization: `Key ${key}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const value = parseFloat((await res.text()).trim());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Herkent de fal-fout voor een leeg/geblokkeerd account. */
export function isFalBalanceError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: unknown; body?: { detail?: unknown } };
  const detail = typeof e.body?.detail === "string" ? e.body.detail : "";
  return (
    e.status === 403 &&
    (detail.includes("Exhausted balance") || detail.includes("locked"))
  );
}

/**
 * Stuur de admins direct een "tegoed is op"-mail als `err` de
 * balance-fout is. Dedupe: maximaal één zo'n mail per 12 uur, via het
 * e-maillogboek. Volledig best-effort — mag een route nooit breken.
 */
export async function maybeAlertFalBalanceExhausted(
  err: unknown,
  context: string,
): Promise<void> {
  if (!isFalBalanceError(err)) return;
  try {
    const recent = await prisma.emailLog.findFirst({
      where: {
        templateCode: FAL_BALANCE_MAIL_TAG,
        status: "sent",
        createdAt: { gte: new Date(Date.now() - 12 * 3_600_000) },
      },
      select: { id: true },
    });
    if (recent) return;

    const balance = await fetchFalBalance();
    const mail = buildAdminFalBalanceMail({
      kind: "exhausted",
      balance,
      context,
    });
    for (const to of getAdminNotifyEmails()) {
      try {
        await sendMail({
          to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          tags: [FAL_BALANCE_MAIL_TAG],
        });
      } catch (mailErr) {
        console.error(
          `[fal-balance] alert mail to ${to} failed`,
          mailErr instanceof Error ? mailErr.message : mailErr,
        );
      }
    }
  } catch (alertErr) {
    console.error("[fal-balance] alert flow failed", alertErr);
  }
}
