import {
  ContentPage,
  Lead,
  StubNote,
} from "@/components/v2/landing/ContentPage";
import { V2 } from "@/components/v2/tokens";

export default function ContactPage() {
  return (
    <ContentPage
      number="A4"
      eyebrow="Contact"
      title={
        <>
          Vragen, opmerkingen,{" "}
          <span style={{ fontStyle: "italic" }}>een idee?</span>
        </>
      }
    >
      <Lead>
        Eén echt e-mailadres. Geen tickets. Reactie binnen één werkdag —
        dat durven we te beloven.
      </Lead>
      <p style={{ margin: "0 0 8px", fontFamily: V2.body, fontSize: 16 }}>
        Schrijf ons op:
      </p>
      <p
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: 26,
          fontWeight: 400,
          margin: "0 0 40px",
          letterSpacing: -0.3,
        }}
      >
        <a
          href="mailto:hallo@onsverhaaltje.nl"
          style={{ color: V2.ink, textDecoration: "none" }}
        >
          hallo@onsverhaaltje.nl
        </a>
      </p>
      <StubNote>
        [Stub. TODO: eventueel een rustig contactformulier. Voor nu werkt
        het e-mailadres hierboven.]
      </StubNote>
    </ContentPage>
  );
}
