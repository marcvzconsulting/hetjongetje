"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { AuthShell } from "@/components/v2/auth/AuthShell";
import { AuthField } from "@/components/v2/auth/AuthField";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
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
