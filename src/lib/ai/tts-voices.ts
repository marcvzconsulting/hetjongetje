/**
 * Voorlees-stemmen voor het "Voorlezen"-paneel in de verhaal-viewer.
 *
 * Dit zijn gedeelde Voice-Library-stemmen die aan ons ElevenLabs-account
 * zijn toegevoegd ("Add to my voices"). Let op: API-gebruik van Voice-
 * Library-stemmen vereist minimaal het Starter-plan — op het gratis plan
 * geeft de API een 401/403 voor deze voice-id's.
 *
 * De keys ("chloe", "petra", …) zijn stabiel: ze zitten in de
 * StoryAudio.voiceKey-kolom én in de Scaleway-objectnamen
 * (`stories/<id>/audio-<voiceKey>.mp3`). Hernoemen = cache-invalide.
 *
 * 2026-07-16: Melanie en Robert verwijderd na luistertest van Marc —
 * vier stemmen kiest makkelijker dan zes.
 */
export const TTS_VOICES = {
  chloe:   { label: "Chloe",   description: "Zacht & teder",     gender: "female", accent: "NL",     voiceId: "1qEAoMPNMshP2ZjYIKup" },
  petra:   { label: "Petra",   description: "Energiek",          gender: "female", accent: "Vlaams", voiceId: "ANHrhmaFeVN0QJaa0PhL" },
  arjen:   { label: "Arjen",   description: "Kalm & lief",       gender: "male",   accent: "NL",     voiceId: "62klqbsYqbynbr66ypRt" },
  jan:     { label: "Jan",     description: "Verhalenverteller", gender: "male",   accent: "Vlaams", voiceId: "dSPqR7aIUDP4AvcVHLlr" },
} as const;

export type TtsVoiceKey = keyof typeof TTS_VOICES;

export function isTtsVoiceKey(value: unknown): value is TtsVoiceKey {
  return typeof value === "string" && value in TTS_VOICES;
}
