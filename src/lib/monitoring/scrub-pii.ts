import type { ErrorEvent, EventHint } from "@sentry/nextjs";

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

  // Story content (may contain the child's real name + personal details)
  "text",
  "story",
  "pages",
  "characterBible",
  "character_bible",
  "generationParams",
  "generation_params",

  // Photo uploads — never leave our systems
  "photo",
  "image",
  "imageData",
  "base64",
  "file",

  // Contact
  "email",
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

export function scrubPII(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  // User context: keep only a stable id, never name/email
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  // Request body / query / headers
  if (event.request) {
    if (event.request.data) {
      event.request.data = scrubValue(event.request.data, 0);
    }
    if (event.request.query_string) {
      // Query strings can contain names; strip them to be safe
      event.request.query_string = REDACTED;
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
