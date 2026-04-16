/**
 * Sentry server-side config (Node.js runtime).
 * Loaded by src/instrumentation.ts via the Next.js `register()` hook.
 */
import * as Sentry from "@sentry/nextjs";
import { scrubPII } from "./src/lib/monitoring/scrub-pii";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Sample everything in dev, tune later for prod if volume explodes
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // We care about errors, not deep request tracing, so keep spans lean
  enableLogs: false,

  // Let Sentry scrub common PII patterns automatically (IPs, headers, etc.)
  sendDefaultPii: false,

  // Custom scrubbing for Ons Verhaaltje-specific fields:
  // child names, story text, prompts, photo data must never leave our systems.
  beforeSend(event) {
    return scrubPII(event);
  },

  // Noisy expected errors we don't want to be paged about
  ignoreErrors: [
    // fal.ai timeouts — already logged locally and story gen has its own fallback
    /fal\.ai.*timed out/i,
    // Next.js redirect + not-found signals (not real errors)
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
