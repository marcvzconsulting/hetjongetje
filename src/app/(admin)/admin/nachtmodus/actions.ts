"use server";

import { revalidatePath } from "next/cache";
import { requireAdminWithIdentity } from "@/lib/admin/identity";
import { logAdminAction } from "@/lib/admin/audit-log";
import {
  NIGHT_END_RANGE,
  NIGHT_START_RANGE,
  NIGHT_STEP,
  type ReaderSettings,
} from "@/lib/reader/night";
import { loadReaderSettings, saveReaderSettings } from "@/lib/reader/settings";

export type SaveNightModeResult =
  | { ok: true; settings: ReaderSettings }
  | { ok: false; error: string };

function validMinute(
  value: unknown,
  range: { min: number; max: number },
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= range.min &&
    value <= range.max &&
    value % NIGHT_STEP === 0
  );
}

/**
 * Slaat de nachtmodus-instelling van de lezer op en schrijft een
 * auditregel met de oude en nieuwe waarden.
 */
export async function saveNightModeAction(input: {
  autoNight: boolean;
  nightStart: number;
  nightEnd: number;
}): Promise<SaveNightModeResult> {
  const { audit } = await requireAdminWithIdentity();

  // Server Functions zijn ook met een losse POST aan te roepen: de
  // invoer hier opnieuw controleren, niet op het formulier vertrouwen.
  if (
    typeof input?.autoNight !== "boolean" ||
    !validMinute(input.nightStart, NIGHT_START_RANGE) ||
    !validMinute(input.nightEnd, NIGHT_END_RANGE)
  ) {
    return { ok: false, error: "Ongeldige tijden. Kies een tijd uit de lijst." };
  }

  const next: ReaderSettings = {
    autoNight: input.autoNight,
    nightStart: input.nightStart,
    nightEnd: input.nightEnd,
  };
  const before = await loadReaderSettings();

  try {
    await saveReaderSettings(next, audit.actorId);
  } catch (err) {
    console.error("[nachtmodus] opslaan mislukt", err);
    return {
      ok: false,
      error: "Opslaan mislukt. Probeer het zo opnieuw.",
    };
  }

  await logAdminAction({
    ...audit,
    action: "reader.night_mode.update",
    targetType: "app_setting",
    targetId: "reader.night",
    metadata: { before, after: next },
  });

  revalidatePath("/admin/nachtmodus");
  return { ok: true, settings: next };
}
