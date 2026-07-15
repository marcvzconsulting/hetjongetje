"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { V2 } from "./tokens";

const STORAGE_KEY = "cookieConsent";
// Bump deze als de tekst/scope significant wijzigt — gebruikers krijgen
// dan opnieuw de banner. Voor nu: v1 = strikt-noodzakelijke cookies +
// kennisgeving, geen tracking.
const VERSION = "1";

export function CookieBanner() {
  // We renderen niets tot we client-side weten of de banner getoond moet
  // worden. Anders flitst 'ie kort voor users die al akkoord hebben gegeven.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // queueMicrotask defers the setState uit de effect-body — voorkomt de
    // "set-state-in-effect"-lint-warning en is voor onze use-case
    // (eenmalige localStorage-lookup) gedragsmatig identiek.
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored !== VERSION) setVisible(true);
      } catch {
        // localStorage geweigerd (private mode bv.) — toon de banner
        // dan niet, anders verschijnt 'ie elke pagina-laad opnieuw.
      }
    });
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, VERSION);
    } catch {
      // negeer
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-melding"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 1000,
        maxWidth: 640,
        margin: "0 auto",
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        padding: "20px 24px",
        fontFamily: V2.body,
        color: V2.ink,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: V2.inkSoft,
        }}
      >
        We gebruiken alleen <strong style={{ color: V2.ink, fontWeight: 600 }}>
        strikt-noodzakelijke cookies</strong>{" "}
        — voor inloggen en beveiliging. We doen niet aan tracking of
        advertentie-cookies. Op de{" "}
        <Link
          href="/cookies"
          style={{
            color: V2.goldDeep,
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          cookie-pagina
        </Link>{" "}
        lees je precies welke cookies dat zijn.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={accept}
          style={{
            padding: "8px 20px",
            background: V2.ink,
            color: V2.paper,
            border: "none",
            fontFamily: V2.ui,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.2,
            cursor: "pointer",
          }}
        >
          Akkoord
        </button>
      </div>
    </div>
  );
}
