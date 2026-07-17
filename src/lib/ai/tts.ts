import { TTS_VOICES, type TtsVoiceKey } from "./tts-voices";
import { splitWords } from "@/lib/story/word-split";

/**
 * Text-to-speech via ElevenLabs. Eén audio-bestand per (verhaal, stem,
 * pagina); de aanroepende route cachet het resultaat in Scaleway zodat we
 * per combinatie maar één keer betalen. Naast de mp3 leveren we compacte
 * woordtimings mee zodat de viewer het actieve woord kan markeren.
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
 * Eén woord in de voorlees-audio: `w` = het woord zoals het in de tekst
 * staat, `s`/`e` = start-/eindtijd in seconden (2 decimalen). De index in
 * de array correspondeert 1-op-1 met `splitWords(paginatekst)` — de
 * viewer gebruikt diezelfde helper om de spans te renderen.
 */
export type WordTiming = { w: string; s: number; e: number };

/**
 * Bouw de voorleestekst voor één pagina. Bewust ZONDER de verhaaltitel —
 * ook op pagina 1. De viewer toont de titel namelijk niet in de
 * paginatekst, en door alleen de paginatekst in te spreken mappen de
 * woordtimings 1-op-1 op wat er op het scherm staat.
 */
export function buildPageNarration(text: string): string {
  return text.trim();
}

/** Shape van de alignment in de ElevenLabs with-timestamps-response. */
type ElevenAlignment = {
  characters?: unknown;
  character_start_times_seconds?: unknown;
  character_end_times_seconds?: unknown;
};

/**
 * Genereer spraak (mp3, 44.1kHz/128kbps) mét woordtimings voor de gegeven
 * tekst en stem, via het /with-timestamps-endpoint. Gooit TtsQuotaError
 * bij 401/402/429 (key-/abonnement-/quota-problemen), anders een gewone
 * Error met status + responsetekst.
 *
 * `wordTimings` is null wanneer de alignment onbruikbaar is (ontbreekt,
 * inconsistent, of matcht niet met onze woord-splitsing) — de speler
 * speelt dan gewoon af zonder markering.
 */
export async function generateSpeechWithTimings(
  text: string,
  voiceKey: TtsVoiceKey,
): Promise<{ audio: Buffer; wordTimings: WordTiming[] | null }> {
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
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
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

  const data = (await response.json().catch(() => null)) as {
    audio_base64?: unknown;
    alignment?: ElevenAlignment | null;
  } | null;
  if (!data || typeof data.audio_base64 !== "string" || !data.audio_base64) {
    throw new Error("ElevenLabs-response bevat geen audio (with-timestamps)");
  }

  return {
    audio: Buffer.from(data.audio_base64, "base64"),
    wordTimings: alignmentToWordTimings(text, data.alignment ?? null),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Zet de character-alignment om naar compacte woordtimings: split op
 * whitespace (zelfde regels als splitWords), per woord start = starttijd
 * van z'n eerste teken en end = eindtijd van z'n laatste teken.
 *
 * Retourneert null bij elke inconsistentie (ontbrekende arrays, ongelijke
 * lengtes, niet-numerieke tijden, of een woordenaantal dat afwijkt van
 * splitWords(text)) — liever geen markering dan een verschoven markering.
 */
function alignmentToWordTimings(
  text: string,
  alignment: ElevenAlignment | null,
): WordTiming[] | null {
  if (!alignment) return null;
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  if (!Array.isArray(chars) || !Array.isArray(starts) || !Array.isArray(ends)) {
    return null;
  }
  if (chars.length !== starts.length || chars.length !== ends.length) {
    return null;
  }

  const timings: WordTiming[] = [];
  let word = "";
  let wordStart = 0;
  let wordEnd = 0;

  const flush = () => {
    if (word.length > 0) {
      timings.push({ w: word, s: round2(wordStart), e: round2(wordEnd) });
      word = "";
    }
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const s = starts[i];
    const e = ends[i];
    if (typeof ch !== "string") return null;
    if (typeof s !== "number" || !isFinite(s)) return null;
    if (typeof e !== "number" || !isFinite(e)) return null;

    // Zelfde whitespace-definitie als splitWords (/\s+/).
    if (ch === "" || /^\s+$/.test(ch)) {
      flush();
      continue;
    }
    if (word.length === 0) wordStart = s;
    word += ch;
    wordEnd = e;
  }
  flush();

  // Consistentie-check tegen de gedeelde splitser: indexen moeten
  // 1-op-1 kloppen met wat de viewer rendert, anders geen timings.
  const expected = splitWords(text);
  if (timings.length !== expected.length) return null;

  return timings;
}
