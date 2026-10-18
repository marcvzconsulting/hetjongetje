import Link from "next/link";
import { ContentPage, P } from "@/components/v2/landing/ContentPage";
import { EBtn } from "@/components/v2";
import { V2 } from "@/components/v2/tokens";

/**
 * Eigen 404-pagina. Zonder dit bestand toont Next.js de Engelse standaard
 * ("This page could not be found") binnen onze layout. Rendert in de stijl
 * van de overige publieke pagina's (nav + editorial header + footer).
 */
export default function NotFound() {
  return (
    <ContentPage
      eyebrow="404 · Niet gevonden"
      title={
        <>
          Deze bladzijde is{" "}
          <span style={{ fontStyle: "italic" }}>zoekgeraakt.</span>
        </>
      }
    >
      <P>
        De pagina die je zocht bestaat niet, of niet meer. Misschien is er
        een tikfout in het adres geslopen, of is de link die je kreeg niet
        helemaal compleet overgekomen.
      </P>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 32,
        }}
      >
        <EBtn kind="primary" href="/">
          Naar de voorkant →
        </EBtn>
        <EBtn kind="ghost" href="/dashboard">
          Naar mijn verhalen
        </EBtn>
      </div>

      <p
        style={{
          marginTop: 40,
          fontFamily: V2.ui,
          fontSize: 13,
          color: V2.inkMute,
        }}
      >
        Kwam je hier via een link van ons?{" "}
        <Link href="/contact" style={{ color: "inherit" }}>
          Laat het ons weten
        </Link>
        , dan maken we hem.
      </p>
    </ContentPage>
  );
}
