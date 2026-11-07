import Image from "next/image";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";
import { LandingNav } from "@/components/v2/landing/LandingNav";
import { LandingFooter } from "@/components/v2/landing/LandingFooter";
import { StickyMobileCta } from "@/components/v2/landing/StickyMobileCta";

const TITLE = "Sinterklaasverhaal met je kind in de hoofdrol";
const DESCRIPTION =
  "Maak in een paar minuten een persoonlijk Sinterklaasverhaal om voor te lezen, met je eigen kind als held. De eerste vijf verhalen zijn gratis.";
const OG_IMAGE = "/images/sinterklaas/marie-schoen.jpg";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/sinterklaas" },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "/sinterklaas",
    siteName: "Ons Verhaaltje",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const STEPS = [
  {
    title: "Vertel wie je kind is",
    body: "Naam, leeftijd, de knuffel, de mensen eromheen. Dat doe je maar één keer.",
  },
  {
    title: "Kies Sinterklaas",
    body: "Bij “Is er iets te vieren?” kies je Sinterklaas. Speelt het op een eigen plek, zoals de haven waar de Sint aankomt? Dan vul je die zelf in.",
  },
  {
    title: "Lees voor",
    body: "Bij “Wat is er vandaag gebeurd?” is één zin genoeg. Een paar minuten later staat het verhaal klaar, op je telefoon of tablet.",
  },
];

const FRAGMENTS = [
  {
    image: "/images/sinterklaas/marie-speeltuin.jpg",
    alt: "Marie met haar rode jurk bij de glijbaan, naast een vriendinnetje en een bruine hond",
    text: "Marie zwaaide zo hard dat haar arm er moe van werd. Sinterklaas zwaaide terug, dat zag ze echt. Na de intocht liep Marie naar de speeltuin bij haar huis.",
  },
  {
    image: "/images/sinterklaas/marie-wegwijspiet.jpg",
    alt: "Marie en Wegwijspiet op een boomstronk in het bos, met een kaart en een zak pepernoten",
    text: "Bij een splitsing met drie paden zat Wegwijspiet op een boomstronk. Hij hield zijn kaart ondersteboven en krabde aan zijn muts. “Alle bomen lijken op elkaar,” zuchtte hij verdrietig.",
  },
  {
    image: "/images/sinterklaas/marie-kaart.jpg",
    alt: "Marie rent met haar schetsboek voorop, Wegwijspiet loopt achter haar aan met de zak pepernoten",
    text: "Wegwijspiet keek naar de tekening en zijn ogen begonnen te stralen. “Jij bent een echte kaartentekenaar!” riep hij. Marie rende voorop, zo snel als een hert.",
  },
];

const MOMENTS = [
  { title: "De intocht", line: "We hebben vandaag naar de stoomboot gezwaaid." },
  { title: "Schoen zetten", line: "Vanavond zet ze haar schoen, met een wortel voor het paard." },
  { title: "Op school", line: "Sinterklaas kwam vandaag op school langs." },
  { title: "Pakjesavond", line: "Morgen is het pakjesavond en hij kan niet wachten." },
];

export default function SinterklaasPage() {
  return (
    <div
      className="v2-root"
      style={{ fontFamily: V2.body, color: V2.ink, background: V2.paper }}
    >
      <ResponsiveStyles />
      <LandingNav />
      <main>
        <Hero />
        <HowItGoes />
        <Example />
        <Moments />
        <GoodToKnow />
        <ClosingCta />
      </main>
      {/* Footer heeft eigen aanmeldknop: sticky CTA verbergt zich zolang hij in beeld is */}
      <div data-sticky-cta-hide>
        <LandingFooter />
      </div>
      <StickyMobileCta note="Klaar in 3 minuten, geen abonnement nodig" />
    </div>
  );
}

function ResponsiveStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media (max-width: 760px) {
  .sk-section { padding: 56px 20px !important; }
  .sk-grid-2, .sk-grid-3, .sk-grid-4 { grid-template-columns: 1fr !important; gap: 32px !important; }
  .sk-grid-4 { gap: 20px !important; }
}
`,
      }}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: V2.display,
        fontWeight: 300,
        fontSize: "clamp(34px, 4.4vw, 52px)",
        lineHeight: 1.08,
        letterSpacing: -1.2,
        margin: "16px 0 0",
      }}
    >
      {children}
    </h2>
  );
}

function Hero() {
  return (
    <section className="sk-section" style={{ padding: "80px 48px" }}>
      <div
        className="sk-grid-2"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: 64,
          alignItems: "center",
        }}
      >
        <div>
          <Kicker size="lg">Sinterklaas</Kicker>
          <h1
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(42px, 5.6vw, 76px)",
              lineHeight: 1.02,
              letterSpacing: -1.8,
              margin: "20px 0 0",
            }}
          >
            Een Sinterklaasverhaal met{" "}
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>
              jouw kind
            </span>{" "}
            in de hoofdrol.
          </h1>
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.55,
              margin: "28px 0 0",
              color: V2.inkSoft,
              maxWidth: 520,
            }}
          >
            Jullie zwaaiden naar de stoomboot, of vanavond gaat de schoen bij de
            kachel. Vertel het in één zin. Een paar minuten later lees je een
            verhaal voor waarin je kind zelf het avontuur beleeft.
          </p>
          <div style={{ marginTop: 32 }} data-sticky-cta-anchor>
            <EBtn kind="primary" size="lg" href="/register">
              Begin met vijf gratis verhalen{" "}
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
              Klaar in 3 minuten, geen abonnement nodig
            </div>
          </div>
        </div>

        <figure style={{ margin: 0 }}>
          <Image
            src={OG_IMAGE}
            alt="Marie zit met haar schoen en een wortel bij de open haard, naast een vriendinnetje en haar hond"
            width={1024}
            height={768}
            priority
            sizes="(max-width: 760px) 90vw, 560px"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
          <figcaption
            style={{
              marginTop: 12,
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: 13,
              color: V2.inkMute,
            }}
          >
            Uit het voorbeeldverhaal van Marie, zes jaar.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function HowItGoes() {
  return (
    <section
      className="sk-section"
      style={{ padding: "80px 48px", background: V2.paperDeep }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Kicker>Hoe het gaat</Kicker>
        <SectionTitle>Drie stappen, meer niet.</SectionTitle>
        <div
          className="sk-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 48,
            marginTop: 48,
          }}
        >
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <div
                style={{
                  fontFamily: V2.display,
                  fontStyle: "italic",
                  fontSize: 36,
                  color: V2.goldDeep,
                  lineHeight: 1,
                }}
              >
                {["I", "II", "III"][i]}
              </div>
              <h3
                style={{
                  fontFamily: V2.display,
                  fontWeight: 400,
                  fontSize: 24,
                  margin: "16px 0 0",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: V2.inkSoft,
                  margin: "10px 0 0",
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Example() {
  return (
    <section className="sk-section" style={{ padding: "80px 48px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Kicker>Voorbeeldverhaal</Kicker>
        <SectionTitle>
          Marie en de{" "}
          <span style={{ fontStyle: "italic" }}>verdwaalde Wegwijspiet.</span>
        </SectionTitle>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: V2.inkSoft,
            margin: "16px 0 0",
            maxWidth: 640,
          }}
        >
          Marie is een voorbeeldkind van zes dat we zelf hebben bedacht. Dit zijn
          fragmenten uit haar verhaal, voor de groep 5 tot 7 jaar.
        </p>
        <div
          className="sk-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 32,
            marginTop: 40,
          }}
        >
          {FRAGMENTS.map((fragment) => (
            <figure key={fragment.image} style={{ margin: 0 }}>
              <Image
                src={fragment.image}
                alt={fragment.alt}
                width={1024}
                height={768}
                sizes="(max-width: 760px) 90vw, 380px"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
              <figcaption
                style={{
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: V2.ink,
                  marginTop: 16,
                }}
              >
                {fragment.text}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Moments() {
  return (
    <section
      className="sk-section"
      style={{ padding: "80px 48px", background: V2.paperDeep }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Kicker>Waar begin je?</Kicker>
        <SectionTitle>Eén zin over jullie dag is genoeg.</SectionTitle>
        <div
          className="sk-grid-4"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 32,
            marginTop: 40,
          }}
        >
          {MOMENTS.map((moment) => (
            <div key={moment.title}>
              <h3
                style={{
                  fontFamily: V2.ui,
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {moment.title}
              </h3>
              <p
                style={{
                  fontFamily: V2.display,
                  fontStyle: "italic",
                  fontSize: 19,
                  lineHeight: 1.4,
                  color: V2.inkSoft,
                  margin: "8px 0 0",
                }}
              >
                “{moment.line}”
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GoodToKnow() {
  const linkStyle = {
    color: V2.ink,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  } as const;
  const items = [
    {
      question: "Hoe zit het met de Pieten?",
      answer:
        "In onze verhalen zijn alle Pieten roetveegpieten. Dat is een vaste regel.",
    },
    {
      question: "Voor welke leeftijd is het?",
      answer:
        "Voor kinderen van 2 tot 10 jaar. De taal groeit mee: korte zinnen voor de kleintjes, meer avontuur voor de oudsten.",
    },
    {
      question: "Wat kost het?",
      answer: (
        <>
          De eerste vijf verhalen zijn gratis, zonder abonnement. Daarna kies je
          zelf: losse verhalen of een abonnement.{" "}
          <Link href="/losse-verhalen" style={linkStyle}>
            Bekijk de prijzen
          </Link>
          .
        </>
      ),
    },
    {
      question: "Is het met AI gemaakt?",
      answer:
        "Ja. Het verhaal en de illustraties worden met AI gemaakt, op basis van wat jij vertelt. Voorlezen doe je zelf.",
    },
  ];
  return (
    <section className="sk-section" style={{ padding: "80px 48px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Kicker>Goed om te weten</Kicker>
        <div
          className="sk-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "36px 64px",
            marginTop: 28,
          }}
        >
          {items.map((item) => (
            <div key={item.question}>
              <h2
                style={{
                  fontFamily: V2.display,
                  fontWeight: 400,
                  fontSize: 24,
                  margin: 0,
                }}
              >
                {item.question}
              </h2>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: V2.inkSoft,
                  margin: "8px 0 0",
                }}
              >
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section
      data-sticky-cta-hide
      className="sk-section"
      style={{
        padding: "96px 48px",
        background: V2.night,
        color: V2.paper,
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <StarField count={12} />
      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
        <Kicker color={V2.gold}>Vanavond</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(40px, 6vw, 68px)",
            margin: "20px 0 0",
            letterSpacing: -1.6,
            lineHeight: 1.04,
            color: V2.paper,
          }}
        >
          De schoen staat klaar.{" "}
          <span style={{ fontStyle: "italic", color: V2.gold }}>
            Het verhaal ook?
          </span>
        </h2>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.55,
            color: V2.goldSoft,
            margin: "20px 0 32px",
          }}
        >
          Vijf gratis verhalen om te proberen. Klaar in drie minuten.
        </p>
        <EBtn kind="on-dark" size="lg" href="/register">
          Begin met vijf gratis verhalen{" "}
          <IconV2 name="arrow" size={16} color={V2.ink} />
        </EBtn>
      </div>
    </section>
  );
}
