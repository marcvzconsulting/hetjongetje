import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import { AppShell } from "@/components/v2/app/AppShell";
import { buyCreditsAction } from "./actions";
import { BuyButton } from "./BuyButton";

type SearchParams = Promise<{ error?: string }>;

const ERROR_LABELS: Record<string, string> = {
  not_approved: "Je account moet eerst goedgekeurd worden voor je credits kunt kopen.",
  missing_pack: "Geen pakket gekozen — probeer het opnieuw.",
  terms: "Je moet akkoord gaan met de algemene voorwaarden om verder te gaan.",
  checkout_failed:
    "Er ging iets mis met de betaalprovider. Probeer het zo opnieuw.",
};

export const metadata = {
  title: "Verhalen bijkopen",
  description:
    "Koop een pakket extra verhalen — losse credits voor naast of bovenop je abonnement.",
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function pricePerStory(cents: number, count: number): string {
  return (cents / 100 / count).toFixed(2).replace(".", ",");
}

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fcredits");

  const gate = await loadUserGate(session.user.id);
  if (!gate) redirect("/login?callbackUrl=%2Fcredits");

  const params = await searchParams;
  const errorMessage = params.error ? ERROR_LABELS[params.error] : null;

  const packs = await prisma.creditPack.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { creditAmount: "asc" }],
  });

  const credits = gate.isAdmin ? null : gate.storyCredits;

  return (
    <AppShell
      userName={session.user.name ?? "jij"}
      credits={credits}
      nav={[
        { label: "Bibliotheek", href: "/dashboard" },
        { label: "Abonnement", href: "/subscribe" },
        { label: "Credits", href: "/credits", active: true },
        { label: "Account", href: "/account" },
      ]}
    >
      {/* Open the TCP+TLS handshake to Mollie's checkout host before the
          user clicks Bestellen. Saves ~100-200ms on the first hop. */}
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
        {/* Breadcrumb */}
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

        <Kicker>Verhalen bijkopen</Kicker>
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
          Een paar extra{" "}
          <span style={{ fontStyle: "italic" }}>avonden vooruit.</span>
        </h1>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 17,
            color: V2.inkSoft,
            lineHeight: 1.6,
            maxWidth: 600,
            marginBottom: 40,
          }}
        >
          Geen abonnement? Geen probleem. Koop losse pakketten — bovenop je
          maandelijkse credits, of als alternatief voor een abonnement.
          Verbruikt op je eigen tempo.
        </p>

        {gate.isAdmin && (
          <FlashNote kind="info">
            Je bent admin — je kunt zelf bestellingen plaatsen om de flow te
            testen, maar credits worden niet bij je tegoed opgeteld.
          </FlashNote>
        )}

        {!gate.isApproved && !gate.isAdmin && (
          <FlashNote kind="warning">
            Je account staat nog op &lsquo;in afwachting&rsquo;. Zodra een
            beheerder je goedkeurt kun je credits kopen.
          </FlashNote>
        )}

        {errorMessage && (
          <FlashNote kind="error">{errorMessage}</FlashNote>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 32,
          }}
        >
          {packs.map((p) => (
            <PackCard
              key={p.id}
              pack={p}
              disabled={!gate.isApproved}
            />
          ))}
        </div>

        {packs.length === 0 && (
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
            Op dit moment zijn er geen losse pakketten beschikbaar. Kom
            binnenkort terug.
          </div>
        )}

        {/* Subscription teaser */}
        <section
          style={{
            marginTop: 56,
            padding: 32,
            background: V2.paperDeep,
            border: `1px solid ${V2.paperShade}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Kicker>Liever maandelijks</Kicker>
            <h2
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 26,
                letterSpacing: -0.6,
                margin: "10px 0 8px",
              }}
            >
              Een{" "}
              <span style={{ fontStyle: "italic" }}>abonnement</span>{" "}
              spaart bijna €20 per jaar
            </h2>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 15,
                color: V2.inkSoft,
                margin: 0,
                maxWidth: 520,
              }}
            >
              Vanaf €7,95 per maand, of €79 per jaar. Onbeperkt verhalen,
              kaft-korting voor het boekje. Abonnementen kun je binnenkort
              hier afsluiten.
            </p>
          </div>
          <EBtn kind="ghost" size="md" href="/#prijs">
            Prijzen bekijken →
          </EBtn>
        </section>
      </div>
    </AppShell>
  );
}

function PackCard({
  pack,
  disabled,
}: {
  pack: {
    id: string;
    name: string;
    description: string | null;
    creditAmount: number;
    priceCents: number;
    badge: string | null;
  };
  disabled: boolean;
}) {
  const featured = !!pack.badge;
  return (
    <form
      action={buyCreditsAction}
      style={{
        display: "flex",
        flexDirection: "column",
        background: featured ? V2.night : V2.paper,
        color: featured ? V2.paper : V2.ink,
        border: `1px solid ${featured ? V2.night : V2.paperShade}`,
        padding: 28,
        position: "relative",
        minHeight: 320,
      }}
    >
      <input type="hidden" name="packId" value={pack.id} />

      {pack.badge && (
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
          ✦ {pack.badge}
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
        {pack.name}
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
        €{eurosFromCents(pack.priceCents)}
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
        €{pricePerStory(pack.priceCents, pack.creditAmount)} per verhaal
      </div>

      {pack.description && (
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 14,
            lineHeight: 1.5,
            marginTop: 18,
            opacity: 0.85,
            fontStyle: "italic",
          }}
        >
          {pack.description}
        </p>
      )}

      <div style={{ marginTop: "auto" }}>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${
              featured ? "rgba(255,255,255,0.15)" : V2.paperShade
            }`,
            fontFamily: V2.body,
            fontSize: 12,
            color: featured ? V2.paper : V2.inkSoft,
            opacity: 0.9,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            name="acceptTerms"
            value="1"
            disabled={disabled}
            required
            style={{ marginTop: 3, cursor: disabled ? "default" : "pointer" }}
          />
          <span>
            Ik ga akkoord met de{" "}
            <Link
              href="/voorwaarden"
              target="_blank"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              algemene voorwaarden
            </Link>
            .
          </span>
        </label>
        <BuyButton disabled={disabled} featured={featured} />
      </div>
    </form>
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
