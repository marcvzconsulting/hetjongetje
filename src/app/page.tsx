import Image from "next/image";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo, EBtn, Kicker, IconV2 } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";
import { StoryPreviewV2 } from "@/components/v2/landing/StoryPreviewV2";
import { LandingFooter } from "@/components/v2/landing/LandingFooter";
import { RotatingName } from "@/components/v2/landing/RotatingName";
import { fetchLandingPreviews } from "@/lib/story/landing-previews";
import { prisma } from "@/lib/db";

// Vaste voorbeeldnaam voor copy die over de pagina heen gebruikt wordt.
const SAMPLE_NAME = "Noor";

export const metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div
      className="v2-root"
      style={{
        fontFamily: V2.body,
        color: V2.ink,
        background: V2.paper,
      }}
    >
      <LandingJsonLd />
      <ResponsiveStyles />
      <Nav />
      <main>
        <Hero />
        <StoryPreviewSection />
        <HowItGoes />
        <NightHero />
        <BookSection />
        <Pricing />
        <TrustStrip />
        <FounderNote />
        <SlotCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

/**
 * Structured data voor SEO + AEO. Eén block met @graph zodat
 * Organization, WebSite en WebPage aan elkaar gekoppeld zijn.
 * Search/answer engines hangen hun snippets aan deze entiteiten op.
 */
function LandingJsonLd() {
  const siteUrl = "https://www.onsverhaaltje.nl";
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Ons Verhaaltje",
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        description:
          "Ons Verhaaltje maakt gepersonaliseerde voorleesverhalen voor kinderen van 2 tot 10. Elk verhaal bevat de naam, knuffel en mensen uit het leven van het kind.",
        founder: {
          "@type": "Person",
          name: "Marc van Zetten",
        },
        parentOrganization: {
          "@type": "Organization",
          name: "MVZ Consulting",
        },
        sameAs: [
          // Voeg socials hier toe wanneer publiek (LinkedIn / Instagram).
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Ons Verhaaltje",
        inLanguage: "nl-NL",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: "Ons Verhaaltje — Gepersonaliseerde voorleesverhalen",
        description:
          "Gepersonaliseerde voorleesverhalen voor je kind, met de naam, de knuffel en de mensen om hen heen.",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        datePublished: "2026-01-15",
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "nl-NL",
      },
      {
        "@type": "Product",
        name: "Gepersonaliseerd voorleesverhaal",
        description:
          "Een nieuw, op maat geschreven en geïllustreerd voorleesverhaal, klaar in een paar minuten. Los te koop per verhaal (credits) of via een abonnement.",
        brand: { "@id": `${siteUrl}/#organization` },
        category: "Children's books",
        audience: {
          "@type": "PeopleAudience",
          suggestedMinAge: 2,
          suggestedMaxAge: 10,
        },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // schema.org JSON-LD wordt door Next.js niet als XSS-risico
      // behandeld; we maken de data zelf.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Mobile responsive overrides. Inline styles take precedence so we use
 * `!important` to make these rules win on small viewports. Scoped to the
 * landing via `lp-` prefixed classnames added to specific elements below.
 */
function ResponsiveStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media (max-width: 760px) {
  .lp-section { padding-left: 20px !important; padding-right: 20px !important; }
  .lp-section-tall { padding-top: 64px !important; padding-bottom: 64px !important; }
  .lp-hero-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
  .lp-2col { grid-template-columns: 1fr !important; gap: 28px !important; }
  .lp-2col-steps { grid-template-columns: 1fr !important; gap: 36px !important; }
  .lp-step-row { grid-template-columns: 56px 1fr !important; gap: 16px !important; }
  .lp-step-num { font-size: 32px !important; }
  .lp-step-spot { display: none !important; }
  .lp-trust { grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
  .lp-section-h2 { font-size: 36px !important; }
  .lp-pricing {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
    background: transparent !important;
    border: none !important;
  }
  .lp-pricing-card {
    border: 1px solid #e2d7c2 !important;
  }
  .lp-pricing-price { font-size: 48px !important; }
  .lp-pricing-card-pad { padding: 28px !important; }
  .lp-book-mock { width: 220px !important; height: 300px !important; }
  .lp-nav-pad { padding: 16px 20px !important; }
  .lp-nav-mobile-hide { display: none !important; }
  .lp-nav-gap { gap: 14px !important; }
  .lp-footer-pad { padding: 36px 20px !important; }
  .lp-footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
  .lp-footer-links {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 14px 20px !important;
    justify-content: stretch !important;
    align-self: stretch !important;
  }
}
`,
      }}
    />
  );
}

// ── Nav ────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav
      className="lp-nav-pad"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 48px",
        borderBottom: `1px solid ${V2.paperShade}`,
      }}
    >
      <Link href="/" aria-label="Ons Verhaaltje, home">
        <Logo size={22} />
      </Link>
      <div
        className="lp-nav-gap"
        style={{
          display: "flex",
          gap: 36,
          alignItems: "center",
          fontFamily: V2.ui,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <Link href="/hoe-het-werkt" className="lp-nav-mobile-hide" style={{ color: V2.ink, textDecoration: "none" }}>
          Hoe het werkt
        </Link>
        <Link href="#voorbeeld" className="lp-nav-mobile-hide" style={{ color: V2.ink, textDecoration: "none" }}>
          Voorbeeld
        </Link>
        <Link href="#prijs" className="lp-nav-mobile-hide" style={{ color: V2.ink, textDecoration: "none" }}>
          Prijs
        </Link>
        <Link href="/login" style={{ color: V2.ink, textDecoration: "none" }}>
          Inloggen
        </Link>
        <EBtn kind="primary" size="sm" href="/register">
          Probeer het
        </EBtn>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────

function Hero() {
  const vignette =
    "radial-gradient(ellipse 68% 74% at 50% 47%, black 52%, transparent 92%)";
  return (
    <section className="lp-section lp-section-tall" style={{ padding: "96px 48px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          className="lp-hero-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.9fr)",
            gap: 72,
            alignItems: "center",
          }}
        >
          {/* Left: typography + CTA */}
          <div>
            <h1
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: "clamp(54px, 7vw, 96px)",
                lineHeight: 0.98,
                margin: "28px 0 0",
                letterSpacing: -2.2,
              }}
            >
              Een verhaaltje<br />
              waarin{" "}
              <span style={{ fontStyle: "italic", fontWeight: 400 }}>
                <RotatingName />
              </span>
              <br />
              zichzelf{" "}
              <span style={{ fontStyle: "italic", fontWeight: 400 }}>
                herkent.
              </span>
            </h1>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 19,
                lineHeight: 1.55,
                margin: "32px 0 0",
                color: V2.inkSoft,
                maxWidth: 520,
              }}
            >
              Jullie vertellen ons wie ze is: de knuffel op het bed, het
              katje van de buren, het broertje dat eraan komt. Wij maken
              er een voorleesverhaal van, met een illustratie, klaar om
              voor te lezen. Elke avond anders.
            </p>
            <div style={{ marginTop: 36 }}>
              <EBtn kind="primary" size="lg" href="/register">
                Begin met een gratis verhaal{" "}
                <IconV2 name="arrow" size={16} color={V2.paper} />
              </EBtn>
              <div
                style={{
                  fontFamily: V2.ui,
                  fontSize: 13,
                  color: V2.inkMute,
                  marginTop: 14,
                }}
              >
                Klaar in 3 minuten
              </div>
            </div>
          </div>

          {/* Right: hero illustration */}
          <figure style={{ margin: 0 }}>
            <div
              style={{
                aspectRatio: "1 / 1",
                maskImage: vignette,
                WebkitMaskImage: vignette,
              }}
            >
              <Image
                src="/images/hero-illustration.png"
                alt="Een klein meisje in pyjama met een knuffelolifant"
                width={800}
                height={800}
                priority
                sizes="(max-width: 768px) 90vw, 540px"
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                draggable={false}
              />
            </div>
            <figcaption
              style={{
                marginTop: 12,
                fontFamily: V2.display,
                fontStyle: "italic",
                fontSize: 13,
                color: V2.inkMute,
                textAlign: "center",
              }}
            >
              Uit het verhaal van {SAMPLE_NAME}, vier jaar.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

// ── Voorbeeld-spread ────────────────────────────────────────────────

async function StoryPreviewSection() {
  const previews = await fetchLandingPreviews();
  return (
    <section
      id="voorbeeld"
      className="lp-section"
      style={{
        padding: "48px 48px 96px",
        borderTop: `1px solid ${V2.paperShade}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Kicker>Voorbeeld</Kicker>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(36px, 4.4vw, 52px)",
              lineHeight: 1.05,
              margin: "20px 0 0",
              letterSpacing: -1.4,
            }}
          >
            Zo leest het voor <br />
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>
              jullie kind.
            </span>
          </h2>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 17,
              lineHeight: 1.6,
              maxWidth: 560,
              margin: "16px auto 0",
              color: V2.inkSoft,
            }}
          >
            Kies leeftijd en geslacht, en zie hoe een verhaal eruit ziet
            voor iemand van die leeftijd. De taal past zich aan: korte
            zinnen voor een tweejarige, meer beeld en verhaal voor vier.
          </p>
        </div>
        <StoryPreviewV2 previews={previews} />
      </div>
    </section>
  );
}

// ── Hoe het gaat ───────────────────────────────────────────────────

function HowItGoes() {
  const steps = [
    {
      n: "I",
      t: "Jullie vullen het profiel in",
      b: "Naam, leeftijd, de knuffel, de mensen, de grapjes die thuis terugkomen. Dit doe je maar één keer, daarna weten wij genoeg.",
      img: "/images/spots/vertellen.png",
      alt: "Aquarel van een kind met een knuffelkonijn op schoot",
    },
    {
      n: "II",
      t: "Vertel wat er vanavond speelt",
      b: "Een zin is genoeg. Of vertel meer: 'Er was vandaag een tekening van oma', 'Noor wilde vanmiddag alleen olifantenbrood'.",
      img: "/images/spots/schrijven.png",
      alt: "Aquarel van een opengeslagen schrijfboekje met een pen",
    },
    {
      n: "III",
      t: "Voorlezen, of laten voorlezen",
      b: "Op de tablet, of op papier. Aan het einde van het jaar bundel je de mooiste verhalen in een echt gedrukt boekje.",
      img: "/images/spots/voorlezen.png",
      alt: "Aquarel van een slapend kind met een boek en een teddybeer",
    },
  ];
  return (
    <section
      className="lp-section lp-section-tall"
      style={{
        padding: "96px 48px",
        borderTop: `1px solid ${V2.paperShade}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          className="lp-2col-steps"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)",
            gap: 80,
          }}
        >
          <div>
            <Kicker>Hoe het gaat</Kicker>
            <h2
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 52,
                lineHeight: 1.02,
                margin: "20px 0 0",
                letterSpacing: -1.4,
              }}
            >
              Drie stappen,
              <br />
              <span style={{ fontStyle: "italic", fontWeight: 400 }}>
                meer niet.
              </span>
            </h2>
          </div>
          <div>
            {steps.map((s) => (
              <div
                key={s.n}
                className="lp-step-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 128px",
                  gap: 24,
                  padding: "28px 0",
                  borderTop: `1px solid ${V2.paperShade}`,
                  alignItems: "center",
                }}
              >
                <div
                  className="lp-step-num"
                  style={{
                    fontFamily: V2.display,
                    fontStyle: "italic",
                    fontSize: 44,
                    fontWeight: 300,
                    color: V2.goldDeep,
                    lineHeight: 1,
                  }}
                >
                  {s.n}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: V2.display,
                      fontWeight: 400,
                      fontSize: 26,
                      margin: 0,
                      letterSpacing: -0.4,
                      lineHeight: 1.2,
                    }}
                  >
                    {s.t}
                  </h3>
                  <p
                    style={{
                      fontFamily: V2.body,
                      fontSize: 17,
                      lineHeight: 1.6,
                      margin: "10px 0 0",
                      color: V2.inkSoft,
                      maxWidth: 560,
                    }}
                  >
                    {s.b}
                  </p>
                </div>
                <div
                  className="lp-step-spot"
                  style={{
                    position: "relative",
                    width: 128,
                    height: 128,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: `1px solid ${V2.paperShade}`,
                  }}
                >
                  <Image
                    src={s.img}
                    alt={s.alt}
                    fill
                    sizes="128px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Nachthero: waarom anders ───────────────────────────────────────

function NightHero() {
  return (
    <section
      className="lp-section lp-section-tall"
      style={{
        padding: "120px 48px",
        background: V2.night,
        color: V2.paper,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StarField count={14} />
      <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
        <Kicker color={V2.gold}>
          Waarom {SAMPLE_NAME}, en niet &lsquo;het kind&rsquo;
        </Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(44px, 5.5vw, 64px)",
            lineHeight: 1.05,
            margin: "24px 0 0",
            letterSpacing: -1.6,
            color: V2.paper,
          }}
        >
          Niet iedere {SAMPLE_NAME} is{" "}
          <span style={{ fontStyle: "italic", color: V2.gold }}>dezelfde</span>{" "}
          {SAMPLE_NAME}.
        </h2>
        <div
          className="lp-2col"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            marginTop: 56,
          }}
        >
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 19,
              lineHeight: 1.65,
              margin: 0,
              opacity: 0.85,
            }}
          >
            Persoonlijk betekent voor ons meer dan een naam in een sjabloon.
            Het betekent dat de knuffel die in het verhaal eindigt ook echt
            op het bed ligt. Het straatje is het straatje om de hoek. Het
            broertje haalt dezelfde streken uit als thuis.
          </p>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 19,
              lineHeight: 1.65,
              margin: 0,
              opacity: 0.85,
            }}
          >
            Dat is het verschil. We maken geen verhaal over een meisje dat
            toevallig jouw naam heeft, we maken er één waarin jij jezelf
            herkent. Tot in de kleinste details.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Boekje ─────────────────────────────────────────────────────────

function BookSection() {
  return (
    <section className="lp-section lp-section-tall" style={{ padding: "96px 48px" }}>
      <div
        className="lp-2col"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          gap: 80,
          alignItems: "center",
        }}
      >
        <div>
          <Kicker>Aan het einde van het jaar</Kicker>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(38px, 4.8vw, 56px)",
              lineHeight: 1.03,
              margin: "20px 0 0",
              letterSpacing: -1.4,
            }}
          >
            Een <span style={{ fontStyle: "italic", fontWeight: 400 }}>echt</span>{" "}
            boekje.
            <br />
            Hardcover. Gebonden.
          </h2>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 18,
              lineHeight: 1.6,
              marginTop: 24,
              color: V2.inkSoft,
              maxWidth: 520,
            }}
          >
            De mooiste verhalen van het jaar worden een echt kinderboek.
            Voor op het nachtkastje, of om ooit aan hun eigen kinderen voor
            te lezen.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            className="lp-book-mock"
            style={{
              width: 280,
              height: 380,
              background: V2.night,
              position: "relative",
              boxShadow: "0 20px 50px rgba(20,20,46,0.25)",
            }}
          >
            {/* Spine shadow */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: 12,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.3), transparent)",
              }}
            />
            {/* Title */}
            <div
              style={{
                position: "absolute",
                top: 48,
                left: 32,
                right: 32,
                fontFamily: V2.display,
                fontSize: 24,
                color: V2.paper,
                fontWeight: 300,
                letterSpacing: -0.4,
                lineHeight: 1.1,
              }}
            >
              Het jaar van
              <br />
              <span style={{ fontStyle: "italic", color: V2.gold }}>
                {SAMPLE_NAME}
              </span>
            </div>
            {/* Moon crescent */}
            <div
              style={{
                position: "absolute",
                bottom: 90,
                left: "50%",
                transform: "translateX(-50%)",
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: V2.gold,
                opacity: 0.92,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 90,
                left: "50%",
                transform: "translateX(-30%)",
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: V2.night,
              }}
            />
            {/* stars */}
            {[
              { t: 140, l: 40, s: 2 },
              { t: 170, r: 50, s: 2 },
              { t: 210, l: 60, s: 1.5 },
            ].map((st, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: st.t,
                  left: st.l,
                  right: st.r,
                  width: st.s,
                  height: st.s,
                  borderRadius: "50%",
                  background: V2.gold,
                }}
              />
            ))}
            {/* year */}
            <div
              style={{
                position: "absolute",
                bottom: 32,
                left: 0,
                right: 0,
                textAlign: "center",
                fontFamily: V2.mono,
                fontSize: 11,
                color: V2.gold,
                letterSpacing: "0.2em",
              }}
            >
              MMXXVI
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Prijs ──────────────────────────────────────────────────────────

function eurosFromCents(cents: number): string {
  // Show whole euros without decimals when there are none, "€7,95" otherwise.
  // Matches the original landing copy's mix of €79 and €7,95.
  const s = (cents / 100).toFixed(2).replace(".", ",");
  return s.endsWith(",00") ? s.slice(0, -3) : s;
}

async function Pricing() {
  // Pull subscription plans + a representative credit pack from the DB so
  // /admin/pricing can tune the landing without a code deploy. Falls back
  // to hardcoded copy if the DB isn't reachable yet (during a fresh
  // deploy or migration).
  let subscriptionRows: Awaited<ReturnType<typeof prisma.subscriptionPlan.findMany>> = [];
  let creditPackRows: Awaited<ReturnType<typeof prisma.creditPack.findMany>> = [];
  try {
    const [subs, packs] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }],
      }),
      // Alle actieve credit-packs voor de hoofd-cards. Beperkt tot 4
      // voor de visuele balans — drukken we packs er meer in dan
      // wordt de pricing-grid te druk en daalt conversie.
      prisma.creditPack.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { creditAmount: "asc" }],
        take: 4,
      }),
    ]);
    subscriptionRows = subs;
    creditPackRows = packs;
  } catch (err) {
    console.error("[landing-pricing] DB read failed, using fallback", err);
  }

  type PricingCard = {
    t: string;
    p: string;
    u: string;
    f: string[];
    badge?: string;
    featured?: boolean;
    /** Where the "Begin hiermee →" CTA points. Defaults to /register
     *  for unauth visitors; auth-gates handle the rest. */
    href: string;
  };

  // Hoofd-cards = credit-packs (geen-abo-route is laagdrempeliger en
  // sinds 2026 onze primaire conversie-route). Strip onderaan toont de
  // abonnementen als "Liever maandelijks?"-alternatief.
  const defaultPackFeatures = (creditAmount: number): string[] => [
    `${creditAmount} ${creditAmount === 1 ? "verhaal" : "verhalen"} naar keuze`,
    "Verhalen blijven bewaard",
    "Geen abonnement",
    "Verbruik in eigen tempo",
  ];

  const plans: PricingCard[] = creditPackRows.length > 0
    ? creditPackRows.map((p) => {
        const perStory = p.creditAmount > 0 ? p.priceCents / p.creditAmount : p.priceCents;
        const dbFeatures =
          Array.isArray(p.features) && p.features.length > 0
            ? (p.features as string[])
            : null;
        return {
          t: p.name,
          p: `€${eurosFromCents(p.priceCents)}`,
          u: `${p.creditAmount} ${p.creditAmount === 1 ? "verhaal" : "verhalen"} · €${eurosFromCents(perStory)} per stuk`,
          badge: p.badge ?? undefined,
          featured: !!p.badge,
          f: dbFeatures ?? defaultPackFeatures(p.creditAmount),
          href: "/register",
        };
      })
    : [
        // Fallback als de catalog nog niet geseed is.
        {
          t: "Eén verhaal",
          p: "€2,50",
          u: "1 verhaal · €2,50 per stuk",
          f: ["1 verhaal naar keuze", "Verhalen blijven bewaard", "Geen abonnement", "Verbruik in eigen tempo"],
          href: "/register",
        },
        {
          t: "Vijf verhalen",
          p: "€10",
          u: "5 verhalen · €2,00 per stuk",
          badge: "voordelig",
          featured: true,
          f: ["5 verhalen naar keuze", "Verhalen blijven bewaard", "Geen abonnement", "Verbruik in eigen tempo"],
          href: "/register",
        },
        {
          t: "Tien verhalen",
          p: "€18",
          u: "10 verhalen · €1,80 per stuk",
          f: ["10 verhalen naar keuze", "Verhalen blijven bewaard", "Geen abonnement", "Verbruik in eigen tempo"],
          href: "/register",
        },
      ];

  // Abonnement-info wordt nu als slanke strip onderaan getoond — voor
  // wie écht maandelijks wil. Pakken het goedkoopste abo voor de hint.
  const cheapestSub = subscriptionRows
    .filter((s) => s.priceCents > 0)
    .sort((a, b) => a.priceCents - b.priceCents)[0];
  const subPriceLabel = cheapestSub
    ? `vanaf €${eurosFromCents(cheapestSub.priceCents)}`
    : null;
  return (
    <section
      id="prijs"
      className="lp-section lp-section-tall"
      style={{
        padding: "96px 48px",
        background: V2.paperDeep,
        borderTop: `1px solid ${V2.paperShade}`,
        borderBottom: `1px solid ${V2.paperShade}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <Kicker>Wat het kost</Kicker>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(40px, 5vw, 56px)",
              margin: "20px 0 0",
              letterSpacing: -1.4,
              lineHeight: 1.05,
            }}
          >
            Eén avondritueel.
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>
              Eerlijke prijs.
            </span>
          </h2>
        </div>
        <div
          className="lp-pricing"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))`,
            gap: 0,
            background: V2.paper,
            border: `1px solid ${V2.paperShade}`,
          }}
        >
          {plans.map((p, i) => {
            const featured = p.featured;
            return (
              <div
                key={p.t}
                className="lp-pricing-card lp-pricing-card-pad"
                style={{
                  padding: 40,
                  position: "relative",
                  background: featured ? V2.night : V2.paper,
                  color: featured ? V2.paper : V2.ink,
                  borderRight:
                    i < plans.length - 1
                      ? `1px solid ${
                          featured ? "rgba(255,255,255,0.1)" : V2.paperShade
                        }`
                      : "none",
                  // Flex column lets us push the CTA to the bottom of the
                  // card so the three buttons line up regardless of how
                  // many feature bullets each plan has.
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {featured && p.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      fontFamily: V2.mono,
                      fontSize: 10,
                      color: V2.gold,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    ✦ {p.badge}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: V2.ui,
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    opacity: 0.65,
                  }}
                >
                  {p.t}
                </div>
                <div
                  className="lp-pricing-price"
                  style={{
                    fontFamily: V2.display,
                    fontSize: 64,
                    fontWeight: 300,
                    letterSpacing: -2,
                    marginTop: 16,
                    lineHeight: 1,
                  }}
                >
                  {p.p}
                </div>
                <div
                  style={{
                    fontFamily: V2.ui,
                    fontSize: 13,
                    opacity: 0.7,
                    marginTop: 6,
                    marginBottom: 32,
                  }}
                >
                  {p.u}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {p.f.map((f) => (
                    <li
                      key={f}
                      style={{
                        fontFamily: V2.body,
                        fontSize: 15,
                        lineHeight: 1.5,
                        padding: "10px 0",
                        display: "flex",
                        gap: 12,
                        borderTop: `1px solid ${
                          featured ? "rgba(255,255,255,0.1)" : V2.paperShade
                        }`,
                      }}
                    >
                      <IconV2
                        name="check"
                        size={16}
                        color={featured ? V2.gold : V2.ink}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto", paddingTop: 32 }}>
                  <EBtn
                    kind={featured ? "on-dark" : "primary"}
                    size="md"
                    href={p.href}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Begin hiermee →
                  </EBtn>
                </div>
              </div>
            );
          })}
        </div>

        {(subPriceLabel || subscriptionRows.length > 0) && (
          <div
            className="lp-credits-strip"
            style={{
              marginTop: 16,
              padding: "20px 28px",
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: V2.ui,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: V2.inkMute,
                  marginBottom: 6,
                }}
              >
                Liever maandelijks?
              </div>
              <div
                style={{
                  fontFamily: V2.body,
                  fontSize: 15,
                  color: V2.ink,
                  lineHeight: 1.5,
                }}
              >
                Abonnement{" "}
                {subPriceLabel && (
                  <span style={{ fontFamily: V2.display, fontSize: 22, fontWeight: 400 }}>
                    {subPriceLabel}
                  </span>
                )}{" "}
                <span style={{ color: V2.inkMute }}>
                  · vast aantal verhalen per maand · opzeggen kan altijd
                </span>
              </div>
            </div>
            <EBtn kind="ghost" size="sm" href="/subscribe">
              Bekijk abonnementen →
            </EBtn>
          </div>
        )}

        <p
          style={{
            textAlign: "center",
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.inkMute,
            marginTop: 24,
          }}
        >
          Altijd één gratis proefverhaal voor je iets afsluit.
        </p>
      </div>
    </section>
  );
}

// ── Trust strip ─────────────────────────────────────────────────────
// Vertrouwenssignalen voor twijfelende ouders, direct na de prijzen.
// De claims hieronder zijn allemaal echt gebouwd: EU-hosting (Neon
// Frankfurt/Scaleway Amsterdam), foto-moderatie + verwijdering na
// LoRA-training, alleen functionele cookies, 30-dagen-verwijderflow.

function TrustStrip() {
  const items = [
    {
      t: "Gemaakt en gehost in de EU",
      s: "Jullie gegevens blijven binnen Europa (AVG).",
    },
    {
      t: "Foto's automatisch gescreend",
      s: "En na het maken van het tekenpersonage verwijderd.",
    },
    {
      t: "Geen tracking, geen advertenties",
      s: "Alleen strikt noodzakelijke cookies.",
    },
    {
      t: "Opzeggen wanneer je wilt",
      s: "Je account en alle gegevens wissen kan altijd.",
    },
  ];
  return (
    <section
      className="lp-section"
      style={{
        padding: "56px 48px",
        borderTop: `1px solid ${V2.paperShade}`,
        background: V2.paperShade + "55",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          className="lp-trust"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 32,
          }}
        >
          {items.map((it) => (
            <div key={it.t}>
              <div
                style={{
                  fontFamily: V2.ui,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: 0.2,
                }}
              >
                <span aria-hidden style={{ color: V2.goldDeep, marginRight: 8 }}>
                  ✓
                </span>
                {it.t}
              </div>
              <p
                style={{
                  fontFamily: V2.body,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: V2.inkSoft,
                  margin: "6px 0 0",
                }}
              >
                {it.s}
              </p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link
            href="/privacy"
            style={{
              fontFamily: V2.ui,
              fontSize: 13,
              color: V2.inkMute,
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            Lees hoe we met jullie gegevens omgaan →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Founder note ───────────────────────────────────────────────────

function FounderNote() {
  return (
    <section className="lp-section lp-section-tall" style={{ padding: "120px 48px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
        <Kicker>Waarom dit bestaat</Kicker>
        <blockquote
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(26px, 3vw, 38px)",
            lineHeight: 1.3,
            margin: "28px 0 0",
            letterSpacing: -0.6,
            fontStyle: "italic",
          }}
        >
          &ldquo;Mijn vader vertelde vroeger elke avond over het jongetje.
          Pas jaren later viel het kwartje:{" "}
          <span style={{ fontStyle: "normal", color: V2.goldDeep }}>
            ík was het jongetje.
          </span>
          &rdquo;
        </blockquote>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: V2.paperShade,
              fontFamily: V2.display,
              color: V2.ink,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontStyle: "italic",
            }}
          >
            M
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: V2.ui, fontSize: 14, fontWeight: 500 }}>
              Marc van Zetten
            </div>
            <div style={{ fontFamily: V2.ui, fontSize: 13, color: V2.inkMute }}>
              oprichter van Ons Verhaaltje
            </div>
          </div>
        </div>
        <div style={{ marginTop: 28 }}>
          <Link
            href="/over-ons"
            style={{
              fontFamily: V2.ui,
              fontSize: 14,
              color: V2.inkSoft,
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            Lees het hele verhaal →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Slot CTA ────────────────────────────────────────────────────────

function SlotCTA() {
  return (
    <section
      className="lp-section lp-section-tall"
      style={{
        padding: "120px 48px",
        background: V2.night,
        color: V2.paper,
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <StarField count={12} />
      <div
        style={{
          position: "relative",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <Kicker color={V2.gold}>Vanavond</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(52px, 7vw, 80px)",
            margin: "24px 0 0",
            letterSpacing: -2,
            lineHeight: 1,
            color: V2.paper,
          }}
        >
          Begin het{" "}
          <span style={{ fontStyle: "italic", color: V2.gold }}>
            avondritueel.
          </span>
        </h2>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 18,
            lineHeight: 1.6,
            marginTop: 28,
            opacity: 0.8,
          }}
        >
          Eén gratis verhaal om te proberen. Klaar in drie minuten.
        </p>
        <div style={{ marginTop: 44 }}>
          <EBtn kind="on-dark" size="lg" href="/register">
            Maak het eerste verhaal{" "}
            <IconV2 name="arrow" size={16} color={V2.ink} />
          </EBtn>
        </div>
      </div>
    </section>
  );
}

