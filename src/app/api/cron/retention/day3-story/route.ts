import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { buildDay3StoryReminderMail } from "@/lib/email/templates/day3-story-reminder";
import { buildAppUrl } from "@/lib/url";

/**
 * Day 3 retention: Stuur reminder naar users die een profiel hebben maar
 * nog geen verhaal hebben gegenereerd binnen 72 uur na registratie.
 *
 * Selectie:
 * - Registered ~72h ago (createdAt in the range [now-96h, now-48h])
 * - status = "approved"
 * - Has created a child profile (children: SOME)
 * - No stories yet on those profiles
 * - Haven't received this reminder (day3StoryReminderSentAt NULL)
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
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);

  const candidates = await prisma.user.findMany({
    where: {
      role: "user",
      status: "approved",
      createdAt: { gte: threeDaysAgo, lt: twoDaysAgo },
      day3StoryReminderSentAt: null,
      remindersOptOutAt: null,
      children: {
        some: {
          stories: { none: {} },
        },
      },
      newsletterOptIn: true,
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
      const mail = await buildDay3StoryReminderMail({
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
        tags: ["day3-story-reminder"],
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { day3StoryReminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(
        `[cron] day3-story-reminder to ${user.email} failed`,
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
    trigger: "day3-story",
  });
}
