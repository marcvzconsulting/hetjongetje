import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { buildProfileIncompleteReminderMail } from "@/lib/email/templates/profile-incomplete-reminder";
import { buildAppUrl } from "@/lib/url";
import { signUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";

/**
 * Nightly cron via Vercel: stuur een eenmalige reminder naar approved
 * accounts die wel registreerden maar geen kindprofiel hebben aangemaakt
 * binnen 3 dagen. Eénmalig per user — `reminderSentAt` blokkeert tweede
 * verzending.
 *
 * Beveiliging: Vercel cron stuurt een `Authorization: Bearer
 * <CRON_SECRET>`-header. Routes die per ongeluk publiek bereikbaar zijn
 * moeten weigeren.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
  const candidates = await prisma.user.findMany({
    where: {
      role: "user",
      status: "approved",
      createdAt: { lt: threeDaysAgo },
      reminderSentAt: null,
      children: { none: {} },
      // Niet spammen naar mensen die zich net hebben afgemeld voor
      // marketing-mails. Reminders zijn marketing-achtig.
      newsletterOptIn: true,
    },
    select: { id: true, email: true, name: true },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  for (const user of candidates) {
    try {
      const profileUrl = await buildAppUrl("/profile/new");
      const token = signUnsubscribeToken(user.email);
      const unsubscribeUrl = await buildAppUrl(
        `/unsubscribe?email=${encodeURIComponent(user.email)}&token=${token}`,
      );
      const mail = await buildProfileIncompleteReminderMail({
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
        tags: ["profile-incomplete-reminder"],
      });
      // Markeer pas ná succesvolle send — zo proberen we 't morgen
      // opnieuw als Brevo tijdelijk down was.
      await prisma.user.update({
        where: { id: user.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(
        `[cron] profile-reminder mail to ${user.email} failed`,
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
  });
}
