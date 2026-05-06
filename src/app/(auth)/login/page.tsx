"use client";

import { Suspense, useState } from "react";
import { useFormStatus } from "react-dom";
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
 * Sits inside the magic-link <form> so useFormStatus picks up the pending
 * state of that form's server action. The action does a Brevo round-trip
 * which can take a few seconds — without this the user sees nothing
 * happen and clicks again.
 */
function MagicLinkSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      style={{
        width: "100%",
        minHeight: 44,
        padding: "10px 16px",
        background: pending ? V2.paperDeep : V2.paper,
        color: V2.ink,
        border: `1px solid ${V2.paperShade}`,
        borderRadius: 2,
        fontFamily: V2.ui,
        fontSize: 14,
        fontWeight: 500,
        cursor: isDisabled ? "default" : "pointer",
        opacity: isDisabled && !pending ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "background .15s, border-color .15s",
      }}
    >
      {pending ? (
        <>
          <Spinner /> Bezig met versturen…
        </>
      ) : (
        <>✉ Stuur me een login-link via e-mail</>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 14,
        height: 14,
        border: `2px solid ${V2.paperShade}`,
        borderTopColor: V2.ink,
        borderRadius: "50%",
        display: "inline-block",
        animation: "ov-spin 0.7s linear infinite",
      }}
    />
  );
}

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
          log in as an admin (password login is blocked for that role).

          MagicLinkSubmit (above) shows a "Bezig met versturen…" state via
          useFormStatus while the Brevo round-trip is in flight — without
          that the user just sees nothing happen for a couple of seconds
          and tends to click again. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes ov-spin { to { transform: rotate(360deg); } }`,
        }}
      />
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 12,
            color: V2.inkMute,
            textAlign: "center",
            marginBottom: 10,
            letterSpacing: "0.04em",
          }}
        >
          of liever zonder wachtwoord
        </div>
        <form action={requestMagicLinkAction}>
          <input type="hidden" name="email" value={email} />
          <MagicLinkSubmit disabled={!email} />
        </form>
        <div
          style={{
            fontFamily: V2.body,
            fontSize: 12,
            color: V2.inkMute,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          We mailen je een login-link, geldig 15 minuten.
        </div>
      </div>
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
