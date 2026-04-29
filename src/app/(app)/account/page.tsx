import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";
import { AppShell } from "@/components/v2/app/AppShell";
import {
  updateProfileAction,
  updateAddressAction,
  changePasswordAction,
  deleteAccountAction,
  toggleNewsletterAction,
} from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const SAVED_MESSAGES: Record<string, string> = {
  profile: "Persoonsgegevens opgeslagen",
  address: "Adres opgeslagen",
  password: "Wachtwoord gewijzigd",
  newsletter_on: "Je staat op de nieuwsbrief",
  newsletter_off: "Je bent uitgeschreven van de nieuwsbrief",
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

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true, _count: { select: { children: true } } },
  });
  if (!user) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  const credits = gate && !gate.isAdmin ? gate.storyCredits : null;

  // Count total stories across all children
  const storyCount = await prisma.story.count({
    where: { childProfile: { userId: user.id } },
  });

  const params = await searchParams;
  const savedMessage = params.saved ? SAVED_MESSAGES[params.saved] : null;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <AppShell
      userName={user.name}
      credits={credits}
      nav={[
        { label: "Bibliotheek", href: "/dashboard" },
        { label: "Account", href: "/account", active: true },
      ]}
    >
      <div
        className="app-page-pad"
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "40px 40px 80px",
        }}
      >
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            marginBottom: 28,
          }}
        >
          <Link
            href="/dashboard"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            ← Terug naar bibliotheek
          </Link>
        </div>

        <div style={{ marginBottom: 40 }}>
          <Kicker>Mijn account</Kicker>
          <h1
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(36px, 4.4vw, 44px)",
              letterSpacing: -1.2,
              margin: "12px 0 0",
              lineHeight: 1.05,
            }}
          >
            Hallo,{" "}
            <span style={{ fontStyle: "italic" }}>
              {user.name.split(" ")[0]}
            </span>
            .
          </h1>
        </div>

        {/* Flash messages */}
        {savedMessage && <FlashSaved>{savedMessage}</FlashSaved>}
        {errorMessage && <FlashError>{errorMessage}</FlashError>}

        {/* Subscription hero */}
        <SubscriptionHero
          plan={user.subscription?.plan ?? "free"}
          status={user.subscription?.status ?? "active"}
          endsAt={user.subscription?.endsAt ?? null}
          storyCount={storyCount}
          childrenCount={user._count.children}
          credits={credits}
          isAdmin={gate?.isAdmin ?? false}
        />

        {/* Profile */}
        <Section title="Persoonsgegevens" meta="Voor contact en verzending">
          <form action={updateProfileAction}>
            <FieldRow>
              <EField
                label="Naam"
                name="name"
                defaultValue={user.name}
                required
                autoComplete="name"
              />
              <EField
                label="E-mail"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                autoComplete="email"
              />
            </FieldRow>
            <FieldRow>
              <EField
                label="Telefoon"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                autoComplete="tel"
                placeholder="Optioneel"
              />
              <div>
                <FieldLabel>Taal</FieldLabel>
                <select
                  name="locale"
                  defaultValue={user.locale}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    border: "none",
                    borderBottom: `1px solid ${V2.paperShade}`,
                    background: "transparent",
                    fontSize: 16,
                    fontFamily: V2.body,
                    color: V2.ink,
                    outline: "none",
                  }}
                >
                  <option value="nl">Nederlands</option>
                  <option value="en">English</option>
                </select>
              </div>
            </FieldRow>
            <div style={{ marginTop: 28 }}>
              <EBtn kind="primary" size="md" type="submit">
                Opslaan →
              </EBtn>
            </div>
          </form>
        </Section>

        {/* Address */}
        <Section
          title="Adres"
          meta="Nodig als je later een boekje wilt bestellen"
        >
          <form action={updateAddressAction}>
            <FieldRow threeTwo>
              <EField
                label="Straat"
                name="street"
                defaultValue={user.street ?? ""}
                autoComplete="address-line1"
              />
              <EField
                label="Huisnummer"
                name="houseNumber"
                defaultValue={user.houseNumber ?? ""}
              />
            </FieldRow>
            <FieldRow>
              <EField
                label="Postcode"
                name="postalCode"
                defaultValue={user.postalCode ?? ""}
                autoComplete="postal-code"
                placeholder="1234 AB"
              />
              <EField
                label="Plaats"
                name="city"
                defaultValue={user.city ?? ""}
                autoComplete="address-level2"
              />
            </FieldRow>
            <div>
              <EField
                label="Land"
                name="country"
                defaultValue={user.country ?? "Nederland"}
                autoComplete="country-name"
              />
            </div>
            <div style={{ marginTop: 28 }}>
              <EBtn kind="primary" size="md" type="submit">
                Opslaan →
              </EBtn>
            </div>
          </form>
        </Section>

        {/* Newsletter */}
        <Section
          title="Nieuwsbrief"
          meta="Af en toe een mailtje. Geen spam, beloofd."
        >
          <form action={toggleNewsletterAction}>
            <input
              type="hidden"
              name="optIn"
              value={user.newsletterOptIn ? "0" : "1"}
            />
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 15,
                color: V2.inkSoft,
                margin: "0 0 18px",
                lineHeight: 1.6,
                maxWidth: "60ch",
              }}
            >
              {user.newsletterOptIn ? (
                <>
                  Je staat momenteel{" "}
                  <strong style={{ color: V2.ink }}>aangemeld</strong> voor
                  de nieuwsbrief. Je ontvangt af en toe een update over
                  nieuwe functies en seizoens-tips voor het voorlezen.
                </>
              ) : (
                <>
                  Je staat momenteel{" "}
                  <strong style={{ color: V2.ink }}>niet aangemeld</strong>.
                  Aanmelden kun je altijd uitzetten via deze pagina of via
                  de afmeldlink onderaan elke nieuwsbrief.
                </>
              )}
            </p>
            <EBtn
              kind={user.newsletterOptIn ? "ghost" : "primary"}
              size="md"
              type="submit"
            >
              {user.newsletterOptIn
                ? "Uitschrijven"
                : "Aanmelden voor de nieuwsbrief →"}
            </EBtn>
          </form>
        </Section>

        {/* Password */}
        <Section
          title="Wachtwoord wijzigen"
          meta="Minimaal 6 tekens, kies iets dat je niet vergeet"
        >
          <form action={changePasswordAction}>
            <div>
              <EField
                label="Huidig wachtwoord"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <FieldRow>
              <EField
                label="Nieuw wachtwoord"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
              />
              <EField
                label="Bevestig nieuw wachtwoord"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
              />
            </FieldRow>
            <div style={{ marginTop: 28 }}>
              <EBtn kind="primary" size="md" type="submit">
                Wachtwoord wijzigen →
              </EBtn>
            </div>
          </form>
        </Section>

        {/* Danger zone */}
        <section
          style={{
            marginTop: 64,
            padding: 32,
            background: "rgba(196,165,168,0.08)",
            border: `1px solid rgba(176, 74, 65, 0.25)`,
          }}
        >
          <Kicker color={V2.heart}>Gevarenzone</Kicker>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 26,
              margin: "12px 0 10px",
              letterSpacing: -0.5,
              color: V2.ink,
            }}
          >
            Account{" "}
            <span style={{ fontStyle: "italic" }}>verwijderen.</span>
          </h2>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 14,
              lineHeight: 1.6,
              color: V2.inkSoft,
              margin: "0 0 20px",
              maxWidth: "60ch",
            }}
          >
            Permanent. Al je kindprofielen, verhalen en boeken worden
            weggegooid. Dit kunnen we niet terugdraaien.
          </p>
          {user.role === "admin" ? (
            <p
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 14,
                color: V2.heart,
                background: V2.paper,
                padding: "10px 14px",
                border: `1px solid rgba(176, 74, 65, 0.3)`,
              }}
            >
              Admin-accounts kunnen niet via deze pagina verwijderd worden.
            </p>
          ) : (
            <details>
              <summary
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                  padding: "10px 18px",
                  background: "transparent",
                  color: V2.heart,
                  border: `1px solid ${V2.heart}`,
                  fontFamily: V2.ui,
                  fontSize: 14,
                  fontWeight: 500,
                  listStyle: "none",
                }}
              >
                Account verwijderen
              </summary>
              <form
                action={deleteAccountAction}
                style={{
                  marginTop: 20,
                  padding: 24,
                  background: V2.paper,
                  border: `1px solid rgba(176, 74, 65, 0.25)`,
                }}
              >
                <p
                  style={{
                    fontFamily: V2.body,
                    fontSize: 14,
                    color: V2.inkSoft,
                    margin: "0 0 20px",
                    lineHeight: 1.6,
                  }}
                >
                  Typ je email{" "}
                  <strong style={{ color: V2.ink }}>{user.email}</strong> en
                  je huidige wachtwoord om te bevestigen.
                </p>
                <div>
                  <EField
                    label="Email ter bevestiging"
                    name="emailConfirm"
                    type="email"
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <EField
                    label="Huidig wachtwoord"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    marginTop: 16,
                    padding: "12px 24px",
                    background: V2.heart,
                    color: V2.paper,
                    border: "none",
                    fontFamily: V2.ui,
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: 0.2,
                    cursor: "pointer",
                    borderRadius: 2,
                  }}
                >
                  Account definitief verwijderen
                </button>
              </form>
            </details>
          )}
        </section>
      </div>
    </AppShell>
  );
}

// ── Sub components ──────────────────────────────────────────────

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 48,
        paddingTop: 32,
        borderTop: `1px solid ${V2.paperShade}`,
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 26,
            margin: 0,
            letterSpacing: -0.5,
            color: V2.ink,
          }}
        >
          {title}
        </h2>
        {meta && (
          <p
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 14,
              color: V2.inkMute,
              margin: "6px 0 0",
            }}
          >
            {meta}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function FlashSaved({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 32,
        padding: "14px 20px",
        background: "rgba(201,169,97,0.14)",
        borderLeft: `2px solid ${V2.gold}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      ✓ {children}
    </div>
  );
}

function FlashError({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 32,
        padding: "14px 20px",
        background: "rgba(196,165,168,0.18)",
        borderLeft: `2px solid ${V2.rose}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({
  children,
  threeTwo,
}: {
  children: React.ReactNode;
  threeTwo?: boolean;
}) {
  return (
    <div
      className="app-form-row"
      style={{
        display: "grid",
        gridTemplateColumns: threeTwo
          ? "minmax(0, 2.4fr) minmax(0, 1fr)"
          : "repeat(2, minmax(0, 1fr))",
        gap: 24,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: V2.inkMute,
        display: "block",
        marginBottom: 8,
      }}
    >
      {children}
    </label>
  );
}

function EField({
  label,
  name,
  ...props
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
    <div style={{ marginBottom: 20 }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        name={name}
        {...props}
        style={{
          width: "100%",
          padding: "10px 0",
          border: "none",
          borderBottom: `1px solid ${V2.paperShade}`,
          background: "transparent",
          fontSize: 16,
          fontFamily: V2.body,
          color: V2.ink,
          outline: "none",
        }}
      />
    </div>
  );
}

function SubscriptionHero({
  plan,
  status,
  endsAt,
  storyCount,
  childrenCount,
  credits,
  isAdmin,
}: {
  plan: string;
  status: string;
  endsAt: Date | null;
  storyCount: number;
  childrenCount: number;
  credits: number | null;
  isAdmin: boolean;
}) {
  const planLabel =
    plan === "premium"
      ? "Jaarabonnement"
      : plan === "basic"
        ? "Maandabonnement"
        : "Proefperiode";
  const subMeta =
    isAdmin
      ? "Admin-account · onbeperkt"
      : plan === "free"
        ? "Gratis verhalen. Upgrade later naar een abonnement."
        : endsAt
          ? `verlengt ${new Date(endsAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`
          : `status: ${status}`;

  const stats = [
    {
      n: isAdmin ? "∞" : credits !== null ? String(credits) : String(storyCount),
      l: isAdmin
        ? "ONBEPERKT"
        : credits !== null
          ? "TEGOED"
          : "VERHALEN",
    },
    {
      n: String(storyCount),
      l: storyCount === 1 ? "GEMAAKT" : "GEMAAKT",
    },
    {
      n: String(childrenCount),
      l: childrenCount === 1 ? "KIND" : "KINDEREN",
    },
  ];

  return (
    <div
      style={{
        background: V2.night,
        color: V2.paper,
        padding: "36px 40px",
        position: "relative",
        overflow: "hidden",
        marginBottom: 40,
      }}
    >
      <StarField count={10} />
      <div style={{ position: "relative" }}>
        <Kicker color={V2.gold}>Jouw abonnement</Kicker>
        <div
          style={{
            fontFamily: V2.display,
            fontSize: 36,
            fontWeight: 300,
            marginTop: 10,
            letterSpacing: -0.8,
            color: V2.paper,
          }}
        >
          {isAdmin ? (
            <>
              Admin <span style={{ fontStyle: "italic" }}>toegang</span>
            </>
          ) : (
            <>
              {planLabel.split(" ")[0]}{" "}
              <span style={{ fontStyle: "italic" }}>
                {planLabel.split(" ").slice(1).join(" ") || ""}
              </span>
            </>
          )}
        </div>
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            opacity: 0.8,
            marginTop: 4,
          }}
        >
          {subMeta}
        </div>
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 28,
            paddingTop: 28,
            borderTop: `1px solid rgba(255,255,255,0.12)`,
            flexWrap: "wrap",
          }}
        >
          {stats.map((s, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: V2.display,
                  fontSize: 36,
                  fontWeight: 300,
                  color: V2.gold,
                  lineHeight: 1,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: V2.mono,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  marginTop: 8,
                  opacity: 0.75,
                  color: V2.paper,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
