/**
 * Schakelaars voor de lezer.
 *
 * - Versie: `v4` (nieuwe lezer zonder boekformaat) of `v3` (de vorige
 *   lezer). Env `READER_VERSION=v3` is de kill-switch; `?lezer=v3` of
 *   `?lezer=v4` in de URL wint daarvan, handig om te vergelijken.
 * - Lange teksten, als de tekst niet op de pagina past:
 *     `split`        illustratie krimpt eerst, daarna een extra pagina
 *                    met dezelfde illustratie      (`?tekst=splits`)
 *     `split-fixed`  illustratie houdt haar vaste maat, direct een
 *                    extra pagina                  (`?tekst=splits-vast`)
 *     `scroll`       illustratie krimpt, daarna scrollt de tekstkaart
 *                                                  (`?tekst=scroll`)
 *     `flow`         staande telefoon: het hele verhaal scrolt door; de
 *                    illustratie blijft bovenaan staan tot de tekst op is
 *                    en de volgende illustratie erin schuift. Op andere
 *                    schermen gedraagt dit zich als `split`.
 *                                                  (`?tekst=doorlopend`)
 *   Env `READER_TEXT_OVERFLOW` zet de standaard.
 */

export type ReaderVersion = "v3" | "v4";
export type OverflowMode = "split" | "split-fixed" | "scroll" | "flow";

export const DEFAULT_READER_VERSION: ReaderVersion = "v4";
export const DEFAULT_OVERFLOW_MODE: OverflowMode = "split";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseVersion(value: string | undefined): ReaderVersion | null {
  const v = value?.trim().toLowerCase();
  return v === "v3" || v === "v4" ? v : null;
}

function parseOverflow(value: string | undefined): OverflowMode | null {
  const v = value?.trim().toLowerCase();
  if (v === "scroll") return "scroll";
  if (v === "split" || v === "splits") return "split";
  if (v === "split-fixed" || v === "splits-vast") return "split-fixed";
  if (v === "flow" || v === "doorlopend") return "flow";
  return null;
}

export function resolveReaderVersion(
  param: string | string[] | undefined,
): ReaderVersion {
  return (
    parseVersion(first(param)) ??
    parseVersion(process.env.READER_VERSION) ??
    DEFAULT_READER_VERSION
  );
}

export function resolveOverflowMode(
  param: string | string[] | undefined,
): OverflowMode {
  return (
    parseOverflow(first(param)) ??
    parseOverflow(process.env.READER_TEXT_OVERFLOW) ??
    DEFAULT_OVERFLOW_MODE
  );
}
