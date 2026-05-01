import {
  ContentPage,
  Lead,
  H2,
  P,
} from "@/components/v2/landing/ContentPage";

export const metadata = {
  title: "Voorwaarden · Ons Verhaaltje",
  description:
    "De afspraken tussen jou en Ons Verhaaltje, in begrijpelijke taal.",
};

export default function VoorwaardenPage() {
  return (
    <ContentPage
      eyebrow="Voorwaarden"
      title={
        <>
          De afspraken in{" "}
          <span style={{ fontStyle: "italic" }}>begrijpelijke taal.</span>
        </>
      }
    >
      <Lead>
        Hieronder staan de afspraken tussen jou en Ons Verhaaltje. We
        houden het kort en zonder juridisch jargon waar dat kan.
      </Lead>

      <H2>Wie zijn wij?</H2>
      <P>
        Ons Verhaaltje is een dienst van MVZ Consulting, gevestigd in
        Nederland. Voor vragen of klachten:{" "}
        <a href="mailto:info@onsverhaaltje.nl" style={{ color: "inherit" }}>
          info@onsverhaaltje.nl
        </a>
        .
      </P>

      <H2>Wat doet de dienst?</H2>
      <P>
        Met Ons Verhaaltje maak je gepersonaliseerde voorleesverhalen voor
        je kind. Je vult een profiel in, vertelt kort wat er die dag
        speelt, en wij maken er een kort verhaal van met bijpassende
        illustraties. Aan het einde van het jaar kun je de mooiste verhalen
        bundelen tot een gedrukt boekje.
      </P>

      <H2>Account en gebruik</H2>
      <P>
        Een account is bedoeld voor één huishouden. Je bent zelf
        verantwoordelijk voor het geheim houden van je wachtwoord. We
        vragen je om alleen profielen aan te maken voor kinderen waarvoor
        je toestemming hebt om dat te doen — meestal je eigen kinderen,
        maar in sommige gevallen ook bijvoorbeeld een kleinkind, met
        toestemming van de ouder.
      </P>
      <P>
        De dienst is niet bedoeld voor commercieel gebruik of doorverkoop
        van de gegenereerde verhalen. Voor persoonlijke en familiale
        doeleinden is alles wat we maken vrij om mee te doen wat je wilt:
        voorlezen, uitprinten, opslaan, in een eigen boekje verwerken.
      </P>

      <H2>Abonnement en prijs</H2>
      <P>
        We werken met een credit-systeem: per gegenereerd verhaal wordt
        één credit verbruikt. Tijdens de testfase werken we met
        handmatige goedkeuring van accounts en eenmalige tegoed-pakketten;
        de uiteindelijke prijsstructuur staat op de{" "}
        <a href="/#prijs" style={{ color: "inherit" }}>
          prijspagina
        </a>
        .
      </P>
      <P>
        Het gedrukte jaarboekje wordt los afgerekend op het moment van
        bestellen. De actuele prijs zie je voor je bevestigt.
      </P>

      <H2>Opzeggen en verwijderen</H2>
      <P>
        Een eventueel maandabonnement kun je per direct opzeggen vanuit je
        account. Je behoudt toegang tot je verhalen tot het einde van de
        lopende periode. Reeds gegenereerde verhalen blijven voor jou
        beschikbaar.
      </P>
      <P>
        Als je je hele account verwijdert, worden alle profielen,
        verhalen, illustraties en — als je foto&rsquo;s had geüpload —
        het LoRA-model en de bronfoto&rsquo;s definitief verwijderd. Zie
        de{" "}
        <a href="/privacy" style={{ color: "inherit" }}>
          privacy-pagina
        </a>{" "}
        voor de details.
      </P>

      <H2>Digitale producten en herroepingsrecht</H2>
      <P>
        Verhalen en credit-pakketten zijn digitale producten die direct na
        betaling beschikbaar komen. Volgens de Wet koop op afstand vervalt
        je herroepingsrecht zodra de levering is begonnen, mits je daar bij
        het afrekenen uitdrukkelijk mee instemt. Bij elke aankoop vink je
        daarom aan dat je akkoord gaat met deze voorwaarden — daarmee zie
        je af van de standaard 14-dagen-bedenktijd voor digitale levering.
      </P>
      <P>
        <strong>Niet-verbruikte credits</strong> kunnen we coulancehalve
        crediteren als je binnen 14 dagen na aankoop mailt naar{" "}
        <a href="mailto:info@onsverhaaltje.nl" style={{ color: "inherit" }}>
          info@onsverhaaltje.nl
        </a>
        {" "}met een uitleg. Verplicht is het niet meer, maar we zijn redelijk.
      </P>
      <P>
        <strong>Voor het gedrukte boekje</strong> geldt het herroepingsrecht
        niet als het op aanvraag voor jou specifiek wordt gedrukt — de wet
        sluit gepersonaliseerde producten uit van retourrecht. Als de druk
        niet aan kwaliteitseisen voldoet of beschadigd aankomt, lossen we
        dat natuurlijk op met een herdruk of refund.
      </P>
      <H2>Abonnementen en automatische incasso</H2>
      <P>
        Een abonnement loopt door totdat jij het opzegt. Bij de eerste
        betaling geef je via onze betaalprovider Mollie een{" "}
        <strong>SEPA-incasso-mandaat</strong> af (of je geeft toestemming
        voor recurring afschrijving op je creditcard / Apple Pay /
        Google Pay, afhankelijk van wat je kiest). Daarmee wordt het
        abonnementsbedrag automatisch afgeschreven aan het begin van elke
        nieuwe periode — maandelijks of jaarlijks, afhankelijk van het
        gekozen plan.
      </P>
      <P>
        Op de bevestigingsmail én in je account-pagina zie je elke keer
        wanneer de volgende incasso staat gepland. Op je bankafschrift
        verschijnen de afschrijvingen onder de naam{" "}
        <strong>Ons Verhaaltje</strong>.
      </P>
      <P>
        <strong>Opzeggen</strong> kan elk moment via je account-pagina,
        tot een dag voor de eerstvolgende incasso-datum. Bij opzegging
        behoud je toegang tot het einde van de periode die je al hebt
        betaald; daarna stopt de afschrijving en wordt het abonnement
        beëindigd. Reeds verbruikte verhalen worden niet teruggegeven.
      </P>
      <P>
        Voor SEPA-incasso&rsquo;s (iDEAL converteert daarnaartoe na de
        eerste betaling) heb je tot <strong>56 dagen</strong> na elke
        afschrijving het recht om het bedrag bij je bank terug te boeken
        — dat is een Europees consumentenrecht. Wij stoppen dan
        automatisch het abonnement.
      </P>

      <H2>Inhoud van de verhalen</H2>
      <P>
        De verhalen worden gegenereerd door AI-modellen op basis van het
        profiel dat je invult en de aanleiding die je geeft. We doen ons
        best om de verhalen leeftijdsgepast en veilig te houden, maar
        kunnen niet garanderen dat elk gegenereerd verhaal precies aansluit
        bij wat jij voor je kind passend vindt. Je leest het verhaal
        natuurlijk eerst zelf voor je het met je kind deelt; bij een
        verhaal dat je niet bevalt kun je een nieuw verhaal genereren of
        ons mailen.
      </P>
      <P>
        We gebruiken de inhoud van jouw profiel en verhalen niet om
        AI-modellen op te trainen, niet voor reclame en niet voor
        marktonderzoek.
      </P>

      <H2>Beschikbaarheid</H2>
      <P>
        We doen ons best om de dienst beschikbaar te houden, maar
        garanderen geen ononderbroken werking — onderhoud, updates of
        storingen bij onze leveranciers (zie privacy-pagina) kunnen
        tijdelijk uitval veroorzaken. Bij langere storingen die jou
        treffen tijdens een betaalde periode lossen we dat in redelijkheid
        op, bijvoorbeeld met extra credits.
      </P>

      <H2>Aansprakelijkheid</H2>
      <P>
        Onze aansprakelijkheid voor schade die voortkomt uit het gebruik
        van Ons Verhaaltje is beperkt tot het bedrag dat je in de zes
        maanden voorafgaand aan het schadevoorval voor de dienst hebt
        betaald. Deze beperking geldt niet bij opzet of grove
        nalatigheid van onze kant.
      </P>

      <H2>Klachten</H2>
      <P>
        Als er iets niet werkt of niet goed voelt: mail{" "}
        <a href="mailto:info@onsverhaaltje.nl" style={{ color: "inherit" }}>
          info@onsverhaaltje.nl
        </a>
        . We reageren binnen vijf werkdagen. Komen we er samen niet uit, dan
        kun je een geschil voorleggen aan de Nederlandse rechter.
      </P>

      <H2>Wijzigingen</H2>
      <P>
        We mogen deze voorwaarden aanpassen. Bij wezenlijke wijzigingen die
        jou raken, sturen we je een mail en geven we je dertig dagen om te
        besluiten of je akkoord gaat — anders kun je je account
        verwijderen. Kleine tekstuele aanpassingen melden we zonder mail.
      </P>

      <H2>Toepasselijk recht</H2>
      <P>
        Op deze voorwaarden is Nederlands recht van toepassing.
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
