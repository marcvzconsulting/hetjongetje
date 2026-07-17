"use server";

import { redirect } from "next/navigation";
import { requireAdminWithIdentity } from "@/lib/admin/identity";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit-log";
import { sendMail } from "@/lib/email/client";
import { buildAppUrl } from "@/lib/url";
import { buildReminderOptOutUrl } from "@/lib/reminders/opt-out-url";
import { buildDay1ProfileReminderMail } from "@/lib/email/templates/day1-profile-reminder";
import { buildDay3StoryReminderMail } from "@/lib/email/templates/day3-story-reminder";
import { buildDay7LoginReminderMail } from "@/lib/email/templates/day7-login-reminder";
import { REMINDER_TRIGGERS, type ReminderTrigger } from "./triggers";

const TAG: Record<ReminderTrigger, string> = {
  "day1-profile": "day1-profile-reminder",
  "day3-story": "day3-story-reminder",
  "day7-login": "day7-login-reminder",
};

function isTrigger(v: string): v is ReminderTrigger {
  return (REMINDER_TRIGGERS as readonly string[]).includes(v);
}

/**
 * Handmatig een retentie-reminder naar geselecteerde klanten sturen.
 *
 * Veilig gedrag (afgestemd met de eigenaar):
 * - Klanten die zich hebben afgemeld (`remindersOptOutAt`) worden
 *   overgeslagen — nooit mailen naar wie expliciet opt-out koos.
 * - Opnieuw versturen mag: de 'al verstuurd'-vlag blokkeert een
 *   handmatige verzending niet.
 * - Na verzending zetten we de bijbehorende sent-at vlag, zodat de
 *   automatische cron dezelfde reminder daarna niet nóg eens stuurt.
 */
export async function sendReminderAction(formData: FormData) {
  const { audit } = await requireAdminWithIdentity();

  const trigger = String(formData.get("trigger") ?? "");
  if (!isTrigger(trigger)) {
    redirect("/admin/reminders?error=unknown_trigger");
  }

  const userIds = formData.getAll("userIds").map(String).filter(Boolean);
  if (userIds.length === 0) {
    redirect(`/admin/reminders?trigger=${trigger}&error=none_selected`);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      name: true,
      remindersOptOutAt: true,
      deletionRequestedAt: true,
      children: { select: { name: true }, take: 1 },
    },
  });

  const profileUrl = await buildAppUrl("/profile/new");
  const dashboardUrl = await buildAppUrl("/dashboard");

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    // Veilig: nooit mailen naar wie zich afmeldde, en niet naar wie
    // midden in de 30-dagen-bedenktijd van een verwijderverzoek zit.
    if (user.remindersOptOutAt || user.deletionRequestedAt) {
      skipped++;
      continue;
    }

    try {
      const unsubscribeUrl = await buildReminderOptOutUrl(user.id);
      const childName = user.children[0]?.name || "je kind";

      const mail =
        trigger === "day1-profile"
          ? await buildDay1ProfileReminderMail({
              name: user.name,
              profileUrl,
              unsubscribeUrl,
            })
          : trigger === "day3-story"
            ? await buildDay3StoryReminderMail({
                name: user.name,
                childName,
                dashboardUrl,
                unsubscribeUrl,
              })
            : await buildDay7LoginReminderMail({
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
        tags: [TAG[trigger], "manual-admin-send"],
      });

      // Markeer pas ná een succesvolle send zodat een Brevo-storing niet
      // stilzwijgend de vlag zet zonder dat de mail aankwam.
      await prisma.user.update({
        where: { id: user.id },
        data:
          trigger === "day1-profile"
            ? { day1ProfileReminderSentAt: new Date() }
            : trigger === "day3-story"
              ? { day3StoryReminderSentAt: new Date() }
              : { day7LoginReminderSentAt: new Date() },
      });

      sent++;
    } catch (err) {
      console.error(
        `[admin/reminders] manual ${trigger} send to ${user.email} failed`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  await logAdminAction({
    ...audit,
    action: "reminder.manual_send",
    targetType: "reminder",
    targetId: `${trigger}:sent=${sent},skipped=${skipped},failed=${failed}`,
  });

  redirect(
    `/admin/reminders?trigger=${trigger}&sent=${sent}&skipped=${skipped}&failed=${failed}`,
  );
}
