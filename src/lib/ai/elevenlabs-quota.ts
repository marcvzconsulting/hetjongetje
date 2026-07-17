import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { buildAdminElevenLabsQuotaMail } from "@/lib/email/templates/admin-elevenlabs-quota";
import { getAdminNotifyEmails } from "@/lib/admin/notify";

/**
 * ElevenLabs-quotumbewaking, naar het model van de fal.ai-tegoedbewaking:
 *  1. proactief — de cron /api/cron/elevenlabs-quota checkt dagelijks het
 *     resterende tekens-quotum en mailt de admin onder de drempel;
 *  2. reactief — de audio-route herkent quota-fouten (TtsQuotaError) en
 *     mailt direct, met dedupe via het e-maillogboek.
 */

/** Tag in het e-maillogboek; ook gebruikt voor de dedupe-query. */
export const ELEVENLABS_QUOTA_MAIL_TAG = "admin-elevenlabs-quota";

export type ElevenLabsUsage = {
  /** Verbruikte tekens in de huidige periode. */
  used: number;
  /** Tekens-limiet van het abonnement (Starter: 30.000/maand). */
  limit: number;
  /** Resterend (limit - used, nooit negatief). */
  remaining: number;
  /** Wanneer de teller reset (of null als onbekend). */
  resetAt: Date | null;
};

/** Tekens; onder deze rest-waarde mailt de dagelijkse cron. */
export function elevenLabsQuotaThreshold(): number {
  const raw = Number(process.env.ELEVENLABS_QUOTA_ALERT_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 ? raw : 5000;
}

/** Haal het abonnements-verbruik op. null = niet op te vragen. */
export async function fetchElevenLabsUsage(): Promise<ElevenLabsUsage | null> {
  // Zelfde BOM-strip als in tts.ts — zie die comment.
  const BOM = String.fromCharCode(0xfeff);
  const apiKey = process.env.ELEVENLABS_API_KEY?.split(BOM).join("").trim();
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": apiKey },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      character_count?: unknown;
      character_limit?: unknown;
      next_character_count_reset_unix?: unknown;
    };
    const used = Number(data.character_count);
    const limit = Number(data.character_limit);
    if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
      return null;
    }
    const resetUnix = Number(data.next_character_count_reset_unix);
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: Number.isFinite(resetUnix) && resetUnix > 0
        ? new Date(resetUnix * 1000)
        : null,
    };
  } catch {
    return null;
  }
}

/**
 * Stuur de admins direct een "quotum is op"-mail (reactief pad, aan te
 * roepen wanneer de audio-route een TtsQuotaError ziet). Dedupe: maximaal
 * één mail per 12 uur via het e-maillogboek. Volledig best-effort.
 */
export async function maybeAlertElevenLabsQuotaExhausted(
  context: string,
): Promise<void> {
  try {
    const recent = await prisma.emailLog.findFirst({
      where: {
        templateCode: ELEVENLABS_QUOTA_MAIL_TAG,
        status: "sent",
        createdAt: { gte: new Date(Date.now() - 12 * 3_600_000) },
      },
      select: { id: true },
    });
    if (recent) return;

    const usage = await fetchElevenLabsUsage();
    const mail = buildAdminElevenLabsQuotaMail({
      kind: "exhausted",
      usage,
      context,
    });
    for (const to of getAdminNotifyEmails()) {
      try {
        await sendMail({
          to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          tags: [ELEVENLABS_QUOTA_MAIL_TAG],
        });
      } catch (mailErr) {
        console.error(
          `[elevenlabs-quota] alert mail to ${to} failed`,
          mailErr instanceof Error ? mailErr.message : mailErr,
        );
      }
    }
  } catch (alertErr) {
    console.error("[elevenlabs-quota] alert flow failed", alertErr);
  }
}
