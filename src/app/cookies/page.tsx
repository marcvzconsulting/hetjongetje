import {
  ContentPage,
  Lead,
  H2,
  P,
} from "@/components/v2/landing/ContentPage";
import { COMPANY } from "@/lib/legal";

export const metadata = {
  title: "Cookies · Ons Verhaaltje",
  description:
    "Welke cookies Ons Verhaaltje gebruikt — en vooral welke niet.",
};

export default function CookiesPage() {
  return (
    <ContentPage
      eyebrow="Cookies"
      title={
        <>
          Alleen wat nodig is,{" "}
          <span style={{ fontStyle: "italic" }}>niets dat volgt.</span>
        </>
      }
    >
      <Lead>
        Geen tracking, geen advertentienetwerken, geen profielen. De paar
        cookies die we wél gebruiken staan hieronder — allemaal.
      </Lead>

      <H2>Wat is een cookie?</H2>
      <P>
        Een cookie is een klein tekstbestandje dat een website in je
        browser bewaart, bijvoorbeeld om je ingelogd te houden.
      </P>

      <H2>Welke cookies gebruiken we?</H2>
      <P>
        Alle cookies hieronder zijn <strong>strikt noodzakelijk</strong>:
        zonder deze werkt inloggen simpelweg niet, of niet veilig. Ze zijn
        allemaal first-party — ze komen van ons, niet van derden.
      </P>
      <P>
        &middot; <em>authjs.session-token</em> — houdt je ingelogd nadat
        je bent ingelogd. Verdwijnt als je uitlogt, en verloopt anders
        vanzelf na maximaal 30 dagen.
        <br />
        &middot; <em>authjs.csrf-token</em> — beschermt het
        inlogformulier tegen misbruik door andere websites
        (CSRF-beveiliging). Geldt voor de duur van je browsersessie.
        <br />
        &middot; <em>authjs.callback-url</em> — onthoudt tijdens het
        inloggen naar welke pagina je daarna terug wilt. Geldt voor de
        duur van je browsersessie.
        <br />
        &middot; <em>ov_ref</em> — wordt alléén gezet als je via een
        uitnodigingslink van een andere ouder binnenkomt, zodat jullie
        allebei een gratis verhaal krijgen. Verloopt na 30 dagen en wordt
        direct gewist zodra je een account aanmaakt.
      </P>

      <H2>En localStorage?</H2>
      <P>
        Naast cookies bewaren we één waarde in de localStorage van je
        browser: <em>cookieConsent</em>. Die onthoudt dat je de
        cookiemelding onderaan de site hebt gezien, zodat &lsquo;ie niet
        bij elk bezoek opnieuw verschijnt. Deze waarde blijft staan tot
        je je browsergegevens wist en verlaat je browser nooit.
      </P>

      <H2>Geen tracking- of advertentiecookies</H2>
      <P>
        We gebruiken géén cookies om je te volgen, geen
        advertentiecookies en geen cookies van derden. Omdat strikt
        noodzakelijke cookies wettelijk geen toestemming vereisen, is de
        melding onderaan de site dan ook geen toestemmingsvraag maar een
        informatiemelding: er valt niets te weigeren, omdat er niets
        volgt.
      </P>

      <H2>Statistieken en foutmeldingen</H2>
      <P>
        Voor bezoekersstatistieken en laadtijden gebruiken we Vercel
        Analytics en Speed Insights. Die werken volledig{" "}
        <strong>cookieless</strong>: ze plaatsen niets in je browser en
        meten alleen anoniem verkeer, geen individuele bezoekers. Voor
        foutmeldingen gebruiken we Sentry — ook zonder cookies, met
        session replay uitgeschakeld en met automatische filtering van
        persoonsgegevens.
      </P>

      <H2>Vragen?</H2>
      <P>
        Hoe we verder met je gegevens omgaan lees je in de{" "}
        <a href="/privacy" style={{ color: "inherit" }}>
          privacyverklaring
        </a>
        . Vragen over cookies? Mail{" "}
        <a href={`mailto:${COMPANY.email}`} style={{ color: "inherit" }}>
          {COMPANY.email}
        </a>
        .
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
        Laatst bijgewerkt: juli 2026.
      </p>
    </ContentPage>
  );
}
