import { prisma } from "@/lib/db";

/**
 * Aantal gratis verhalen (storyCredits) dat een nieuw account krijgt.
 *
 * Instelbaar via /admin/pricing en opgeslagen in `app_settings`. Dezelfde
 * waarde voedt de registratie (credentials + Google) én de teksten op de
 * publieke pagina's, zodat belofte en werkelijkheid niet uit elkaar lopen.
 *
 * Fail-open: ontbreekt de rij, is de waarde ongeldig of is de tabel niet
 * bereikbaar, dan geldt de default. Een registratie mag nooit stuklopen op
 * een instelling.
 */

export const STARTER_CREDITS_KEY = "signup.starterCredits";
export const DEFAULT_STARTER_CREDITS = 5;
export const STARTER_CREDITS_RANGE = { min: 0, max: 20 } as const;

export function isValidStarterCredits(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= STARTER_CREDITS_RANGE.min &&
    value <= STARTER_CREDITS_RANGE.max
  );
}

export async function loadStarterCredits(): Promise<number> {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: STARTER_CREDITS_KEY },
      select: { value: true },
    });
    const value = row?.value;
    return isValidStarterCredits(value) ? value : DEFAULT_STARTER_CREDITS;
  } catch (err) {
    console.error("[starter-credits] laden mislukt, default gebruikt", err);
    return DEFAULT_STARTER_CREDITS;
  }
}

export async function saveStarterCredits(
  value: number,
  updatedById: string,
): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: STARTER_CREDITS_KEY },
    create: { key: STARTER_CREDITS_KEY, value, updatedById },
    update: { value, updatedById },
  });
}

// ── Copy-helpers ────────────────────────────────────────────────

const NUMBER_WORDS = [
  "nul", "één", "twee", "drie", "vier", "vijf", "zes",
  "zeven", "acht", "negen", "tien", "elf", "twaalf",
];

/** "vijf", "twaalf", boven twaalf gewoon cijfers ("15"). */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalize(s: string): string {
  // Nederlandse spelling: "Eén", niet "Één".
  if (s.startsWith("één")) return "Eén" + s.slice(3);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "vijf gratis verhalen" / "één gratis verhaal". */
export function freeStoriesLabel(n: number, { capital = false } = {}): string {
  const label =
    n === 1 ? "één gratis verhaal" : `${numberWord(n)} gratis verhalen`;
  return capital ? capitalize(label) : label;
}

/** "de eerste vijf verhalen zijn gratis" / "het eerste verhaal is gratis". */
export function firstStoriesFreeLabel(
  n: number,
  { capital = false } = {},
): string {
  const label =
    n === 1
      ? "het eerste verhaal is gratis"
      : `de eerste ${numberWord(n)} verhalen zijn gratis`;
  return capital ? capitalize(label) : label;
}
