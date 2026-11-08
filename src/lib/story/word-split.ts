/**
 * Gedeelde woord-splitser voor de lezer: de paginatekst wordt als losse
 * woord-spans gerenderd (en in V4 per woord over pagina's verdeeld), dus
 * alle plekken moeten exact dezelfde splitsing gebruiken.
 *
 * Defensief: trim + split op elke whitespace-reeks + lege stukken eruit.
 */
export function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}
