import Link from "next/link";
import { requestResetAction } from "./actions";

type SearchParams = Promise<{ sent?: string; error?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const error = params.error;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-4xl">🔐</div>
          <h1 className="text-2xl font-bold">Wachtwoord vergeten</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vul je email in en we sturen je een link om een nieuw wachtwoord in
            te stellen.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-medium">Als er een account bestaat met dat adres,</p>
            <p className="mt-1">
              hebben we een reset-link verstuurd. Check je mailbox (en
              spam-folder). De link is 1 uur geldig.
            </p>
            <p className="mt-3 text-xs text-green-700/80">
              Tip voor dev: de link staat nu in de console van de dev-server
              (mail-verzending is nog niet geconfigureerd).
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:text-primary-light"
            >
              ← Terug naar inloggen
            </Link>
          </div>
        ) : (
          <form action={requestResetAction} className="space-y-4">
            {error === "missing" && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                Vul een emailadres in
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium"
              >
                E-mailadres
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="je@email.nl"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Reset-link versturen
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primary-light"
              >
                ← Terug naar inloggen
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
