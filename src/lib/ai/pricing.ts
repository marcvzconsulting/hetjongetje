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
 * Bronnen (peildatum 2026-09):
 *   - Anthropic Sonnet 5: $2 / MTok input, $10 / MTok output
 *     (output_tokens bevat ook de adaptieve denk-tokens)
 *   - fal.ai flux-pro/v1.1: ~$0.04 / image
 *   - fal.ai flux-lora (28 steps): ~$0.035 / image
 *   - fal.ai flux-2-pro/edit: $0.03 eerste MP + $0.015 per extra MP (in+uit
 *     samen); 1 MP uit + portret (1 MP) + karakterblad (~1,3 MP) = ~$0.07
 *     per image (schatting; het fal-dashboard is de waarheid)
 *   - fal.ai flux-2-pro portret + karakterblad: ~$0.09 eenmalig per goedkeuring
 *     (niet in deze per-verhaal-berekening)
 *   - fal.ai nano-banana-2/edit (1K): $0.08 / image
 *   - FX: 1 USD ≈ 0.92 EUR
 *
 * Note: deze totalen tellen NIET cache-discounts of fal.ai's
 * volume-staffel mee. Als je daar gebruik van gaat maken, refactor
 * naar een usage-object dat per-call de werkelijke billed-cents
 * meeneemt (dat is wat sommige providers in response-headers leveren).
 */

const USD_TO_EUR = 0.92;

// Anthropic — USD per miljoen tokens (input, output), per tekstmodel.
// Onbekend model (bv. nieuw via STORY_MODEL) → Sonnet 5-tarief + waarschuwing.
const CLAUDE_USD_PER_MTOK: Record<string, [number, number]> = {
  "claude-sonnet-5": [2, 10],
  "claude-opus-5": [5, 25],
  "claude-fable-5-1": [10, 50],
  // mogelijke server-side fallback-modellen
  "claude-opus-4-8": [5, 25],
  "claude-fable-5": [10, 50],
  "claude-sonnet-4-5-20250929": [3, 15],
};

export function claudeCentsPerToken(model: string | undefined): {
  input: number;
  output: number;
} {
  const rates = CLAUDE_USD_PER_MTOK[model ?? "claude-sonnet-5"];
  if (!rates) console.warn(`[pricing] Geen tarief voor ${model}; Sonnet 5-tarief gebruikt`);
  const [inUsd, outUsd] = rates ?? CLAUDE_USD_PER_MTOK["claude-sonnet-5"];
  return {
    input: (inUsd / 1_000_000) * USD_TO_EUR * 100,
    output: (outUsd / 1_000_000) * USD_TO_EUR * 100,
  };
}

/** Welk fal.ai-pad de illustraties maakte (zie illustration-generator.ts). */
export type IllustrationModel =
  | "pro"
  | "lora"
  | "flux2-ref"
  | "nano-banana-2-ref";

// fal.ai — cents per gegenereerde illustratie, per pad.
const CENTS_PER_IMAGE: Record<IllustrationModel, number> = {
  pro: 0.04 * USD_TO_EUR * 100, // ≈ 3.68 cent
  lora: 0.035 * USD_TO_EUR * 100, // ≈ 3.22 cent
  "flux2-ref": 0.07 * USD_TO_EUR * 100, // ≈ 6.44 cent (portret + blad als input)
  "nano-banana-2-ref": 0.08 * USD_TO_EUR * 100, // ≈ 7.36 cent
};

export type StoryAiUsage = {
  /** Anthropic input tokens uit `message.usage.input_tokens`. */
  inputTokens: number;
  /** Anthropic output tokens uit `message.usage.output_tokens`. */
  outputTokens: number;
  /** Gebruikt tekstmodel (message.model); bepaalt het tarief. */
  model?: string;
};

export type StoryImageUsage = {
  /** Aantal succesvolle fal.ai-images dat is teruggekomen. */
  imageCount: number;
  /** Gebruikt fal.ai-pad; bepaalt de prijs per beeld. */
  model: IllustrationModel;
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
    text.inputTokens * claudeCentsPerToken(text.model).input +
    text.outputTokens * claudeCentsPerToken(text.model).output;
  const imageCents = images.imageCount * CENTS_PER_IMAGE[images.model];
  return Math.round(textCents + imageCents);
}
