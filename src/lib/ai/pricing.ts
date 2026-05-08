/**
 * Per-call AI-pricing voor verhaal-generatie. Cijfers in EUR cents per
 * eenheid; geconverteerd vanuit de Anthropic + fal.ai prijslijsten met
 * een vaste FX-aanname (USD → EUR ≈ 0.92).
 *
 * Tweak deze constanten als de tarieven veranderen — er staat geen
 * automatische valuta-koppeling. Klein detail: de cents zijn ints op
 * de uiteindelijke som, intermediair rekenen we in float voor
 * sub-cent precisie.
 *
 * Bronnen (peildatum 2026-05):
 *   - Anthropic Sonnet 4.5: $3 / MTok input, $15 / MTok output
 *   - fal.ai flux-pro/v1.1: ~$0.04 / image
 *   - fal.ai flux-lora (28 steps): ~$0.035 / image
 *   - FX: 1 USD ≈ 0.92 EUR
 *
 * Note: deze totalen tellen NIET cache-discounts of fal.ai's
 * volume-staffel mee. Als je daar gebruik van gaat maken, refactor
 * naar een usage-object dat per-call de werkelijke billed-cents
 * meeneemt (dat is wat sommige providers in response-headers leveren).
 */

const USD_TO_EUR = 0.92;

// Anthropic — cents per token (sub-cent precision, totaal floors op cent).
const CENTS_PER_INPUT_TOKEN_CLAUDE_SONNET_45 =
  (3 / 1_000_000) * USD_TO_EUR * 100;
const CENTS_PER_OUTPUT_TOKEN_CLAUDE_SONNET_45 =
  (15 / 1_000_000) * USD_TO_EUR * 100;

// fal.ai — cents per gegenereerde illustratie.
const CENTS_PER_IMAGE_FLUX_PRO = 0.04 * USD_TO_EUR * 100; // ≈ 3.68 cent
const CENTS_PER_IMAGE_FLUX_LORA = 0.035 * USD_TO_EUR * 100; // ≈ 3.22 cent

export type StoryAiUsage = {
  /** Anthropic input tokens uit `message.usage.input_tokens`. */
  inputTokens: number;
  /** Anthropic output tokens uit `message.usage.output_tokens`. */
  outputTokens: number;
};

export type StoryImageUsage = {
  /** Aantal succesvolle fal.ai-images dat is teruggekomen. */
  imageCount: number;
  /** "lora" als we het flux-lora pad gebruikten, anders "pro". */
  model: "lora" | "pro";
};

/**
 * Bereken totale AI-kosten van één verhaal in eurocenten (afgerond).
 * Gebruik op het moment dat zowel tekst- als illustratie-generatie
 * klaar zijn.
 */
export function computeStoryAiCostCents(
  text: StoryAiUsage,
  images: StoryImageUsage,
): number {
  const textCents =
    text.inputTokens * CENTS_PER_INPUT_TOKEN_CLAUDE_SONNET_45 +
    text.outputTokens * CENTS_PER_OUTPUT_TOKEN_CLAUDE_SONNET_45;
  const imagePerUnit =
    images.model === "lora"
      ? CENTS_PER_IMAGE_FLUX_LORA
      : CENTS_PER_IMAGE_FLUX_PRO;
  const imageCents = images.imageCount * imagePerUnit;
  return Math.round(textCents + imageCents);
}
