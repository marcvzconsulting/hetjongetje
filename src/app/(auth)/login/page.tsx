"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { AuthShell } from "@/components/v2/auth/AuthShell";
import { AuthField } from "@/components/v2/auth/AuthField";
import { GoogleSignInButton, AuthDivider } from "@/components/v2/auth/GoogleSignInButton";
import { requestMagicLinkAction } from "./actions";

/**
 * Only relative paths within our own app are allowed as a post-login
 * destination — never an absolute URL — so an attacker can't craft
 * a /login?callbackUrl=https://evil.example link.
 */
function safeCallback(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";
  const magicSent = searchParams.get("magic") === "sent";
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Onjuist e-mailadres of wachtwoord");
      } else {
        // Admins land directly on the admin overview, others on their
        // own dashboard.
        const session = await getSession();
        if (session?.user?.role === "admin") {
          router.push("/admin");
        } else if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      kicker="Welkom terug"
      heading={
        <>
          De verhalen wachten
          <br />
          <span style={{ fontStyle: "italic" }}>op jullie.</span>
        </>
      }
      rightKicker="Gisteravond"
      rightTitle="Noor en het maanlicht"
      rightMeta="BLZ 6 / 6 · UITGELEZEN"
      footer={
        <>
          Nog geen account?{" "}
          <Link
            href="/register"
            style={{ color: V2.ink, textDecoration: "underline" }}
          >
            Begin hier
          </Link>
        </>
      }
    >
      <GoogleSignInButton callbackUrl={callbackUrl ?? "/dashboard"} />
      <AuthDivider />

      {magicSent && (
        <div
          style={{
            background: "rgba(201, 169, 97, 0.14)",
            padding: 14,
            fontSize: 14,
            color: V2.ink,
            marginBottom: 20,
            fontFamily: V2.body,
            borderLeft: `2px solid ${V2.goldDeep}`,
          }}
        >
          ✓ Check je inbox. Als het emailadres bij ons bekend is, hebben
          we een login-link gestuurd. De link werkt 15 minuten.
        </div>
      )}

      {/* method="post" so a pre-hydration Enter falls back to a POST (which the
          page handler ignores) instead of a GET that puts the password in the
          URL. Once React hydrates, handleSubmit takes over via preventDefault. */}
      <form onSubmit={handleSubmit} method="post" action="/login">
        {justReset && !error && (
          <div
            style={{
              background: "rgba(93, 202, 165, 0.12)",
              padding: 12,
              fontSize: 14,
              color: V2.ink,
              marginBottom: 24,
              fontFamily: V2.body,
              borderLeft: `2px solid ${V2.goldDeep}`,
            }}
          >
            ✓ Wachtwoord gewijzigd. Log in met je nieuwe wachtwoord.
          </div>
        )}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          labelAside={
            <Link href="/forgot-password" style={{ color: "inherit" }}>
              Vergeten?
            </Link>
          }
        />

        <EBtn
          kind="primary"
          size="lg"
          type="submit"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {loading ? "Bezig met inloggen…" : "Inloggen →"}
        </EBtn>
      </form>

      {/* Passwordless alternative. Server action receives the email field
          and posts a magic-link. Submitting this form is the only way to
          log in as an admin (password login is blocked for that role). */}
      <form action={requestMagicLinkAction} style={{ marginTop: 18 }}>
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={!email}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: email ? "pointer" : "default",
            opacity: email ? 1 : 0.5,
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Liever geen wachtwoord typen? Stuur me een login-link.
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
