import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { getAdminNotifyEmails } from "@/lib/admin/notify";
import { buildAdminFalBalanceMail } from "@/lib/email/templates/admin-fal-balance";
import {
  fetchFalBalance,
  falBalanceThreshold,
  FAL_BALANCE_MAIL_TAG,
} from "@/lib/ai/fal-balance";

export const maxDuration = 30;

/**
 * Dagelijkse cron: check het fal.ai-tegoed en waarschuw de admin als
 * het onder de drempel zit (env FAL_BALANCE_ALERT_THRESHOLD, default
 * $5). Dedupe via het e-maillogboek: maximaal één waarschuwing per
 * 3 dagen, zodat een laag-maar-bewust saldo niet elke dag mailt.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const balance = await fetchFalBalance();
  if (balance === null) {
    // Alpha-endpoint onbereikbaar — geen alarm, wel loggen zodat een
    // stilletjes verdwenen API opvalt in de Vercel-logs.
    console.warn("[cron] fal-balance: saldo niet op te vragen");
    return NextResponse.json({ ok: true, balance: null, sent: false });
  }

  const threshold = falBalanceThreshold();
  if (balance >= threshold) {
    return NextResponse.json({ ok: true, balance, sent: false });
  }

  const recent = await prisma.emailLog.findFirst({
    where: {
      templateCode: FAL_BALANCE_MAIL_TAG,
      status: "sent",
      createdAt: { gte: new Date(Date.now() - 3 * 86_400_000) },
    },
    select: { id: true },
  });
  if (recent) {
    return NextResponse.json({ ok: true, balance, sent: false, deduped: true });
  }

  const mail = buildAdminFalBalanceMail({ kind: "low", balance, threshold });
  let sent = 0;
  for (const to of getAdminNotifyEmails()) {
    try {
      await sendMail({
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: [FAL_BALANCE_MAIL_TAG],
      });
      sent++;
    } catch (err) {
      console.error(
        `[cron] fal-balance mail to ${to} failed`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({ ok: true, balance, threshold, sent });
}
