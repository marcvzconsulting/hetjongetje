import { prisma } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  /** How many requests remain in the current window (0 or more). */
  remaining: number;
  /** The request limit per window. */
  limit: number;
  /** Number of seconds until the window resets. */
  retryAfterSeconds: number;
  /** Timestamp at which the window resets. */
  resetAt: Date;
}

export interface RateLimitOptions {
  /** Unique key for this bucket, e.g. `"story-create:<userId>"`. */
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/**
 * Fixed-window rate limiting against our own Postgres.
 *
 * One atomic UPSERT increments the counter or resets the window when it has
 * expired. Concurrent requests racing for the same key will still serialize
 * correctly because Postgres takes a row lock for the UPDATE.
 *
 * Kept simple on purpose: for MVP traffic this is cheaper and easier than
 * wiring up Redis/Upstash, and it keeps rate-limit data in the same region
 * as everything else (EU).
 */
export async function rateLimit(
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = opts;

  const rows = await prisma.$queryRaw<
    Array<{ count: number; window_start: Date }>
  >`
    INSERT INTO rate_limits (key, count, window_start, updated_at)
    VALUES (${key}, 1, NOW(), NOW())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < NOW() - (${windowSeconds}::int * INTERVAL '1 second')
        THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < NOW() - (${windowSeconds}::int * INTERVAL '1 second')
        THEN NOW()
        ELSE rate_limits.window_start
      END,
      updated_at = NOW()
    RETURNING count, window_start
  `;

  const { count, window_start } = rows[0];
  const resetAt = new Date(window_start.getTime() + windowSeconds * 1000);
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((resetAt.getTime() - Date.now()) / 1000)
  );

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    retryAfterSeconds,
    resetAt,
  };
}
