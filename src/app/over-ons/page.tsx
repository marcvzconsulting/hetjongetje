import {
  ContentPage,
  Lead,
  StubNote,
} from "@/components/v2/landing/ContentPage";

export default function OverOnsPage() {
  return (
    <ContentPage
      number="A1"
      eyebrow="Over ons"
      title={
        <>
          Wie er achter{" "}
          <span style={{ fontStyle: "italic" }}>Ons Verhaaltje</span> zit.
        </>
      }
    >
      <Lead>
        Een klein team, één duidelijke belofte: elk verhaal moet echt over
        jullie kind gaan.
      </Lead>
      <StubNote>
        [Stub. TODO: korte editorial pagina over wie het maakt, waarom we
        dit doen, hoe we met de teksten omgaan en wat AI hier wel en niet
        voor ons doet.]
      </StubNote>
    </ContentPage>
  );
}
