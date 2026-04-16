import { NextResponse } from "next/server";

/**
 * Dev-only endpoint to verify Sentry is wired up. Throws an error on purpose
 * so you can confirm it shows up in the Sentry dashboard.
 *
 * Usage: visit /api/sentry-test in the browser after setting NEXT_PUBLIC_SENTRY_DSN.
 *
 * Disabled in production to prevent accidental noise in your error inbox.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  throw new Error(
    "Sentry test error — als je dit in Sentry ziet, werkt alles!"
  );
}
