import {
  ContentPage,
  Lead,
  StubNote,
} from "@/components/v2/landing/ContentPage";

export default function PrivacyPage() {
  return (
    <ContentPage
      number="A5"
      eyebrow="Privacy"
      title={
        <>
          Wat we bewaren,{" "}
          <span style={{ fontStyle: "italic" }}>en wat niet.</span>
        </>
      }
    >
      <Lead>
        Jullie kind is niet een marketinggegeven. Wat wij weten, weten wij
        — en verder niemand.
      </Lead>
      <StubNote>
        [Stub. TODO: privacyverklaring volgens AVG. Concreet: welke
        gegevens we verzamelen over kind en ouder, waar ze opgeslagen zijn
        (Scaleway nl-ams), hoe lang we ze bewaren, of we ze delen, hoe je
        ze laat verwijderen.]
      </StubNote>
    </ContentPage>
  );
}
