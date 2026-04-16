/**
 * Sentry client-side setup. Runs in the browser before hydration.
 * Captures uncaught errors, unhandled promise rejections, and router events.
 */
import * as Sentry from "@sentry/nextjs";
import { scrubPII } from "./lib/monitoring/scrub-pii";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Keep this low in prod — performance tracing eats up the free tier fast
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replays are powerful but also privacy-heavy. Disable for now;
  // we can selectively enable them for error sessions later with masking.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  sendDefaultPii: false,
  beforeSend(event) {
    return scrubPII(event);
  },

  ignoreErrors: [
    // Browser extensions and ad-blockers throw these; not our problem
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    // Sentry noise
    "Failed to fetch",
  ],
});

// Track navigation so errors can be correlated with user journey
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
