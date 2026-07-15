"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn, IconV2 } from "@/components/v2";
import { AuthShell } from "@/components/v2/auth/AuthShell";
import { AuthField } from "@/components/v2/auth/AuthField";
import {
  GoogleSignInButton,
  AuthDivider,
  AuthTermsNotice,
} from "@/components/v2/auth/GoogleSignInButton";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }

    if (!termsAccepted) {
      setError(
        "Vink eerst aan dat je akkoord gaat met de algemene voorwaarden."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, termsAccepted: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registratie mislukt");
        return;
      }

      // Auto-login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      kicker="Welkom"
      heading={
        <>
          Begin het{" "}
          <span style={{ fontStyle: "italic" }}>avondritueel.</span>
        </>
      }
      rightKicker="Vanavond"
      rightTitle="Jullie eerste verhaal"
      rightMeta="BLZ 1 / 6 · WACHT OP JULLIE"
      footer={
        <>
          Al een account?{" "}
          <Link
            href="/login"
            style={{ color: V2.ink, textDecoration: "underline" }}
          >
            Log hier in
          </Link>
        </>
      }
    >
      <GoogleSignInButton label="Aanmelden met Google" />
      <AuthTermsNotice />
      <AuthDivider />

      <form onSubmit={handleSubmit} method="post" action="/register">
        {error && (
          <div
            style={{
              background: "rgba(196, 165, 168, 0.2)",
              padding: 12,
              fontSize: 14,
              color: V2.ink,
              marginBottom: 24,
              fontFamily: V2.body,
              borderLeft: `2px solid ${V2.rose}`,
            }}
          >
            {error}
          </div>
        )}

        <AuthField
          label="Jouw naam"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Bijv. Lisa"
        />

        <AuthField
          label="E-mail"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="je@email.nl"
        />

        <AuthField
          label="Wachtwoord"
          name="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Minimaal 10 tekens"
        />

        <AuthField
          label="Bevestig wachtwoord"
          name="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        <div style={{ margin: "4px 0 24px" }}>
          <ConsentCheck
            checked={termsAccepted}
            onChange={setTermsAccepted}
            label={
              <>
                Ik ga akkoord met de{" "}
                <Link
                  href="/voorwaarden"
                  target="_blank"
                  rel="noopener"
                  style={{
                    color: V2.ink,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  algemene voorwaarden
                </Link>{" "}
                en heb de{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener"
                  style={{
                    color: V2.ink,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  privacyverklaring
                </Link>{" "}
                gelezen.
              </>
            }
          />
        </div>

        <EBtn
          kind="primary"
          size="lg"
          type="submit"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {loading ? "Account aanmaken…" : "Account aanmaken →"}
        </EBtn>
      </form>
    </AuthShell>
  );
}

/**
 * Zelfde checkbox-patroon als ConsentCheck in LoraConsentForm: een
 * zichtbaar getekend vinkvak + verborgen echt checkbox-input, zodat
 * toetsenbord en screenreaders gewoon werken.
 */
function ConsentCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        cursor: "pointer",
        fontFamily: V2.body,
        fontSize: 14,
        lineHeight: 1.55,
        color: V2.ink,
      }}
    >
      <span
        role="checkbox"
        aria-checked={checked}
        style={{
          flexShrink: 0,
          marginTop: 2,
          width: 20,
          height: 20,
          border: `1.5px solid ${checked ? V2.ink : V2.paperShade}`,
          background: checked ? V2.ink : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <IconV2 name="check" size={12} color={V2.paper} />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      />
      <span>{label}</span>
    </label>
  );
}
