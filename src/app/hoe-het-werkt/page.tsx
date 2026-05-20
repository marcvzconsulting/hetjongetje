import {
  ContentPage,
  H2,
  Lead,
  P,
} from "@/components/v2/landing/ContentPage";
import { EBtn } from "@/components/v2";
import { V2 } from "@/components/v2/tokens";

export const metadata = {
  title: "Hoe het werkt",
  description:
    "Van profiel naar voorleesverhaal in een paar minuten — hoe we het profiel gebruiken, hoe het verhaal ontstaat, en wat er onder de motorkap gebeurt.",
  alternates: { canonical: "/hoe-het-werkt" },
};

export default function HoeHetWerktPage() {
  return (
    <ContentPage
      eyebrow="Hoe het werkt"
      title={
        <>
          Van profiel naar{" "}
          <span style={{ fontStyle: "italic" }}>voorleesverhaal.</span>
        </>
      }
    >
      <Lead>
        Jullie vullen één keer een profiel in. Daarna vertelt één zin wat
        er vanavond speelt. Wij maken er een verhaal van.
      </Lead>

      <P>
        Hieronder vertellen we precies wat er gebeurt tussen het moment
        dat je op <em>Maak een verhaaltje</em> klikt en het moment dat je
        het kunt voorlezen. Geen toverdoos, maar gewoon de stappen, zodat
        je weet wat je krijgt en waar wij keuzes voor jullie maken.
      </P>

      <H2>Het profiel</H2>
      <P>
        We beginnen met een kort profiel per kind. De basis: naam,
        leeftijd en geslacht. Daarmee weten we de toon. Een verhaal voor
        een drie­jarige loopt anders dan voor een acht­jarige. We werken
        met drie leeftijds­groepen (2-4, 5-7 en 8-10), elk met hun eigen
        zinslengte en woordenschat.
      </P>
      <P>
        Daarna vragen we de details die een verhaal persoonlijk maken.
        Uiterlijk (haar, ogen, huid, bril, sproetjes) gebruiken we voor
        de illustraties. Interesses, lievelingseten en favoriete plek
        weven we door de tekst. Huisdieren, vrienden en zelfs angsten
        kunnen meespelen, of we houden ze er juist uit als jij dat liever
        hebt.
      </P>
      <P>
        Helemaal onderaan kies je het <em>hoofdpersonage</em>. Vaak is
        dat het kind zelf, soms een knuffel of een zelfbedacht figuur.
        Alles is optioneel: hoe meer je invult, hoe persoonlijker het
        verhaal. Je kunt het profiel altijd later aanvullen of bijwerken.
      </P>

      <H2>Portret-training (optioneel)</H2>
      <P>
        Standaard tekenen we het kind op basis van de uiterlijk-velden.
        Dat werkt prima, al kan het gezicht dan per illustratie iets
        verschillen. Wil je dat het kind in élk verhaal exact hetzelfde
        eruit ziet, dan kun je een paar foto&rsquo;s uploaden (vijf tot
        vijftien stuks). We trainen daar in ongeveer tien minuten een
        klein, persoonlijk model van.
      </P>
      <P>
        Dit is strikt optioneel, valt onder AVG-artikel 9 (biometrische
        gegevens) en vraagt expliciete toestemming. De foto&rsquo;s
        worden binnen zeven dagen verwijderd; het getrainde model blijft
        zolang het profiel bestaat. Eén klik in het profiel haalt alles
        weer weg.
      </P>

      <H2>Het verhaal aanvragen</H2>
      <P>
        Als het profiel klaar is, kost een nieuw verhaal twee korte
        keuzes. Eerst de <em>sfeer</em>: spannend, grappig, avontuurlijk,
        troostend, en zo verder. Dan het <em>onderwerp</em>, bijvoorbeeld
        een tochtje door het bos, een onderwater­avontuur of een dag op
        school. Tot slot één zin context, als je iets specifieks wilt
        meegeven. Bijvoorbeeld: &lsquo;Sam is bang voor de
        tandarts­afspraak morgen&rsquo; of &lsquo;Het is opa&rsquo;s
        verjaardag&rsquo;.
      </P>
      <P>
        Die zin is geen verplichting. Maar hij maakt vaak het verschil
        tussen een leuk verhaal en een verhaal dat precies vannacht
        bedoeld lijkt.
      </P>

      <H2>Wat er onder de motorkap gebeurt</H2>
      <P>
        Je input gaat eerst door een vertaalslag naar het Engels. Niet
        omdat we Nederlands niet vertrouwen, maar omdat de modellen waar
        we mee werken meetbaar betere verhalen schrijven in het Engels.
        Daarna schrijft Claude (van Anthropic) een verhaal van zes
        pagina&rsquo;s, met 50 tot 150 woorden per pagina. Per pagina
        bedenkt hij ook een illustratie-beschrijving.
      </P>
      <P>
        Die beschrijvingen sturen we, samen met het uiterlijk van het
        kind, naar het illustratie­model (Flux 2 Pro via fal.ai). Dat
        levert zes prentjes, één per pagina. Tot slot vertalen we het
        verhaal terug naar het Nederlands en bouwen we het tot een
        digitaal prentenboek. Het hele proces duurt meestal één tot twee
        minuten.
      </P>
      <P>
        Als de verbinding hapert of het illustratie­model even pruttelt,
        krijg je dat te zien. Geen halve mislukkingen of zwarte
        pagina&rsquo;s: die laten we niet door.
      </P>

      <H2>Voorlezen, herlezen, of opnieuw</H2>
      <P>
        Het verhaal opent in een lees-modus die op telefoon, tablet én
        groot scherm prettig leest. Onderaan kun je het verhaal
        beoordelen. Als het echt niet helemaal goed valt, mag je het één
        keer per verhaal opnieuw laten maken met dezelfde instellingen.
        Schrijf dan kort wat je anders wilt. Zonder uitleg krijg je
        waarschijnlijk een vergelijkbaar verhaal terug.
      </P>
      <P>
        Alle verhalen blijven bewaard in jullie bibliotheek. Vanavond
        nieuw, over een half jaar nostalgie.
      </P>

      <H2>Bundelen tot een boekje (binnenkort)</H2>
      <P>
        We zijn bezig met de laatste stap: jullie favoriete verhalen
        bundelen tot een echt, gedrukt prentenboek. Een jaarboekje of
        verjaardags­cadeau, met de avonturen van het afgelopen jaar. Het
        digitale verhaal blijft natuurlijk gewoon beschikbaar. Zodra het
        klaar is, sturen we een berichtje.
      </P>

      <H2>Privacy &amp; autonomie</H2>
      <P>
        We bewaren niet meer dan nodig is en delen niks met derden voor
        commerciële doelen. Je kunt op elk moment je profiel of je hele
        account verwijderen. Dan is alles binnen 30 dagen weg, inclusief
        eventueel getraind portret-model. De volledige uitleg staat in
        de{" "}
        <a
          href="/privacy"
          style={{
            color: V2.ink,
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          privacy­verklaring
        </a>
        .
      </P>

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
          Klaar om te beginnen? Een profiel invullen kost zo&rsquo;n vijf
          minuten. Daarna staat er binnen twee minuten een verhaaltje
          klaar.
        </p>
        <EBtn kind="primary" size="lg" href="/register">
          Probeer het
        </EBtn>
      </div>
    </ContentPage>
  );
}
