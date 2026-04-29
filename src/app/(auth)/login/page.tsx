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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";
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
      <GoogleSignInButton />
      <AuthDivider />

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
