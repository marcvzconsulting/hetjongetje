import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  markSubscriptionPastDue,
  sendPaymentFailedMails,
} from "@/lib/payments/subscriptions";

/**
 * Dagelijks vangnet voor gemiste incasso-webhooks: abonnementen die nog
 * "active" staan terwijl hun betaalde periode al meer dan 5 dagen
 * verstreken is, hadden allang verlengd (of via de webhook op past_due
 * gezet) moeten zijn. Die zetten we hier alsnog op past_due, met
 * dezelfde klant- en admin-mails als de webhook-flow.
 *
 * Selectie:
 * - status = "active", plan != "free"
 * - endsAt meer dan 5 dagen geleden
 * - mollieSubscriptionId gevuld — admin-toegekende abonnementen zonder
 *   incasso krijgen géén "incasso mislukt"-mail, die lopen gewoon af
 *
 * Dedupe: max 1 mail per abonnee per 7 dagen, via het e-maillogboek
 * (EmailLog.templateCode = "subscription-payment-failed"). De
 * statusovergang zelf gebeurt ook zonder mail.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86_400_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  const candidates = await prisma.subscription.findMany({
    where: {
      status: "active",
      plan: { not: "free" },
      endsAt: { lt: fiveDaysAgo },
      mollieSubscriptionId: { not: null },
    },
    select: { id: true, userId: true },
    take: 50,
  });

  let updated = 0;
  let mailed = 0;
  let failed = 0;
  for (const sub of candidates) {
    try {
      // Dedupe via het e-maillogboek: kreeg deze abonnee de afgelopen
      // 7 dagen al een incasso-mislukt-mail (webhook of eerdere cron),
      // dan alleen de statusovergang, geen nieuwe mail.
      const recentMail = await prisma.emailLog.findFirst({
        where: {
          userId: sub.userId,
          templateCode: "subscription-payment-failed",
          createdAt: { gte: sevenDaysAgo },
        },
        select: { id: true },
      });

      const transitioned = await markSubscriptionPastDue({
        subscriptionId: sub.id,
        paymentStatus: "overdue",
        skipMails: true,
      });
      if (!transitioned) continue;
      updated++;

      if (!recentMail) {
        await sendPaymentFailedMails(sub.id, "overdue");
        mailed++;
      }
    } catch (err) {
      console.error(
        `[cron] subscription-health failed for subscription ${sub.id}`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    updated,
    mailed,
    failed,
    trigger: "subscription-health",
  });
}
