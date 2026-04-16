/**
 * Next.js server-side instrumentation entry point.
 * Loads the right Sentry config for the runtime we're in.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Re-export Sentry's capture for uncaught server-side errors (React Server
// Components, Route Handlers, Server Actions). Without this, errors that
// Next.js swallows internally never reach Sentry.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
