import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * Reminder-effectmeting voor het admin-dashboard: heeft een verstuurde
 * day1/3/7-reminder de gebruiker daadwerkelijk in beweging gekregen?
 *
 * Per trigger meten we tegen het verzendmoment (de `day…ReminderSentAt`
 * op de user — gezet door zowel de cron als handmatige verzending via
 * /admin/reminders):
 *   - doel behaald: de actie waar de mail om vroeg, ná het verzendmoment
 *       day1 → kindprofiel aangemaakt
 *       day3 → verhaal gegenereerd
 *       day7 → (weer) ingelogd
 *   - teruggekomen: lastLoginAt ná het verzendmoment (voor elke trigger)
 *
 * Gebruikers die hun account verwijderden vallen automatisch uit de
 * meting (rij weg); dat is een kleine, acceptabele vertekening.
 */

export type ReminderTriggerStats = {
  key: "day1-profile" | "day3-story" | "day7-login";
  label: string;
  goalLabel: string;
  sent: number;
  goalReached: number;
  returned: number;
};

export type ReminderEffectStats = {
  triggers: ReminderTriggerStats[];
};

async function computeReminderEffect(): Promise<ReminderEffectStats> {
  const users = await prisma.user.findMany({
    where: {
      role: "user",
      OR: [
        { day1ProfileReminderSentAt: { not: null } },
        { day3StoryReminderSentAt: { not: null } },
        { day7LoginReminderSentAt: { not: null } },
      ],
    },
    select: {
      lastLoginAt: true,
      day1ProfileReminderSentAt: true,
      day3StoryReminderSentAt: true,
      day7LoginReminderSentAt: true,
      children: {
        select: {
          createdAt: true,
          stories: { select: { createdAt: true } },
        },
      },
    },
  });

  const day1: ReminderTriggerStats = {
    key: "day1-profile",
    label: "Dag 1 — nog geen profiel",
    goalLabel: "profiel aangemaakt",
    sent: 0,
    goalReached: 0,
    returned: 0,
  };
  const day3: ReminderTriggerStats = {
    key: "day3-story",
    label: "Dag 3 — nog geen verhaal",
    goalLabel: "verhaal gemaakt",
    sent: 0,
    goalReached: 0,
    returned: 0,
  };
  const day7: ReminderTriggerStats = {
    key: "day7-login",
    label: "Dag 7 — nooit ingelogd",
    goalLabel: "ingelogd",
    sent: 0,
    goalReached: 0,
    returned: 0,
  };

  for (const u of users) {
    if (u.day1ProfileReminderSentAt) {
      const sentAt = u.day1ProfileReminderSentAt;
      day1.sent++;
      if (u.children.some((c) => c.createdAt > sentAt)) day1.goalReached++;
      if (u.lastLoginAt && u.lastLoginAt > sentAt) day1.returned++;
    }
    if (u.day3StoryReminderSentAt) {
      const sentAt = u.day3StoryReminderSentAt;
      day3.sent++;
      if (u.children.some((c) => c.stories.some((s) => s.createdAt > sentAt)))
        day3.goalReached++;
      if (u.lastLoginAt && u.lastLoginAt > sentAt) day3.returned++;
    }
    if (u.day7LoginReminderSentAt) {
      const sentAt = u.day7LoginReminderSentAt;
      day7.sent++;
      if (u.lastLoginAt && u.lastLoginAt > sentAt) {
        day7.goalReached++;
        day7.returned++;
      }
    }
  }

  return { triggers: [day1, day3, day7] };
}

/** Zelfde cache-aanpak als loadDashboardStats: 60s, dashboard is toch al
 *  force-dynamic dus dit begrenst alleen de querydruk. */
export const loadReminderEffect = unstable_cache(
  computeReminderEffect,
  ["admin-reminder-effect"],
  { revalidate: 60 },
);
