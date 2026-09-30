import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_READER_SETTINGS,
  normalizeReaderSettings,
  type ReaderSettings,
} from "./night";

/**
 * Instellingen van de lezer uit de `app_settings`-tabel.
 *
 * Fail-open: ontbreekt een rij, is een waarde ongeldig of is de tabel
 * (nog) niet bereikbaar, dan geldt de default uit de code. Een verhaal
 * openen mag nooit stuklopen op een instelling.
 */

export const READER_SETTING_KEYS = {
  autoNight: "reader.autoNight",
  nightStart: "reader.nightStart",
  nightEnd: "reader.nightEnd",
} as const;

export async function loadReaderSettings(): Promise<ReaderSettings> {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: Object.values(READER_SETTING_KEYS) } },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return normalizeReaderSettings({
      autoNight: byKey.get(READER_SETTING_KEYS.autoNight),
      nightStart: byKey.get(READER_SETTING_KEYS.nightStart),
      nightEnd: byKey.get(READER_SETTING_KEYS.nightEnd),
    });
  } catch (err) {
    console.error("[reader-settings] laden mislukt, defaults gebruikt", err);
    return DEFAULT_READER_SETTINGS;
  }
}

export async function saveReaderSettings(
  settings: ReaderSettings,
  updatedById: string,
): Promise<void> {
  const entries: [string, Prisma.InputJsonValue][] = [
    [READER_SETTING_KEYS.autoNight, settings.autoNight],
    [READER_SETTING_KEYS.nightStart, settings.nightStart],
    [READER_SETTING_KEYS.nightEnd, settings.nightEnd],
  ];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value, updatedById },
        update: { value, updatedById },
      }),
    ),
  );
}
