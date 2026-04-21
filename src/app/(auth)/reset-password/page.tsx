import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { AuthShell } from "@/components/v2/auth/AuthShell";
import { AuthField } from "@/components/v2/auth/AuthField";
import { validateResetToken } from "@/lib/password-reset";
import { resetPasswordAction } from "./actions";

type SearchParams = Promise<{ token?: string; error?: string }>;

const ERRORS: Record<string, string> = {
  missing_token: "Geen reset-token gevonden in de link",
  missing: "Vul beide wachtwoordvelden in",
  mismatch: "De wachtwoorden komen niet overeen",
  too_short: "Wachtwoord moet minimaal 6 tekens zijn",
  invalid: "Deze reset-link is ongeldig of verlopen",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const errorKey = params.error ?? "";

  const validation = token ? await validateResetToken(token) : null;
  const tokenValid = Boolean(validation);

  if (!tokenValid) {
    return (
      <AuthShell
        kicker="Oeps"
        heading={
          <>
            Deze link werkt{" "}
            <span style={{ fontStyle: "italic" }}>niet meer.</span>
          </>
        }
        rightKicker="Verlopen"
        rightTitle="Vraag een nieuwe aan"
        rightMeta="LINKS VERVALLEN NA 1 UUR"
        footer={
          <Link
            href="/login"
            style={{ color: V2.ink, textDecoration: "underline" }}
          >
            ← Terug naar inloggen
          </Link>
        }
      >
        <div
          style={{
            background: "rgba(196, 165, 168, 0.2)",
            padding: 20,
            fontSize: 15,
            color: V2.inkSoft,
            fontFamily: V2.body,
            lineHeight: 1.55,
            borderLeft: `2px solid ${V2.rose}`,
            marginBottom: 28,
          }}
        >
          <p style={{ margin: 0, fontWeight: 500, color: V2.ink }}>
            Deze link werkt niet meer.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            Hij is mogelijk verlopen of al gebruikt. Vraag hieronder een
            nieuwe aan.
          </p>
        </div>
        <EBtn
          kind="primary"
          size="lg"
          href="/forgot-password"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Nieuwe link aanvragen →
        </EBtn>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="Nieuwe sleutel"
      heading={
        <>
          Kies een nieuw{" "}
          <span style={{ fontStyle: "italic" }}>wachtwoord.</span>
        </>
      }
      rightKicker="Bijna klaar"
      rightTitle="Dan kun je weer voorlezen"
      rightMeta="HIERNA DIRECT INLOGGEN"
    >
      <form action={resetPasswordAction}>
        <input type="hidden" name="token" value={token} />

        {errorKey && ERRORS[errorKey] && (
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
            {ERRORS[errorKey]}
          </div>
        )}

        <AuthField
          label="Nieuw wachtwoord"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Minimaal 6 tekens"
        />

        <AuthField
          label="Bevestig wachtwoord"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
        />

        <EBtn
          kind="primary"
          size="lg"
          type="submit"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Wachtwoord instellen →
        </EBtn>
      </form>
    </AuthShell>
  );
}
