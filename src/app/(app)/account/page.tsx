import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutButton } from "@/components/ui/sign-out-button";
import {
  updateProfileAction,
  updateAddressAction,
  changePasswordAction,
  deleteAccountAction,
} from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const SAVED_MESSAGES: Record<string, string> = {
  profile: "Persoonsgegevens opgeslagen",
  address: "Adres opgeslagen",
  password: "Wachtwoord gewijzigd",
};

const ERROR_MESSAGES: Record<string, string> = {
  profile_missing: "Naam en email zijn verplicht",
  profile_email_invalid: "Ongeldig emailadres",
  profile_email_taken: "Dit emailadres is al in gebruik",
  password_missing: "Vul alle wachtwoordvelden in",
  password_too_short: "Nieuw wachtwoord moet minimaal 6 tekens zijn",
  password_mismatch: "De wachtwoorden komen niet overeen",
  password_wrong_current: "Huidig wachtwoord is onjuist",
  delete_missing: "Vul wachtwoord en email in om te bevestigen",
  delete_email_mismatch: "Het ingevulde email komt niet overeen",
  delete_wrong_password: "Wachtwoord is onjuist",
  delete_admin_blocked:
    "Admin-accounts kunnen niet via deze pagina verwijderd worden",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-muted bg-white p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");

  const params = await searchParams;
  const savedMessage = params.saved ? SAVED_MESSAGES[params.saved] : null;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <div className="min-h-full px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              ← Terug naar dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Mijn account</h1>
          </div>
          <SignOutButton />
        </div>

        {savedMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✓ {savedMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            ✗ {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          <Section
            title="Persoonsgegevens"
            description="Deze gegevens gebruiken we om contact met je op te nemen."
          >
            <form action={updateProfileAction} className="grid gap-4">
              <Field
                label="Naam"
                name="name"
                defaultValue={user.name}
                required
                autoComplete="name"
              />
              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                autoComplete="email"
              />
              <Field
                label="Telefoon"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                autoComplete="tel"
                placeholder="Optioneel"
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Taal</span>
                <select
                  name="locale"
                  defaultValue={user.locale}
                  className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="nl">Nederlands</option>
                  <option value="en">English</option>
                </select>
              </label>
              <div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </Section>

          <Section
            title="Adres"
            description="Nodig als je later een gedrukt verhalenboek wilt bestellen."
          >
            <form action={updateAddressAction} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field
                    label="Straat"
                    name="street"
                    defaultValue={user.street ?? ""}
                    autoComplete="address-line1"
                  />
                </div>
                <Field
                  label="Huisnummer"
                  name="houseNumber"
                  defaultValue={user.houseNumber ?? ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Postcode"
                  name="postalCode"
                  defaultValue={user.postalCode ?? ""}
                  autoComplete="postal-code"
                  placeholder="1234 AB"
                />
                <Field
                  label="Plaats"
                  name="city"
                  defaultValue={user.city ?? ""}
                  autoComplete="address-level2"
                />
              </div>
              <Field
                label="Land"
                name="country"
                defaultValue={user.country ?? "Nederland"}
                autoComplete="country-name"
              />
              <div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </Section>

          <Section
            title="Wachtwoord wijzigen"
            description="Kies een wachtwoord van minimaal 6 tekens."
          >
            <form action={changePasswordAction} className="grid gap-4">
              <Field
                label="Huidig wachtwoord"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
              <Field
                label="Nieuw wachtwoord"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
              />
              <Field
                label="Bevestig nieuw wachtwoord"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
              />
              <div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
                >
                  Wachtwoord wijzigen
                </button>
              </div>
            </form>
          </Section>

          <section className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
            <h2 className="text-lg font-semibold text-red-900">Gevarenzone</h2>
            <p className="mt-1 text-sm text-red-800/80">
              Je account verwijderen is permanent. Al je kindprofielen, verhalen
              en boeken worden voor altijd verwijderd.
            </p>
            {user.role === "admin" ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
                Admin-accounts kunnen niet via deze pagina verwijderd worden.
              </p>
            ) : (
              <details className="mt-4">
                <summary className="inline-block cursor-pointer rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">
                  Account verwijderen
                </summary>
                <form
                  action={deleteAccountAction}
                  className="mt-4 grid gap-4 rounded-xl border border-red-200 bg-white p-4"
                >
                  <p className="text-sm text-red-800">
                    Typ je email <strong>{user.email}</strong> en je huidige
                    wachtwoord om te bevestigen.
                  </p>
                  <Field
                    label="Email ter bevestiging"
                    name="emailConfirm"
                    type="email"
                    required
                    autoComplete="off"
                  />
                  <Field
                    label="Huidig wachtwoord"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                  <div>
                    <button
                      type="submit"
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Account definitief verwijderen
                    </button>
                  </div>
                </form>
              </details>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
