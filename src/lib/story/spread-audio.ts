import type { Spread } from "./spread-types";

/**
 * Hulpjes om de voorleesfunctie aan de spreads-structuur te koppelen.
 * Gedeeld door de story-client, de publieke deelpagina-client, de
 * speler en de audio-route.
 */

/**
 * Pseudo-paginanummer van de titelspread in StoryAudio. Geen DB-pagina:
 * de audio-route bouwt de tekst (titel + subtitel) server-side. Past in
 * het bestaande model omdat echte StoryPage-nummers bij 1 beginnen.
 */
export const TITLE_PAGE_NUMBER = 0;

/**
 * DB-paginanummer van de tekstpagina op een spread (voor de
 * woord-markering), of null wanneer de spread geen (niet-lege)
 * tekstpagina toont.
 */
export function spreadTextPageNumber(spread: Spread): number | null {
  if (
    spread.left.type === "text" &&
    typeof spread.left.pageNumber === "number" &&
    spread.left.content.trim().length > 0
  ) {
    return spread.left.pageNumber;
  }
  if (
    !spread.fullSpread &&
    spread.right.type === "text" &&
    typeof spread.right.pageNumber === "number" &&
    spread.right.content.trim().length > 0
  ) {
    return spread.right.pageNumber;
  }
  return null;
}

/**
 * Voorlees-item van een spread:
 * - tekstspread → het DB-paginanummer van de tekst;
 * - titelspread → TITLE_PAGE_NUMBER (0);
 * - eindspread → het DB-paginanummer van de eindpagina (indien aanwezig);
 * - anders null (geen audio voor deze spread).
 */
export function spreadNarrationPageNumber(spread: Spread): number | null {
  const textPage = spreadTextPageNumber(spread);
  if (textPage !== null) return textPage;

  const pages = spread.fullSpread
    ? [spread.left]
    : [spread.left, spread.right];
  for (const p of pages) {
    if (p.type === "title") return TITLE_PAGE_NUMBER;
    if (p.type === "ending" && typeof p.pageNumber === "number") {
      return p.pageNumber;
    }
  }
  return null;
}

/**
 * Per spread het voorleesbare pseudo-/DB-paginanummer (of null), op
 * volgorde. Index = spreadIdx zoals BookViewerV3 die via onSpreadChange
 * meldt. Typisch resultaat: [0, 1..N, eindpagina].
 */
export function spreadsToPageNumbers(spreads: Spread[]): (number | null)[] {
  return spreads.map(spreadNarrationPageNumber);
}

/**
 * DB-paginanummer van de eindspread-audio, of null wanneer het verhaal
 * geen eindpagina met illustratie heeft. De speler gebruikt dit om daar
 * geen woord-markering te emitten en om na afloop "Het verhaaltje is
 * uit" te tonen.
 */
export function endingNarrationPageNumber(spreads: Spread[]): number | null {
  for (const s of spreads) {
    const pages = s.fullSpread ? [s.left] : [s.left, s.right];
    for (const p of pages) {
      if (p.type === "ending" && typeof p.pageNumber === "number") {
        return p.pageNumber;
      }
    }
  }
  return null;
}
