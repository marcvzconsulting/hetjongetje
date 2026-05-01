import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import { AppShell } from "@/components/v2/app/AppShell";
import { subscribeAction } from "./actions";
import { SubscribeButton } from "./SubscribeButton";

type SearchParams = Promise<{ error?: string }>;

const ERROR_LABELS: Record<string, string> = {
  not_approved:
    "Je account moet eerst goedgekeurd worden voor je een abonnement kunt starten.",
  missing_plan: "Geen plan gekozen — probeer het opnieuw.",
  terms: "Je moet akkoord gaan met de algemene voorwaarden.",
  recurring_consent:
    "Voor een abonnement is ook akkoord op de automatische incasso vereist.",
  already_subscribed:
    "Je hebt al een actief abonnement. Wil je wisselen? Zeg dan eerst je huidige abonnement op via je account.",
  plan_not_found: "Dat plan bestaat niet meer — kies een ander.",
  plan_inactive: "Dat plan is op dit moment niet beschikbaar.",
  checkout_failed:
    "Er ging iets mis met de betaalprovider. Probeer het zo opnieuw.",
};

export const metadata = {
  title: "Abonnement",
  description:
    "Kies een abonnement — maandelijks of jaarlijks, opzegbaar wanneer je wilt.",
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function intervalToDutch(interval: string): string {
  const lower = interval.toLowerCase().trim();
  if (lower === "1 month") return "elke maand";
  if (lower === "12 months") return "elk jaar";
  return interval;
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  if (!gate) redirect("/login");

  const params = await searchParams;
  const errorMessage = params.error ? ERROR_LABELS[params.error] : null;

  const [plans, currentSubscription] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }],
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  const hasActiveSub =
    !!currentSubscription &&
    currentSubscription.plan !== "free" &&
    currentSubscription.status === "active" &&
    !!currentSubscription.mollieSubscriptionId;

  return (
    <AppShell
      userName={session.user.name ?? "jij"}
      credits={gate.isAdmin ? null : gate.storyCredits}
      nav={[
        { label: "Bibliotheek", href: "/dashboard" },
        { label: "Abonnement", href: "/subscribe", active: true },
        { label: "Account", href: "/account" },
      ]}
    >
      <link rel="preconnect" href="https://www.mollie.com" />
      <link rel="dns-prefetch" href="https://www.mollie.com" />

      <div
        className="app-page-pad"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 32px 80px",
          fontFamily: V2.body,
          color: V2.ink,
        }}
      >
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            marginBottom: 24,
          }}
        >
          <Link
            href="/dashboard"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            ← Bibliotheek
          </Link>
        </div>

        <Kicker>Abonnement</Kicker>
        <h1
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(36px, 5vw, 52px)",
            margin: "12px 0 16px",
            letterSpacing: -1.4,
            lineHeight: 1.05,
          }}
        >
          Elke avond een verhaal,{" "}
          <span style={{ fontStyle: "italic" }}>zonder erover na te denken.</span>
        </h1>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 17,
            color: V2.inkSoft,
            lineHeight: 1.6,
            maxWidth: 640,
            marginBottom: 40,
          }}
        >
          Een abonnement vult je tegoed elke periode automatisch aan.
          Opzeggen kan elk moment via je account — je behoudt toegang tot
          het einde van de lopende periode.
        </p>

        {gate.isAdmin && (
          <FlashNote kind="info">
            Je bent admin — je kunt zelf abonnementen testen, maar credits
            tellen niet bij je tegoed.
          </FlashNote>
        )}

        {!gate.isApproved && !gate.isAdmin && (
          <FlashNote kind="warning">
            Je account staat nog op &lsquo;in afwachting&rsquo;. Zodra een
            beheerder je goedkeurt kun je een abonnement starten.
          </FlashNote>
        )}

        {hasActiveSub && (
          <FlashNote kind="info">
            Je hebt op dit moment al een actief abonnement. Beheer of zeg op
            via{" "}
            <Link
              href="/account"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              je account
            </Link>
            .
          </FlashNote>
        )}

        {errorMessage && <FlashNote kind="error">{errorMessage}</FlashNote>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 32,
          }}
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              disabled={!gate.isApproved || hasActiveSub}
            />
          ))}
        </div>

        {plans.length === 0 && (
          <div
            style={{
              padding: 32,
              border: `1px dashed ${V2.paperShade}`,
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 16,
              color: V2.inkMute,
              textAlign: "center",
            }}
          >
            Op dit moment zijn er geen actieve abonnementen. Kom binnenkort
            terug.
          </div>
        )}

        <section
          style={{
            marginTop: 56,
            padding: 28,
            background: V2.paperDeep,
            border: `1px solid ${V2.paperShade}`,
          }}
        >
          <Kicker>Liever geen abonnement</Kicker>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 26,
              letterSpacing: -0.6,
              margin: "10px 0 8px",
            }}
          >
            Koop{" "}
            <span style={{ fontStyle: "italic" }}>losse pakketten</span>
          </h2>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 15,
              color: V2.inkSoft,
              margin: "0 0 14px",
              maxWidth: 520,
            }}
          >
            Geen automatische incasso, gewoon per pakket. Vanaf €1,50 per
            verhaal of als pakket van 10 voor €12.
          </p>
          <EBtn kind="ghost" size="md" href="/credits">
            Verhalen bijkopen →
          </EBtn>
        </section>
      </div>
    </AppShell>
  );
}

function PlanCard({
  plan,
  disabled,
}: {
  plan: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    priceCents: number;
    interval: string;
    creditsPerInterval: number | null;
    badge: string | null;
    features: unknown;
  };
  disabled: boolean;
}) {
  const featured = !!plan.badge && plan.code === "annual";
  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  const intervalNl = intervalToDutch(plan.interval);

  return (
    <form
      action={subscribeAction}
      style={{
        display: "flex",
        flexDirection: "column",
        background: featured ? V2.night : V2.paper,
        color: featured ? V2.paper : V2.ink,
        border: `1px solid ${featured ? V2.night : V2.paperShade}`,
        padding: 28,
        position: "relative",
        minHeight: 460,
      }}
    >
      <input type="hidden" name="planCode" value={plan.code} />

      {plan.badge && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontFamily: V2.mono,
            fontSize: 10,
            color: featured ? V2.gold : V2.goldDeep,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          ✦ {plan.badge}
        </div>
      )}

      <div
        style={{
          fontFamily: V2.ui,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          opacity: 0.6,
        }}
      >
        {plan.name}
      </div>
      <div
        style={{
          fontFamily: V2.display,
          fontSize: 56,
          fontWeight: 300,
          letterSpacing: -2,
          lineHeight: 1,
          marginTop: 14,
        }}
      >
        €{eurosFromCents(plan.priceCents)}
      </div>
      <div
        style={{
          fontFamily: V2.mono,
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: featured ? V2.gold : V2.inkMute,
          marginTop: 8,
        }}
      >
        {intervalNl}
      </div>

      {plan.description && (
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 13,
            lineHeight: 1.5,
            marginTop: 18,
            opacity: 0.85,
            fontStyle: "italic",
          }}
        >
          {plan.description}
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
        {features.map((f) => (
          <li
            key={f}
            style={{
              fontFamily: V2.body,
              fontSize: 14,
              lineHeight: 1.5,
              padding: "8px 0",
              borderTop: `1px solid ${
                featured ? "rgba(255,255,255,0.12)" : V2.paperShade
              }`,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: featured ? V2.gold : V2.goldDeep }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "auto" }}>
        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: `1px solid ${
              featured ? "rgba(255,255,255,0.15)" : V2.paperShade
            }`,
            fontFamily: V2.body,
            fontSize: 12,
            color: featured ? V2.paper : V2.inkSoft,
            opacity: 0.9,
          }}
        >
          <Consent
            name="acceptTerms"
            disabled={disabled}
            featured={featured}
          >
            Ik ga akkoord met de{" "}
            <Link
              href="/voorwaarden"
              target="_blank"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              algemene voorwaarden
            </Link>
            .
          </Consent>
          <Consent
            name="acceptRecurring"
            disabled={disabled}
            featured={featured}
          >
            Ik ga akkoord met de automatische {intervalNl}se incasso van €
            {eurosFromCents(plan.priceCents)} en kan elk moment opzeggen.
          </Consent>
        </div>
        <SubscribeButton disabled={disabled} featured={featured} />
      </div>
    </form>
  );
}

function Consent({
  name,
  disabled,
  featured,
  children,
}: {
  name: string;
  disabled: boolean;
  featured: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 8,
        cursor: disabled ? "default" : "pointer",
        color: featured ? V2.paper : V2.inkSoft,
      }}
    >
      <input
        type="checkbox"
        name={name}
        value="1"
        disabled={disabled}
        required
        style={{
          marginTop: 3,
          cursor: disabled ? "default" : "pointer",
        }}
      />
      <span>{children}</span>
    </label>
  );
}

function FlashNote({
  kind,
  children,
}: {
  kind: "info" | "warning" | "error";
  children: React.ReactNode;
}) {
  const colors = {
    info: { bg: "rgba(201,169,97,0.14)", border: V2.goldDeep },
    warning: { bg: "rgba(196,165,168,0.18)", border: V2.rose },
    error: { bg: "rgba(176,74,65,0.14)", border: V2.heart },
  }[kind];
  return (
    <div
      style={{
        marginBottom: 24,
        padding: "14px 18px",
        background: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
