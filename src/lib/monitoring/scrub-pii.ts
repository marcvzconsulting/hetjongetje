import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Strip personally identifiable information from Sentry events before they
 * leave our servers. For Ons Verhaaltje this is a hard requirement because
 * our data includes children's names, photos, and bedtime stories about them.
 *
 * Rule of thumb: if it could identify a child, remove it.
 *
 * Sentry's `sendDefaultPii: false` handles IPs and headers. This function
 * covers the app-specific fields that Sentry doesn't know about.
 */

// Keys whose values are scrubbed wherever they appear in the event.
const SENSITIVE_KEYS = new Set([
  // Auth
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "secret",
  "authorization",
  "cookie",

  // Child identity
  "childName",
  "child_name",
  "name", // on child/user/character context
  "dateOfBirth",
  "date_of_birth",

  // Character appearance — describes the real child
  "hairColor",
  "hair_color",
  "hairStyle",
  "hair_style",
  "eyeColor",
  "eye_color",
  "skinColor",
  "skin_color",
  "characterPrompt",
  "character_prompt",
  "approvedCharacterPrompt",
  "approved_character_prompt",
  "mainCharacterDescription",

  // Child interests / personal details (free-text about the real child)
  "interests",
  "fears",
  "pets",
  "friends",
  "favoriteThings",
  "favorite_things",
  "mainCharacterDescription",
  "main_character_description",

  // Story content (may contain the child's real name + personal details)
  "text",
  "story",
  "pages",
  "title",
  "subtitle",
  "characterBible",
  "character_bible",
  "generationParams",
  "generation_params",

  // LoRA (real child's face / trained model)
  "loraUrl",
  "lora_url",
  "referenceImages",
  "reference_images",

  // Photo uploads — never leave our systems
  "photo",
  "image",
  "imageData",
  "base64",
  "file",

  // Contact / e-mail logging
  "email",
  "toEmail",
  "toName",
  "subject",
  "phone",
  "phoneNumber",
]);

const REDACTED = "[redacted]";
const MAX_DEPTH = 8;

function scrubValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((v) => scrubValue(v, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = scrubValue(v, depth + 1);
    }
  }
  return out;
}

/**
 * Redact a URL string: drop the query (can carry emails/tokens) and mask
 * any long opaque path segment — share tokens (~22 chars), reset/magic
 * tokens, UUIDs (36 chars) — so a valid token never lands in Sentry via a
 * transaction name or request URL.
 */
export function redactUrlString(url: string): string {
  const [path] = url.split("?");
  return path
    .split("/")
    .map((seg) => (seg.length >= 20 ? REDACTED : seg))
    .join("/");
}

export function scrubPII(event: ErrorEvent): ErrorEvent | null {
  // User context: keep only a stable id, never name/email
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  // Request body / query / URL
  if (event.request) {
    if (event.request.data) {
      event.request.data = scrubValue(event.request.data, 0);
    }
    if (event.request.query_string) {
      // Query strings can contain names; strip them to be safe
      event.request.query_string = REDACTED;
    }
    if (typeof event.request.url === "string") {
      event.request.url = redactUrlString(event.request.url);
    }
  }

  // Breadcrumbs: scrub data payloads but keep messages (helpful for debugging)
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => {
      if (b.data) b.data = scrubValue(b.data, 0) as typeof b.data;
      return b;
    });
  }

  // Extra context + tags
  if (event.extra) event.extra = scrubValue(event.extra, 0) as typeof event.extra;
  if (event.contexts) {
    event.contexts = scrubValue(event.contexts, 0) as typeof event.contexts;
  }

  return event;
}

/**
 * Transaction (performance) events carry URLs and route params too — a
 * share-token in a transaction NAME (`/s/<token>`) would leak just as
 * badly as in an error. `beforeSend` only fires for errors, so wire this
 * into `beforeSendTransaction`.
 */
type TransactionLike = {
  transaction?: string;
  request?: { url?: string; query_string?: unknown };
  spans?: Array<{ description?: string }>;
};

export function scrubTransactionPII<T extends TransactionLike>(event: T): T {
  if (typeof event.transaction === "string") {
    event.transaction = redactUrlString(event.transaction);
  }
  if (event.request) {
    if (typeof event.request.url === "string") {
      event.request.url = redactUrlString(event.request.url);
    }
    if (event.request.query_string) {
      event.request.query_string = REDACTED;
    }
  }
  if (Array.isArray(event.spans)) {
    for (const span of event.spans) {
      if (typeof span.description === "string") {
        span.description = redactUrlString(span.description);
      }
    }
  }
  return event;
}
