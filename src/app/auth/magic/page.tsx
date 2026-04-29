"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { AuthShell } from "@/components/v2/auth/AuthShell";

function VerifyMagicLink() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        if (!cancelled) setStatus("error");
        return;
      }
      const result = await signIn("magic-link", {
        token,
        redirect: false,
      });
      if (cancelled) return;
      if (result?.error || !result?.ok) {
        setStatus("error");
        return;
      }
      // Land admins on /admin, everyone else on /dashboard.
      const session = await getSession();
      if (cancelled) return;
      if (session?.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (status === "error") {
    return (
      <AuthShell
        kicker="Login-link"
        heading={
          <>
            Deze link werkt
            <br />
            <span style={{ fontStyle: "italic" }}>niet meer.</span>
          </>
        }
        rightKicker="Even iets nieuws"
        rightTitle="Vraag een verse link aan"
        rightMeta="LOGIN · MAGIC LINK"
      >
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 16,
            lineHeight: 1.6,
            color: V2.inkSoft,
            margin: "0 0 24px",
          }}
        >
          De link is verlopen, al gebruikt, of ongeldig. Magic-links werken
          maar één keer en zijn 15 minuten geldig — vraag een verse aan en
          probeer opnieuw.
        </p>
        <Link
          href="/login"
          style={{
            color: V2.ink,
            textDecoration: "underline",
            textUnderlineOffset: 4,
            fontFamily: V2.ui,
            fontSize: 14,
          }}
        >
          ← Terug naar inloggen
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="Login-link"
      heading={
        <>
          Even bezig
          <br />
          <span style={{ fontStyle: "italic" }}>met inloggen…</span>
        </>
      }
      rightKicker="Veilig"
      rightTitle="Geen wachtwoord nodig"
      rightMeta="VERIFICATIE · LOPEND"
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 16,
          color: V2.inkSoft,
          margin: 0,
        }}
      >
        Een ogenblik geduld, we controleren je login-link.
      </p>
    </AuthShell>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyMagicLink />
    </Suspense>
  );
}
