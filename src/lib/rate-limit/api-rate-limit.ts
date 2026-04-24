import { NextResponse } from "next/server";
import { rateLimit, type RateLimitOptions } from "./rate-limit";

/**
 * Pre-configured rate limit buckets per action. Centralized here so the
 * limits aren't scattered across API routes.
 *
 * Tuning philosophy: generous enough that legitimate use never hits it,
 * tight enough that a buggy double-click or a curious tester doesn't
 * burn through €10 of AI credits in 3 minutes.
 */
export const RATE_LIMITS = {
  storyCreate: { limit: 5, windowSeconds: 60 * 60 }, // 5 per hour
  previewGenerate: { limit: 10, windowSeconds: 60 * 60 }, // 10 per hour
  photoUpload: { limit: 3, windowSeconds: 15 * 60 }, // 3 per 15 min
  // LoRA training costs ~€2-3 per run. Tight limit; will become a paid
  // one-time unlock in the future.
  loraTrain: { limit: 2, windowSeconds: 24 * 60 * 60 }, // 2 per 24 hours
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

function humanDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconden`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuut" : "minuten"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "uur" : "uur"}`;
}

const FRIENDLY_LABELS: Record<RateLimitAction, string> = {
  storyCreate: "verhalen",
  previewGenerate: "karakter-previews",
  photoUpload: "foto-uploads",
  loraTrain: "character-trainingen",
};

/**
 * Enforce a rate limit for the given action+user combination. Returns a
 * `NextResponse` (HTTP 429) when blocked, or `null` when the request may
 * proceed.
 *
 * Usage in an API route:
 *
 *   const blocked = await enforceRateLimit("storyCreate", userId);
 *   if (blocked) return blocked;
 */
export async function enforceRateLimit(
  action: RateLimitAction,
  userId: string
): Promise<NextResponse | null> {
  const { limit, windowSeconds } = RATE_LIMITS[action];
  const opts: RateLimitOptions = {
    key: `${action}:${userId}`,
    limit,
    windowSeconds,
  };

  const result = await rateLimit(opts);

  if (result.allowed) return null;

  const label = FRIENDLY_LABELS[action];
  const message = `Je hebt je limiet van ${limit} ${label} bereikt. Probeer het opnieuw over ${humanDuration(
    result.retryAfterSeconds
  )}.`;

  return NextResponse.json(
    {
      error: message,
      rateLimited: true,
      retryAfterSeconds: result.retryAfterSeconds,
      resetAt: result.resetAt.toISOString(),
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
      },
    }
  );
}
