import {
  ContentPage,
  Lead,
  H2,
  P,
} from "@/components/v2/landing/ContentPage";

export const metadata = {
  title: "Privacy · Ons Verhaaltje",
  description:
    "Wat Ons Verhaaltje bewaart aan gegevens van ouder en kind, en hoe we daarmee omgaan.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Privacy"
      title={
        <>
          Wat we bewaren,{" "}
          <span style={{ fontStyle: "italic" }}>en wat niet.</span>
        </>
      }
    >
      <Lead>
        Jullie kind is voor ons geen marketinggegeven. Wat wij weten, weten
        wij, en verder niemand.
      </Lead>

      <H2>Wie zijn wij?</H2>
      <P>
        Ons Verhaaltje wordt geëxploiteerd door MVZ Consulting, gevestigd in
        Nederland. Verantwoordelijke voor deze verwerking in de zin van de
        AVG: Marc van Zetten. Contact via{" "}
        <a href="mailto:info@onsverhaaltje.nl" style={{ color: "inherit" }}>
          info@onsverhaaltje.nl
        </a>
        .
      </P>

      <H2>Welke gegevens verzamelen we?</H2>
      <P>
        Van de <strong>ouder/accounthouder</strong>: naam, e-mailadres,
        wachtwoord (gehasht), optioneel telefoonnummer en adres (nodig voor
        boekje-verzending), en login-geschiedenis.
      </P>
      <P>
        Van het <strong>kind</strong>, voor zover ingevuld: naam, geboortedatum,
        uiterlijkskenmerken (haar-, oog-, huidskleur, bril, sproeten),
        interesses, mensen en huisdieren, favoriete dingen, angsten.
        Daarnaast de verhalen die wij genereren, inclusief illustraties.
      </P>

      <H2>Foto&rsquo;s van je kind: character LoRA</H2>
      <P>
        Als je ervoor kiest, kun je bij het profiel 5 tot 15 foto&rsquo;s
        van je kind uploaden. Met die foto&rsquo;s trainen we een klein
        &lsquo;LoRA&rsquo;: een aanpassing op het illustratiemodel, zodat
        het kind in elk verhaal consistent dezelfde gezichtskenmerken
        heeft.
      </P>
      <P>
        Deze verwerking valt onder <strong>biometrische gegevens</strong>{" "}
        (AVG art. 9 lid 1). Wij verwerken deze gegevens uitsluitend op
        basis van jouw <strong>expliciete, uitdrukkelijke toestemming</strong>.
        Je bent nooit verplicht foto&rsquo;s te uploaden, het
        text-based alternatief blijft werken.
      </P>
      <P>
        <strong>Wat gebeurt er met de foto&rsquo;s?</strong> De originele
        foto&rsquo;s worden via een beveiligde verbinding (HTTPS) verstuurd
        naar onze opslag bij Scaleway (datacenter nl-ams, Amsterdam). Voor
        de training sturen we ze door naar onze AI-partner{" "}
        <a
          href="https://fal.ai"
          style={{ color: "inherit" }}
          rel="noopener"
          target="_blank"
        >
          fal.ai
        </a>
        . Zodra de training is voltooid worden de originele foto&rsquo;s
        binnen 7 dagen van beide locaties verwijderd. Het getrainde LoRA
        zelf (een klein bestand met statistische informatie, geen
        herkenbare foto&rsquo;s) wordt bewaard zolang het profiel van je
        kind bestaat.
      </P>
      <P>
        <strong>Je kunt je toestemming altijd intrekken.</strong> In het
        profiel kun je het LoRA en alle bijbehorende foto&rsquo;s in één
        klik verwijderen. Wij verwijderen alle sporen binnen 30 dagen.
        Hetzelfde gebeurt automatisch als je het kinderprofiel of het hele
        account verwijdert.
      </P>

      <H2>Met wie delen we gegevens?</H2>
      <P>
        <strong>Alleen met verwerkers die we strikt nodig hebben:</strong>
      </P>
      <P>
        &middot; <em>Neon</em>: PostgreSQL database (EU-regio, Frankfurt)
        <br />
        &middot; <em>Scaleway</em>: bestandsopslag voor illustraties en
        foto&rsquo;s (nl-ams, Amsterdam)
        <br />
        &middot; <em>Vercel</em>: website-hosting
        <br />
        &middot; <em>Anthropic (Claude)</em>: tekst van de verhalen
        genereren
        <br />
        &middot; <em>fal.ai</em>: illustraties genereren en eventuele LoRA
        trainen
        <br />
        &middot; <em>Brevo</em>: transactionele e-mail (wachtwoord-reset,
        welkom, nieuwsbrief); EU-servers, Frans bedrijf
      </P>
      <P>
        We delen niets met adverteerders, brokers of analytics-partijen
        anders dan Vercel Analytics (anoniem verkeer, geen persoonlijke
        gegevens).
      </P>

      <H2>Nieuwsbrief</H2>
      <P>
        De nieuwsbrief is <strong>opt-in</strong>: je krijgt &lsquo;m pas
        als je zelf aanvinkt dat je &lsquo;m wilt ontvangen, via je
        account-pagina of het formulier onderaan de site. Wij bewaren het
        moment van aanmelden (datum + IP) als bewijs van toestemming,
        conform AVG.
      </P>
      <P>
        Uitschrijven kan altijd, op drie manieren: via de afmeldlink
        onderaan elke nieuwsbrief, via je account-pagina, of door ons te
        mailen op{" "}
        <a href="mailto:info@onsverhaaltje.nl" style={{ color: "inherit" }}>
          info@onsverhaaltje.nl
        </a>
        . Bij uitschrijven verwijderen we je e-mailadres uit Brevo binnen 30
        dagen.
      </P>

      <H2>Hoe lang bewaren we gegevens?</H2>
      <P>
        &middot; Account + profiel: zolang je het account hebt
        <br />
        &middot; Originele foto&rsquo;s van het kind: maximaal 7 dagen na
        succesvolle LoRA-training
        <br />
        &middot; LoRA-bestand: zolang het kinderprofiel bestaat
        <br />
        &middot; Verhalen + illustraties: zolang het kinderprofiel bestaat
        <br />
        &middot; Facturen: 7 jaar (wettelijk)
      </P>

      <H2>Jouw rechten</H2>
      <P>
        Je hebt recht op inzage, correctie, verwijdering, beperking en
        dataportabiliteit. Voor het grootste deel zit dat al in de app:{" "}
        <a href="/account" style={{ color: "inherit" }}>
          jouw account-pagina
        </a>{" "}
        laat je elk veld wijzigen en geeft je een knop om alles te
        verwijderen.
      </P>
      <P>
        Voor andere verzoeken, of als je denkt dat we iets niet goed doen,
        mail dan{" "}
        <a href="mailto:info@onsverhaaltje.nl" style={{ color: "inherit" }}>
          info@onsverhaaltje.nl
        </a>
        . Je hebt ook het recht om een klacht in te dienen bij de
        Autoriteit Persoonsgegevens.
      </P>

      <p
        style={{
          marginTop: 48,
          fontFamily: "var(--font-lora), Georgia, serif",
          fontStyle: "italic",
          fontSize: 13,
          opacity: 0.7,
        }}
      >
        Laatst bijgewerkt: april 2026.
      </p>
    </ContentPage>
  );
}
