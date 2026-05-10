/**
 * Kleine helpers voor server-actions die FormData verwerken. Bewust geen
 * validatie-laag (daarvoor zou je zod gebruiken op endpoint-niveau);
 * deze utilities zorgen alleen voor consistente null/empty-string
 * normalisatie zodat individuele actions niet hun eigen versie hoeven
 * te schrijven.
 */

/** Trim een FormData-entry tot een string ("" als de entry ontbreekt). */
export function trim(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

/** Lege strings naar null mappen — handig voor optionele DB-kolommen. */
export function nullIfEmpty(value: string): string | null {
  return value === "" ? null : value;
}

/** Combinatie van trim + nullIfEmpty. */
export function trimToNull(value: FormDataEntryValue | null): string | null {
  return nullIfEmpty(trim(value));
}
