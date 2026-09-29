import { V2 } from "@/components/v2/tokens";

/**
 * Tekststijlen van een verhaalpagina, als losse objecten met
 * string-waarden. De weergave (React) en de meting (een verborgen
 * DOM-element) gebruiken exact dezelfde objecten: alleen dan klopt
 * "past dit op de pagina?" met wat de lezer ziet.
 */

export type StyleMap = Record<string, string>;

export function textBlockStyle(fontPx: number, lineHeight: number): StyleMap {
  return {
    fontFamily: V2.body,
    fontWeight: "400",
    fontSize: `${fontPx}px`,
    lineHeight: String(lineHeight),
    letterSpacing: "0.02px",
    textWrap: "pretty",
    // flow-root: de zwevende beginletter telt mee in de hoogte.
    display: "flow-root",
  };
}

/** Elk woord is een eigen blokje, zodat de markering niets verschuift. */
export const WORD_STYLE: StyleMap = {
  display: "inline-block",
  marginRight: "0.28em",
  padding: "0 2px",
  marginLeft: "-2px",
  borderRadius: "3px",
};

export function dropcapStyle(color: string, line: string): StyleMap {
  return {
    fontFamily: V2.display,
    fontStyle: "italic",
    fontSize: "3.4em",
    float: "left",
    lineHeight: "0.82",
    margin: "5px 10px 0 0",
    paddingBottom: "3px",
    borderBottom: `1px solid ${line}`,
    color,
  };
}
