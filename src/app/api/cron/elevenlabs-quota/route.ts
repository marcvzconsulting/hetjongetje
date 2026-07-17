import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { getAdminNotifyEmails } from "@/lib/admin/notify";
import { buildAdminElevenLabsQuotaMail } from "@/lib/email/templates/admin-elevenlabs-quota";
import {
  fetchElevenLabsUsage,
  elevenLabsQuotaThreshold,
  ELEVENLABS_QUOTA_MAIL_TAG,
} from "@/lib/ai/elevenlabs-quota";

export const maxDuration = 30;

/**
 * Dagelijkse cron: check het ElevenLabs-tekens-quotum (voorlezen) en
 * waarschuw de admin als het restant onder de drempel zit (env
 * ELEVENLABS_QUOTA_ALERT_THRESHOLD, default 5.000 tekens ≈ 3-4
 * verhaal-stemmen). Dedupe via het e-maillogboek: max één waarschuwing
 * per 3 dagen. Zelfde recept als /api/cron/fal-balance.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const usage = await fetchElevenLabsUsage();
  if (!usage) {
    console.warn("[cron] elevenlabs-quota: verbruik niet op te vragen");
    return NextResponse.json({ ok: true, usage: null, sent: false });
  }

  const threshold = elevenLabsQuotaThreshold();
  if (usage.remaining >= threshold) {
    return NextResponse.json({
      ok: true,
      remaining: usage.remaining,
      sent: false,
    });
  }

  const recent = await prisma.emailLog.findFirst({
    where: {
      templateCode: ELEVENLABS_QUOTA_MAIL_TAG,
      status: "sent",
      createdAt: { gte: new Date(Date.now() - 3 * 86_400_000) },
    },
    select: { id: true },
  });
  if (recent) {
    return NextResponse.json({
      ok: true,
      remaining: usage.remaining,
      sent: false,
      deduped: true,
    });
  }

  const mail = buildAdminElevenLabsQuotaMail({ kind: "low", usage, threshold });
  let sent = 0;
  for (const to of getAdminNotifyEmails()) {
    try {
      await sendMail({
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: [ELEVENLABS_QUOTA_MAIL_TAG],
      });
      sent++;
    } catch (err) {
      console.error(
        `[cron] elevenlabs-quota mail to ${to} failed`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    remaining: usage.remaining,
    threshold,
    sent,
  });
}
