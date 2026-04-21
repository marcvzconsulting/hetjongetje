import {
  ContentPage,
  Lead,
  StubNote,
} from "@/components/v2/landing/ContentPage";

export default function VoorwaardenPage() {
  return (
    <ContentPage
      number="A6"
      eyebrow="Voorwaarden"
      title={
        <>
          De afspraken in{" "}
          <span style={{ fontStyle: "italic" }}>begrijpelijke taal.</span>
        </>
      }
    >
      <Lead>
        Eerst de mensentaal-versie. Daaronder de juridische — voor wie het
        precies wil weten.
      </Lead>
      <StubNote>
        [Stub. TODO: algemene voorwaarden. Korte mensentaal-versie
        bovenaan, juridische versie eronder. Onderwerpen: abonnement,
        opzegtermijn, prijs van het jaarboek, wat te doen bij klachten.]
      </StubNote>
    </ContentPage>
  );
}
