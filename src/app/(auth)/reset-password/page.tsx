import Link from "next/link";
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

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-4xl">🔐</div>
          <h1 className="text-2xl font-bold">Nieuw wachtwoord instellen</h1>
        </div>

        {!tokenValid ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">Deze link werkt niet meer.</p>
            <p className="mt-1">
              Hij is mogelijk verlopen of al gebruikt. Vraag een nieuwe link
              aan.
            </p>
            <Link
              href="/forgot-password"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:text-primary-light"
            >
              Nieuwe link aanvragen →
            </Link>
          </div>
        ) : (
          <form action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            {errorKey && ERRORS[errorKey] && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {ERRORS[errorKey]}
              </div>
            )}

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1 block text-sm font-medium"
              >
                Nieuw wachtwoord
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Minimaal 6 tekens"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium"
              >
                Bevestig nieuw wachtwoord
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Wachtwoord instellen
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
