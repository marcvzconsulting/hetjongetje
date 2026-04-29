/**
 * Sanitizers for free-text user fields that get concatenated into LLM
 * or image-generation prompts. Goal: mitigate prompt-injection from
 * parents who put adversarial text in their child's profile.
 *
 * Strategy:
 *  1. Strip newlines and other control characters — most injection
 *     attempts rely on `\n` to start a fresh "instruction" line.
 *  2. Cap length so a single field can't dominate the prompt budget.
 *  3. Trim outer whitespace.
 *
 * We deliberately do NOT pattern-match phrases like "ignore previous"
 * because that yields false-negatives. The newline strip + length cap
 * defeats the most common practical attacks.
 */

const MAX_SHORT_LEN = 80; // single-word-ish: name, type, color
const MAX_DESC_LEN = 280; // descriptions, interests

// All ASCII control characters (0x00-0x1F) plus DEL (0x7F). Covers
// \n, \r, \t, NUL — the building blocks of "break out of the
// prompt block" injection attempts.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

function clean(value: string, maxLen: number): string {
  return value
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Sanitize a short identifier-like field (name, color, type, etc.). */
export function sanitizePromptShort(value: string | null | undefined): string {
  if (!value) return "";
  return clean(value, MAX_SHORT_LEN);
}

/** Sanitize a longer free-text field (descriptions, character notes). */
export function sanitizePromptDescription(
  value: string | null | undefined
): string {
  if (!value) return "";
  return clean(value, MAX_DESC_LEN);
}
