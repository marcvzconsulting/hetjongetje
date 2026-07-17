import type { Spread } from "./spread-types";

/**
 * Hulpjes om de voorleesfunctie aan de spreads-structuur te koppelen.
 * Gedeeld door de story-client en de publieke deelpagina-client.
 */

/**
 * DB-paginanummer van de voorleesbare tekst op een spread, of null
 * wanneer de spread geen (niet-lege) tekstpagina toont — de titel- en
 * eindspread bijvoorbeeld.
 */
export function spreadReadablePageNumber(spread: Spread): number | null {
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
 * Per spread het voorleesbare DB-paginanummer (of null), op volgorde.
 * Index = spreadIdx zoals BookViewerV3 die via onSpreadChange meldt.
 */
export function spreadsToPageNumbers(spreads: Spread[]): (number | null)[] {
  return spreads.map(spreadReadablePageNumber);
}
