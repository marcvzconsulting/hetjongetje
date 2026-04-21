import {
  ContentPage,
  Lead,
  StubNote,
} from "@/components/v2/landing/ContentPage";

export default function VeelgesteldeVragenPage() {
  return (
    <ContentPage
      number="A3"
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
        het meest geven.
      </Lead>
      <StubNote>
        [Stub. TODO: lijst met echte vragen en eerlijke antwoorden.
        Onderwerpen: leeftijdsbereik, waar de tekst en illustraties vandaan
        komen, opzeggen, het gedrukte jaarboek, privacy van
        kindergegevens.]
      </StubNote>
    </ContentPage>
  );
}
