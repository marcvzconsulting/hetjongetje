/**
 * Shared constants/types for the retention-reminder admin UI. Kept out
 * of actions.ts because a "use server" module may only export async
 * functions — so the const list and its type live here and are imported
 * by both the server action and the client component.
 */
export const REMINDER_TRIGGERS = [
  "day1-profile",
  "day3-story",
  "day7-login",
] as const;

export type ReminderTrigger = (typeof REMINDER_TRIGGERS)[number];
