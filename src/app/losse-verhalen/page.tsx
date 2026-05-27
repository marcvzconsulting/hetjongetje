import Link from "next/link";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import { LandingNav } from "@/components/v2/landing/LandingNav";
import { LandingFooter } from "@/components/v2/landing/LandingFooter";

export const metadata = {
  title: "Losse verhalen kopen",
  description:
    "Koop losse pakketten verhalen — zonder abonnement, op je eigen tempo. Bekijk de pakketten en prijzen.",
  alternates: { canonical: "/losse-verhalen" },
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function pricePerStory(cents: number, count: number): string {
  return (cents / 100 / count).toFixed(2).replace(".", ",");
}

function bundleDiscountPercent(
  bundlePriceCents: number,
  bundleCredits: number,
  singlePriceCents: number | null,
): number | null {
  if (!singlePriceCents || bundleCredits <= 1) return null;
  const bundlePerCredit = bundlePriceCents / bundleCredits;
  if (bundlePerCredit >= singlePriceCents) return null;
  return Math.round((1 - bundlePerCredit / singlePriceCents) * 100);
}

/**
 * Publieke prijspagina voor losse credit-packs. Géén auth-check: iemand
 * die vanaf de landing op &lsquo;Los bijkopen&rsquo; klikt mag eerst
 * rustig de prijzen bekijken. De Koop-knop stuurt door naar /login met
 * callback naar /credits, zodat de gebruiker altijd opnieuw inlogt
 * voordat een bestelling start.
 */
export default async function LosseVerhalenPage() {
  // Defensief: bij DB-uitval (bv. Neon-quota tijdens build) tonen we de
  // "geen pakketten beschikbaar"-state in plaats van de hele page te
  // laten falen. Matcht het patroon van landing-pricing/landing-previews.
  let packs: Awaited<ReturnType<typeof prisma.creditPack.findMany>> = [];
  try {
    packs = await prisma.creditPack.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { creditAmount: "asc" }],
    });
  } catch (err) {
    console.error("[losse-verhalen] DB read failed, using fallback", err);
  }

  const singlePack =
    packs.find((p) => p.creditAmount === 1) ??
    [...packs].sort(
      (a, b) => b.priceCents / b.creditAmount - a.priceCents / a.creditAmount,
    )[0] ??
    null;
  const singlePriceCents = singlePack
    ? singlePack.priceCents / singlePack.creditAmount
    : null;

  return (
    <div
      className="v2-root"
      style={{
        fontFamily: V2.body,
        color: V2.ink,
        background: V2.paper,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <LandingNav />
      <main
        style={{
          flex: 1,
          maxWidth: 1100,
          width: "100%",
          margin: "0 auto",
          padding: "64px 32px 96px",
        }}
      >
        <Kicker>Losse verhalen</Kicker>
        <h1
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(36px, 5vw, 56px)",
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
          Geen abonnement? Geen probleem. Koop losse pakketten, bovenop je
          maandelijkse credits of als alternatief voor een abonnement.
          Verbruikt op je eigen tempo.
        </p>

        {packs.length === 0 ? (
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
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {packs.map((p) => (
              <PackCardPublic
                key={p.id}
                pack={p}
                discountPercent={bundleDiscountPercent(
                  p.priceCents,
                  p.creditAmount,
                  singlePriceCents,
                )}
              />
            ))}
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
              kaft-korting voor het boekje.
            </p>
          </div>
          <EBtn kind="ghost" size="md" href="/#prijs">
            Bekijk abonnementen
          </EBtn>
        </section>

        <p
          style={{
            marginTop: 40,
            fontFamily: V2.body,
            fontSize: 13,
            color: V2.inkMute,
            textAlign: "center",
          }}
        >
          Je logt eerst in voordat de bestelling start. Veiliger en het
          tegoed komt zeker op het goede account terecht.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}

function PackCardPublic({
  pack,
  discountPercent,
}: {
  pack: {
    id: string;
    name: string;
    description: string | null;
    creditAmount: number;
    priceCents: number;
    badge: string | null;
  };
  discountPercent: number | null;
}) {
  const featured = !!pack.badge;
  const loginHref = `/login?callbackUrl=%2Fcredits`;
  return (
    <div
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
      {discountPercent !== null && discountPercent > 0 && (
        <div
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "4px 10px",
            background: featured
              ? "rgba(201,169,97,0.18)"
              : "rgba(138,115,64,0.10)",
            color: featured ? V2.gold : V2.goldDeep,
            fontFamily: V2.ui,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            alignSelf: "flex-start",
          }}
        >
          −{discountPercent}% per verhaal
        </div>
      )}

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

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        <Link
          href={loginHref}
          style={{
            display: "block",
            textAlign: "center",
            padding: "12px 18px",
            background: featured ? V2.paper : V2.ink,
            color: featured ? V2.ink : V2.paper,
            fontFamily: V2.ui,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: 0.2,
            textDecoration: "none",
            border: `1px solid ${featured ? V2.paper : V2.ink}`,
          }}
        >
          Login om te kopen →
        </Link>
      </div>
    </div>
  );
}
