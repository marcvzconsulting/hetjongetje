/**
 * Eén gedeelde woord-splitser voor de voorleesfunctie.
 *
 * De server (tts.ts) zet de ElevenLabs character-alignment om naar
 * woordtimings, en de viewer (BookViewerV3) rendert de paginatekst als
 * losse woord-spans voor de markering. Beide kanten MOETEN exact dezelfde
 * splitsing gebruiken, anders lopen de woordindexen uit de pas. Daarom
 * leeft de splitsing hier, en nergens anders.
 *
 * Defensief: trim + split op elke whitespace-reeks + lege stukken eruit.
 */
export function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}
