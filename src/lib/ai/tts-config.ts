/**
 * Server-side configuratie voor de voorleesfunctie. Bewust los van
 * tts-voices.ts: dat bestand wordt door client-components geïmporteerd
 * en hoort geen server-env-vars te lezen.
 */

/**
 * Is het GENEREREN van nieuwe voorlees-audio voorbehouden aan
 * abonnees (en admins)? Gestuurd via env `TTS_PREMIUM_ONLY=1`;
 * standaard uit. Afspelen van al gegenereerde audio blijft altijd
 * voor iedereen werken, ook met de schakelaar aan.
 */
export function isTtsPremiumOnly(): boolean {
  return process.env.TTS_PREMIUM_ONLY === "1";
}
