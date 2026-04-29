import {
  ContentPage,
  Lead,
  StubNote,
} from "@/components/v2/landing/ContentPage";

export const metadata = {
  title: "Hoe het werkt",
  description:
    "Van profiel naar voorleesverhaal in drie stappen — naam en knuffel invullen, vertellen wat er speelt, en wij maken er een verhaal van.",
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
      <StubNote>
        [Stub. TODO: uitgebreide pagina over het profiel invullen, hoe wij
        het verhaal opbouwen, hoe lang het duurt, waar de illustraties
        vandaan komen en hoe het jaarboekje gedrukt wordt.]
      </StubNote>
    </ContentPage>
  );
}
