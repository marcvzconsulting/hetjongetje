import { TTS_VOICES, type TtsVoiceKey } from "./tts-voices";

/**
 * Text-to-speech via ElevenLabs. Eén audio-bestand per verhaal per stem;
 * de aanroepende route cachet het resultaat in Scaleway zodat we per
 * (verhaal, stem)-combinatie maar één keer betalen.
 */

/**
 * Fouten waar de gebruiker niets aan kan doen: quota op (402/429) of een
 * key/abonnement-probleem (401). De route vertaalt dit naar een nette
 * NL-melding + 503 in plaats van een kale 500.
 */
export class TtsQuotaError extends Error {
  readonly kind = "tts_quota";
  readonly status: number;

  constructor(status: number, detail: string) {
    super(`ElevenLabs ${status}: ${detail}`);
    this.name = "TtsQuotaError";
    this.status = status;
  }
}

export function isTtsQuotaError(err: unknown): err is TtsQuotaError {
  return (
    err instanceof TtsQuotaError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { kind?: unknown }).kind === "tts_quota")
  );
}

/**
 * Bouw de voorleestekst: titel + alle niet-lege paginateksten, gescheiden
 * door dubbele newlines. ElevenLabs interpreteert lege regels als
 * natuurlijke pauzes, dus dit geeft rust tussen de pagina's.
 */
export function buildStoryNarration(
  title: string,
  pageTexts: string[],
): string {
  const parts = [
    title.trim(),
    ...pageTexts.map((t) => t.trim()).filter((t) => t.length > 0),
  ].filter((t) => t.length > 0);
  return parts.join("\n\n");
}

/**
 * Genereer spraak (mp3, 44.1kHz/128kbps) voor de gegeven tekst en stem.
 * Gooit TtsQuotaError bij 401/402/429 (key-/abonnement-/quota-problemen),
 * anders een gewone Error met status + responsetekst.
 */
export async function generateSpeech(
  text: string,
  voiceKey: TtsVoiceKey,
): Promise<Buffer> {
  // BOM (U+FEFF) en whitespace strippen: een env-var die via een
  // shell-pipe is gezet kan met een onzichtbare BOM beginnen, en een
  // HTTP-header met zo'n teken laat fetch crashen ("Cannot convert
  // argument to a ByteString").
  const BOM = String.fromCharCode(0xfeff);
  const apiKey = process.env.ELEVENLABS_API_KEY?.split(BOM).join("").trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY niet ingesteld");
  }

  const { voiceId } = TTS_VOICES[voiceKey];
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // 401 = ongeldige key of Voice-Library-stem zonder Starter-plan,
    // 402 = betaling vereist, 429 = quota/character-limiet bereikt.
    if ([401, 402, 429].includes(response.status)) {
      throw new TtsQuotaError(response.status, detail);
    }
    throw new Error(`ElevenLabs TTS mislukt (${response.status}): ${detail}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
