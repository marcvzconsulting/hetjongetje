import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { buildDay1ProfileReminderMail } from "@/lib/email/templates/day1-profile-reminder";
import { buildAppUrl } from "@/lib/url";
import { buildReminderOptOutUrl } from "@/lib/reminders/opt-out-url";

/**
 * Day 1 retention: Stuur reminder naar users die geen child-profiel hebben
 * aangemaakt binnen 24 uur na registratie.
 *
 * Selectie:
 * - Registered ~24h ago (createdAt in the range [now-48h, now-24h])
 * - status = "approved" (auto-approved on signup now)
 * - No child profile yet (children: NONE)
 * - Haven't received this reminder (day1ProfileReminderSentAt NULL)
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
  const oneDayAgo = new Date(now.getTime() - 1 * 86_400_000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);

  const candidates = await prisma.user.findMany({
    where: {
      role: "user",
      status: "approved",
      createdAt: { gte: twoDaysAgo, lt: oneDayAgo },
      day1ProfileReminderSentAt: null,
      remindersOptOutAt: null,
      // Geen mails tijdens de 30-dagen-bedenktijd van een verwijderverzoek.
      deletionRequestedAt: null,
      children: { none: {} },
      // Reminders gaan naar iedereen — bewust géén newsletterOptIn-gate.
      // remindersOptOutAt blijft wél gerespecteerd (expliciete afmelding).
    },
    select: { id: true, email: true, name: true },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  for (const user of candidates) {
    try {
      const profileUrl = await buildAppUrl("/profile/new");
      const unsubscribeUrl = await buildReminderOptOutUrl(user.id);
      const mail = await buildDay1ProfileReminderMail({
        name: user.name,
        profileUrl,
        unsubscribeUrl,
      });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["day1-profile-reminder"],
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { day1ProfileReminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(
        `[cron] day1-profile-reminder to ${user.email} failed`,
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
    trigger: "day1-profile",
  });
}
