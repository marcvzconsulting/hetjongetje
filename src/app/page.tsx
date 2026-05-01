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
      <ResponsiveStyles />
      <Nav />
      <Hero />
      <StoryPreviewSection />
      <HowItGoes />
      <NightHero />
      <BookSection />
      <Pricing />
      <Testimonial />
      <SlotCTA />
      <LandingFooter />
    </div>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-illustration.png"
                alt="Een klein meisje in pyjama met een knuffelolifant"
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
    },
    {
      n: "II",
      t: "Vertel wat er vanavond speelt",
      b: "Een zin is genoeg. Of vertel meer: 'Er was vandaag een tekening van oma', 'Noor wilde vanmiddag alleen olifantenbrood'.",
    },
    {
      n: "III",
      t: "Voorlezen, of laten voorlezen",
      b: "Op de tablet, of op papier. Aan het einde van het jaar bundel je de mooiste verhalen in een echt gedrukt boekje.",
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
                  gridTemplateColumns: "80px 1fr",
                  gap: 24,
                  padding: "28px 0",
                  borderTop: `1px solid ${V2.paperShade}`,
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
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              fontFamily: V2.display,
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 400 }}>€29,95</span>
            <span
              style={{
                fontFamily: V2.ui,
                fontSize: 14,
                color: V2.inkMute,
              }}
            >
              of €19,95 met jaarabonnement
            </span>
          </div>
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
  let smallestCreditPack: Awaited<ReturnType<typeof prisma.creditPack.findFirst>> = null;
  let bulkCreditPack: Awaited<ReturnType<typeof prisma.creditPack.findFirst>> = null;
  try {
    const [subs, single, bulk] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }],
      }),
      // Cheapest single-story option for the per-verhaal headline.
      prisma.creditPack.findFirst({
        where: { active: true, creditAmount: 1 },
        orderBy: [{ priceCents: "asc" }],
      }),
      // Pack >1 to highlight as "10 voor €12"-style deal.
      prisma.creditPack.findFirst({
        where: { active: true, creditAmount: { gt: 1 } },
        orderBy: [{ creditAmount: "desc" }],
      }),
    ]);
    subscriptionRows = subs;
    smallestCreditPack = single;
    bulkCreditPack = bulk;
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

  const plans: PricingCard[] = subscriptionRows.length > 0
    ? subscriptionRows.map((s) => ({
        t: s.name,
        p: `€${eurosFromCents(s.priceCents)}`,
        u: s.description ?? "",
        badge: s.badge ?? undefined,
        featured: s.code === "annual",
        f: Array.isArray(s.features) ? (s.features as string[]) : [],
        href: "/subscribe",
      }))
    : [
        // Fallback if catalog hasn't been seeded yet — same copy as before.
        {
          t: "Per maand",
          p: "€7,95",
          u: "per maand",
          f: ["8 verhalen per maand", "Verhalen blijven bewaard", "Meerdere kinderen", "Opzeggen kan altijd"],
          href: "/subscribe",
        },
        {
          t: "Per jaar",
          p: "€79",
          u: "per jaar, bespaar €16",
          badge: "meest gekozen",
          featured: true,
          f: ["96 verhalen per jaar", "Verhalen blijven bewaard", "Meerdere kinderen", "€10 korting op het boekje"],
          href: "/subscribe",
        },
      ];

  // Append the "los bijkopen" card if we have at least one pack to point at.
  if (smallestCreditPack) {
    const bulkLine = bulkCreditPack
      ? `Pakket van ${bulkCreditPack.creditAmount} voor €${eurosFromCents(bulkCreditPack.priceCents)}`
      : "Direct beschikbaar";
    plans.push({
      t: "Los bijkopen",
      p: `€${eurosFromCents(smallestCreditPack.priceCents)}`,
      u: "per los verhaal",
      f: ["Bovenop je abonnement", bulkLine, "Direct beschikbaar"],
      href: "/credits",
    });
  }
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
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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

// ── Testimonial ────────────────────────────────────────────────────

function Testimonial() {
  return (
    <section className="lp-section lp-section-tall" style={{ padding: "120px 48px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
        <Kicker>Ouders vertellen</Kicker>
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
          &ldquo;Onze {SAMPLE_NAME} vraagt elke avond:{" "}
          <span style={{ fontStyle: "normal", color: V2.goldDeep }}>
            mag ik mijn verhaal?
          </span>{" "}
          Niet een verhaal. Háár verhaal.&rdquo;
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
            S
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: V2.ui, fontSize: 14, fontWeight: 500 }}>
              Sanne de Groot
            </div>
            <div style={{ fontFamily: V2.ui, fontSize: 13, color: V2.inkMute }}>
              moeder van {SAMPLE_NAME} (5)
            </div>
          </div>
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

