/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer's <Image>
   accepteert geen alt-prop; PDFs hebben hun eigen a11y-mechanisme
   (tagged PDF) los van HTML alt-text. */
/**
 * PDF-document voor één verhaal. A4-landscape spreads met tekst-links +
 * illustratie-rechts, een aparte titelpagina vooraan en een
 * afsluitspread achteraan zonder tekst (alleen ending-illustratie).
 *
 * Gebruikt @react-pdf/renderer — een afzonderlijk renderingsysteem dat
 * NIETS deelt met React-DOM. We compileren via `renderToStream` op de
 * server en streamen de PDF terug naar de client.
 *
 * Waarom landscape: een spread = één liggende A4 met links de tekst en
 * rechts de illustratie. Voelt boekachtig, drukker-vriendelijk, en je
 * kunt 'm thuis dubbelzijdig printen voor een quick-mock-up.
 *
 * Image-handling: @react-pdf/renderer kan een URL als src accepteren —
 * fetcht de image dan zelf vanuit de Node-runtime. Onze Scaleway-images
 * zijn publiek dus dat werkt direct. Bij ongeldige/missing URL zetten
 * we een placeholder-View neer zodat de pagina niet kapot gaat.
 */
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// We gebruiken voor nu de PDF-standaard-fonts (Helvetica + Times) —
// `@react-pdf/renderer`'s fontkit heeft moeite met variable-font TTFs
// (de meeste moderne Google Fonts), en static-TTF instances zijn
// lastig te krijgen. Afdoende voor MVP-download. Bij de echte druk-
// integratie komen huisfonts terug; dan willen we toch CMYK + bleed
// + 300dpi, dat is een grotere refactor waarin we 't in één keer
// goed doen.

// Hyphenation uit — react-pdf splitst standaard woorden tussen pagina's
// op rare plekken. Voor verhaaltekst is "geen koppeltekens" netter.
Font.registerHyphenationCallback((word) => [word]);

// A4 landscape: 842pt × 595pt (1 pt = 1/72 inch).
// Innerkant-marge ietsje groter dan buitenkant zodat een dubbelzijdige
// print niet in de "spine" valt — dat geeft 'm meteen een boek-feel.
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 36;

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    backgroundColor: "#f5efe4", // V2.paper
    padding: MARGIN,
  },
  textColumn: {
    flex: 1,
    paddingRight: 24,
    justifyContent: "center",
  },
  imageColumn: {
    flex: 1,
    paddingLeft: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pageImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  pageNumber: {
    fontSize: 9,
    color: "#9a9087",
    marginBottom: 14,
    letterSpacing: 1.4,
    fontFamily: "Helvetica-Bold",
  },
  pageText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#1f1e3a", // V2.ink
    fontFamily: "Times-Roman",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ebe2d1",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: "#9a9087",
    fontFamily: "Times-Italic",
  },

  // Title page
  titlePage: {
    backgroundColor: "#f5efe4",
    padding: MARGIN,
    flexDirection: "row",
  },
  titleLeft: {
    flex: 1,
    paddingRight: 24,
    justifyContent: "center",
  },
  titleEyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#9a8a4f",
    marginBottom: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  titleHeading: {
    fontSize: 38,
    color: "#1f1e3a",
    fontFamily: "Times-Italic",
    lineHeight: 1.15,
    marginBottom: 14,
  },
  titleSubtitle: {
    fontSize: 13,
    color: "#5b5550",
    fontFamily: "Times-Italic",
    marginBottom: 40,
  },
  titleMeta: {
    fontSize: 10,
    color: "#9a9087",
    fontFamily: "Helvetica",
    letterSpacing: 0.6,
  },

  // Ending page
  endingPage: {
    backgroundColor: "#f5efe4",
    padding: MARGIN * 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  endingImage: {
    width: "70%",
    height: "70%",
    objectFit: "contain",
    marginBottom: 24,
  },
  endingText: {
    fontSize: 13,
    color: "#5b5550",
    fontFamily: "Times-Italic",
    textAlign: "center",
    maxWidth: 400,
  },

  // Footer (drukker-meta op laatste pagina)
  colofon: {
    position: "absolute",
    bottom: 18,
    left: MARGIN,
    right: MARGIN,
    fontSize: 8,
    color: "#9a9087",
    textAlign: "center",
    fontFamily: "Helvetica",
    letterSpacing: 0.4,
  },
});

export type StoryPdfPage = {
  pageNumber: number;
  text: string;
  illustrationUrl: string | null;
};

export type StoryPdfInput = {
  title: string;
  subtitle: string | null;
  childName: string;
  createdAt: Date;
  pages: StoryPdfPage[];
  /** Laatste illustratie (afsluitscène). Null = geen ending-spread. */
  endingIllustrationUrl: string | null;
};

function formatDateNl(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function StoryPdfDocument({ story }: { story: StoryPdfInput }) {
  // Splits "story-pages" en "ending" — de ending heeft typisch lege text
  // en alleen een illustratie. We renderen 'm op een eigen layout.
  const storyPages = story.pages.filter((p) => p.text.trim().length > 0);

  return (
    <Document
      title={story.title}
      author={`Ons Verhaaltje — voor ${story.childName}`}
      subject="Persoonlijk verhaal"
    >
      {/* ── Titelpagina ────────────────────────────────── */}
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.titlePage}>
        <View style={styles.titleLeft}>
          <Text style={styles.titleEyebrow}>Een verhaal voor {story.childName}</Text>
          <Text style={styles.titleHeading}>{story.title}</Text>
          {story.subtitle ? (
            <Text style={styles.titleSubtitle}>{story.subtitle}</Text>
          ) : null}
          <Text style={styles.titleMeta}>
            Geschreven op {formatDateNl(story.createdAt)} · onsverhaaltje.nl
          </Text>
        </View>
        <View style={styles.imageColumn}>
          {storyPages[0]?.illustrationUrl ? (
            <Image src={storyPages[0].illustrationUrl} style={styles.pageImage} />
          ) : (
            <ImagePlaceholder />
          )}
        </View>
      </Page>

      {/* ── Verhaalpagina's ─────────────────────────────── */}
      {storyPages.map((p) => (
        <Page key={p.pageNumber} size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
          <View style={styles.textColumn}>
            <Text style={styles.pageNumber}>PAGINA {p.pageNumber}</Text>
            <Text style={styles.pageText}>{p.text}</Text>
          </View>
          <View style={styles.imageColumn}>
            {p.illustrationUrl ? (
              <Image src={p.illustrationUrl} style={styles.pageImage} />
            ) : (
              <ImagePlaceholder />
            )}
          </View>
        </Page>
      ))}

      {/* ── Afsluitpagina ───────────────────────────────── */}
      {story.endingIllustrationUrl ? (
        <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.endingPage}>
          <Image src={story.endingIllustrationUrl} style={styles.endingImage} />
          <Text style={styles.endingText}>
            Welterusten, {story.childName}.
          </Text>
          <Text
            style={styles.colofon}
            render={() => `Persoonlijk gemaakt door Ons Verhaaltje · onsverhaaltje.nl`}
          />
        </Page>
      ) : null}
    </Document>
  );
}

function ImagePlaceholder() {
  return (
    <View style={styles.imagePlaceholder}>
      <Text style={styles.imagePlaceholderText}>(geen illustratie)</Text>
    </View>
  );
}
