"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Sync de ingelogde user als context naar Sentry, zodat errors gekoppeld
 * worden aan een user-id. Geen email of name — die zou onze `scrubPII`-
 * filter er sowieso uitstrippen, maar we sturen 'm voor de zekerheid ook
 * niet mee.
 *
 * Geplaatst binnen AppShell en AdminShell zodat elke authenticated-page
 * 'm automatisch krijgt. Geen SessionProvider nodig — we lezen de session
 * via NextAuth's built-in `/api/auth/session`-endpoint.
 */
export function SentryUserSync() {
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { user?: { id?: string } };
        if (data?.user?.id) {
          Sentry.setUser({ id: data.user.id });
        } else {
          Sentry.setUser(null);
        }
      } catch {
        // Sentry-context-koppeling mag de app nooit blokkeren.
      }
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
