import { ContentPage, Lead } from "@/components/v2/landing/ContentPage";
import { EBtn } from "@/components/v2";
import { V2 } from "@/components/v2/tokens";
import { loadPublishedFaq } from "@/lib/faq";

export const metadata = {
  title: "Veelgestelde vragen",
  description:
    "Antwoorden op de vragen die ouders ons het vaakst stellen — over privacy, abonnement, het printboek en het maken van een verhaal.",
  alternates: { canonical: "/veelgestelde-vragen" },
};

// Bevat DB-data, dus dynamisch renderen.
export const dynamic = "force-dynamic";

export default async function VeelgesteldeVragenPage() {
  const entries = await loadPublishedFaq();

  return (
    <ContentPage
      eyebrow="Veelgestelde vragen"
      title={
        <>
          Wat ouders ons{" "}
          <span style={{ fontStyle: "italic" }}>vaak vragen.</span>
        </>
      }
    >
      <Lead>
        Geen callcenter, geen ticketsysteem. Hier onder de antwoorden die we
        het meest geven. Mis je iets?{" "}
        <a
          href="/contact"
          style={{ color: V2.ink, textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Vraag het ons
        </a>
        .
      </Lead>

      <div style={{ marginTop: 12 }}>
        {entries.map((e) => (
          <details
            key={e.id}
            style={{
              borderTop: `1px solid ${V2.paperShade}`,
              padding: "20px 0",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                listStyle: "none",
                fontFamily: V2.display,
                fontWeight: 400,
                fontSize: 20,
                color: V2.ink,
                lineHeight: 1.3,
                outline: "none",
              }}
            >
              {e.question}
            </summary>
            <div
              style={{
                marginTop: 14,
                fontFamily: V2.body,
                fontSize: 16,
                lineHeight: 1.65,
                color: V2.inkSoft,
                whiteSpace: "pre-wrap",
              }}
            >
              {e.answer}
            </div>
          </details>
        ))}
      </div>

      <div
        style={{
          marginTop: 56,
          paddingTop: 32,
          borderTop: `1px solid ${V2.paperShade}`,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: V2.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 18,
            color: V2.ink,
            lineHeight: 1.5,
          }}
        >
          Vraag beantwoord? Het eerste verhaal is gratis, dus je kunt het
          gewoon proberen.
        </p>
        <EBtn kind="primary" size="lg" href="/register">
          Probeer het
        </EBtn>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape "<" so admin-editable FAQ content can't break out of the
          // script tag with a literal </script>.
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": "https://www.onsverhaaltje.nl/veelgestelde-vragen#faqpage",
            inLanguage: "nl-NL",
            mainEntity: entries.map((e) => ({
              "@type": "Question",
              name: e.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: e.answer,
              },
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </ContentPage>
  );
}
