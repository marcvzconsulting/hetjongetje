import {
  ContentPage,
  Lead,
  P,
} from "@/components/v2/landing/ContentPage";
import { V2 } from "@/components/v2/tokens";

export const metadata = {
  title: "Over ons",
  description:
    "Wie er achter Ons Verhaaltje zit, en waarom we deze dienst hebben gemaakt.",
  alternates: { canonical: "/over-ons" },
};

export default function OverOnsPage() {
  return (
    <ContentPage
      eyebrow="Over ons"
      title={
        <>
          Wie er achter{" "}
          <span style={{ fontStyle: "italic" }}>Ons Verhaaltje</span> zit.
        </>
      }
    >
      <Lead>
        Ons Verhaaltje is ontstaan door een herinnering aan vroeger.
      </Lead>

      <P>
        Toen ik klein was, vertelde mijn vader vaak een verhaaltje voor het
        slapen gaan. De verhalen speelden zich af op bijzondere plekken en
        gingen bijna altijd over <em>het jongetje</em>. Het jongetje
        beleefde de mooiste avonturen, en ik luisterde ademloos tot mijn
        ogen vanzelf dichtvielen.
      </P>

      <figure style={{ margin: "48px 0" }}>
        <div
          style={{
            aspectRatio: "4 / 3",
            background: V2.paperDeep,
            border: `1px solid ${V2.paperShade}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: V2.mono,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: V2.inkMute,
          }}
        >
          FOTO VOLGT
        </div>
        <figcaption
          style={{
            marginTop: 14,
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 14,
            color: V2.inkMute,
            lineHeight: 1.5,
          }}
        >
          Ik, ergens rond mijn vierde, luisterend naar de avonturen van het
          jongetje.
        </figcaption>
      </figure>

      <P>
        Pas toen ik ouder werd, viel het kwartje. De avonturen van het
        jongetje leken opvallend veel op dingen die ik zelf meemaakte. En
        dat klopte: <em>ík was het jongetje</em>. Mijn vader stopte stukjes
        uit mijn eigen leven in zijn verhalen, en maakte er zo iets van dat
        alleen van mij was.
      </P>

      <P>
        Als ik daaraan terugdenk, voel ik nog altijd die warme bedtijdsfeer.
        Wat ik jammer vind, is dat ik ze nergens meer terug kan lezen. Ik
        zou zo graag nog eens zien welke avonturen het jongetje beleefde,
        en wat ik allemaal meemaakte toen ik zelf nog klein was.
      </P>

      <P>
        Vanuit dat gemis heb ik Ons Verhaaltje bedacht. Een plek waar jij
        als ouder in een paar minuten een persoonlijk verhaaltje maakt voor
        je kind. Met hun naam, hun lievelingsdier, de knuffel die
        &rsquo;s nachts naast ze ligt. En omdat de techniek van nu dat
        toelaat, kun je die verhaaltjes bundelen tot een echt boekje.
        Zodat jouw kind ze later, net als ik nu, nog eens terug kan lezen.
      </P>

      <p
        style={{
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${V2.paperShade}`,
          fontFamily: V2.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 18,
          color: V2.ink,
          lineHeight: 1.5,
        }}
      >
        Marc, oprichter van Ons Verhaaltje
      </p>
    </ContentPage>
  );
}
