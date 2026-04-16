/**
 * Sentry config for the Edge runtime (middleware, edge route handlers).
 * Loaded by src/instrumentation.ts.
 */
import * as Sentry from "@sentry/nextjs";
import { scrubPII } from "./src/lib/monitoring/scrub-pii";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubPII(event);
  },
  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
});
