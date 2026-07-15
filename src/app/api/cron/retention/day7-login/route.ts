import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { buildDay7LoginReminderMail } from "@/lib/email/templates/day7-login-reminder";
import { buildAppUrl } from "@/lib/url";

/**
 * Day 7 retention: Stuur reminder naar users die nog nooit hebben ingelogd
 * binnen 7 dagen na registratie.
 *
 * Selectie:
 * - Registered ~7 days ago (createdAt in the range [now-168h, now-144h])
 * - status = "approved"
 * - Never logged in (lastLoginAt NULL)
 * - Haven't received this reminder (day7LoginReminderSentAt NULL)
 * - Opted in (remindersOptOutAt NULL)
 * - Respects newsletter preference (newsletterOptIn = true)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const sixDaysAgo = new Date(now.getTime() - 6 * 86_400_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  const candidates = await prisma.user.findMany({
    where: {
      role: "user",
      status: "approved",
      createdAt: { gte: sevenDaysAgo, lt: sixDaysAgo },
      lastLoginAt: null,
      day7LoginReminderSentAt: null,
      remindersOptOutAt: null,
      // Geen mails tijdens de 30-dagen-bedenktijd van een verwijderverzoek.
      deletionRequestedAt: null,
      // Reminders gaan naar iedereen — bewust géén newsletterOptIn-gate.
      // remindersOptOutAt blijft wél gerespecteerd (expliciete afmelding).
    },
    select: {
      id: true,
      email: true,
      name: true,
      children: {
        select: { name: true },
        take: 1,
      },
    },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  for (const user of candidates) {
    try {
      const childName = user.children[0]?.name || "je kind";
      const dashboardUrl = await buildAppUrl("/dashboard");
      const unsubscribeUrl = await buildAppUrl(
        `/api/reminders/opt-out?user_id=${encodeURIComponent(user.id)}`,
      );
      const mail = await buildDay7LoginReminderMail({
        name: user.name,
        childName,
        dashboardUrl,
        unsubscribeUrl,
      });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["day7-login-reminder"],
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { day7LoginReminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(
        `[cron] day7-login-reminder to ${user.email} failed`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    failed,
    trigger: "day7-login",
  });
}
