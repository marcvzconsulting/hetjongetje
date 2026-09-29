/**
 * Nachtmodus van de lezer: instelling + tijdvak-logica.
 *
 * Pure functies zonder DB- of browser-afhankelijkheid, zodat de lezer
 * (client), de admin-pagina en de server-loader dezelfde regels delen.
 * Tijden zijn minuten sinds middernacht, lokale tijd van het toestel.
 */

export type ReaderSettings = {
  /** Start de lezer automatisch in nachtmodus binnen het tijdvak? */
  autoNight: boolean;
  /** Begin van het tijdvak, minuten sinds middernacht (1200 = 20:00). */
  nightStart: number;
  /** Einde van het tijdvak, minuten sinds middernacht (420 = 07:00). */
  nightEnd: number;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  autoNight: true,
  nightStart: 20 * 60,
  nightEnd: 7 * 60,
};

/** Keuzes in de admin: stappen van 30 minuten binnen deze grenzen. */
export const NIGHT_STEP = 30;
export const NIGHT_START_RANGE = { min: 17 * 60, max: 23 * 60 } as const;
export const NIGHT_END_RANGE = { min: 5 * 60, max: 9 * 60 + 30 } as const;

export const NIGHT_PRESETS = [
  { label: "Winter 18:30 – 07:30", start: 18 * 60 + 30, end: 7 * 60 + 30 },
  { label: "Voorjaar/herfst 20:00 – 07:00", start: 20 * 60, end: 7 * 60 },
  { label: "Zomer 21:30 – 06:30", start: 21 * 60 + 30, end: 6 * 60 + 30 },
] as const;

/** 1200 → "20:00". */
export function formatMinutes(m: number): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Alle keuzes binnen een bereik, in stappen van NIGHT_STEP. */
export function minuteOptions(range: {
  min: number;
  max: number;
}): number[] {
  const out: number[] = [];
  for (let m = range.min; m <= range.max; m += NIGHT_STEP) out.push(m);
  return out;
}

/**
 * Valt `nowMin` binnen het tijdvak? Een tijdvak dat over middernacht
 * loopt (start > einde, het normale geval) telt als
 * `nu ≥ start || nu < einde`.
 */
export function inNightWindow(
  nowMin: number,
  start: number,
  end: number,
): boolean {
  if (start === end) return false;
  return start > end
    ? nowMin >= start || nowMin < end
    : nowMin >= start && nowMin < end;
}

/** Handmatige keuze (voor deze sessie) wint van het automatische tijdvak. */
export function resolveNight(
  settings: ReaderSettings,
  nowMin: number,
  manualOverride: boolean | null,
): boolean {
  if (manualOverride !== null) return manualOverride;
  return (
    settings.autoNight &&
    inNightWindow(nowMin, settings.nightStart, settings.nightEnd)
  );
}

function isValidMinute(
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
 * Maakt van willekeurige invoer (DB-rijen, formulierdata) een geldige
 * instelling. Elk ongeldig veld valt terug op z'n default, zodat een
 * kapotte rij de lezer nooit kan breken.
 */
export function normalizeReaderSettings(raw: {
  autoNight?: unknown;
  nightStart?: unknown;
  nightEnd?: unknown;
}): ReaderSettings {
  return {
    autoNight:
      typeof raw.autoNight === "boolean"
        ? raw.autoNight
        : DEFAULT_READER_SETTINGS.autoNight,
    nightStart: isValidMinute(raw.nightStart, NIGHT_START_RANGE)
      ? raw.nightStart
      : DEFAULT_READER_SETTINGS.nightStart,
    nightEnd: isValidMinute(raw.nightEnd, NIGHT_END_RANGE)
      ? raw.nightEnd
      : DEFAULT_READER_SETTINGS.nightEnd,
  };
}

/** Minuten sinds middernacht volgens de klok van het toestel. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Minuten sinds middernacht in Nederlandse tijd. De server kent de klok
 * van de lezer niet; vrijwel alle lezers zitten in deze tijdzone, dus
 * dit is de beste gok voor de eerste weergave. Na het laden corrigeert
 * de lezer op de echte toesteltijd.
 */
export function amsterdamMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hh * 60 + mm;
}
