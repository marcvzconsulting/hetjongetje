"use client";

import { useState } from "react";
import { V2 } from "@/components/v2/tokens";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status.kind === "loading") return;
    setStatus({ kind: "loading" });

    try {
      const res = await fetch("/api/newsletter/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data.error ?? "Er ging iets mis. Probeer het later opnieuw.",
        });
        return;
      }
      setStatus({ kind: "ok" });
      setEmail("");
    } catch {
      setStatus({
        kind: "error",
        message: "Geen verbinding. Probeer het later opnieuw.",
      });
    }
  }

  if (status.kind === "ok") {
    return (
      <p
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: 15,
          color: V2.ink,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Bedankt. Je staat op de lijst.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 320,
        width: "100%",
      }}
    >
      <span
        style={{
          fontFamily: V2.mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: V2.inkMute,
        }}
      >
        Hou ons in de gaten
      </span>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          borderBottom: `1px solid ${V2.paperShade}`,
          paddingBottom: 4,
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="je@email.nl"
          aria-label="E-mailadres voor de nieuwsbrief"
          disabled={status.kind === "loading"}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
            outline: "none",
            padding: "8px 0",
          }}
        />
        <button
          type="submit"
          disabled={status.kind === "loading"}
          style={{
            border: "none",
            background: "transparent",
            color: V2.ink,
            fontFamily: V2.ui,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.2,
            cursor: status.kind === "loading" ? "default" : "pointer",
            padding: "8px 4px",
            opacity: status.kind === "loading" ? 0.5 : 1,
          }}
        >
          {status.kind === "loading" ? "..." : "Aanmelden →"}
        </button>
      </div>
      {/* Honeypot — bots fill this, humans don't see it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />
      {status.kind === "error" && (
        <span
          style={{
            fontFamily: V2.body,
            fontSize: 12,
            color: V2.heart,
            marginTop: 4,
          }}
        >
          {status.message}
        </span>
      )}
    </form>
  );
}
