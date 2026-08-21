# Gegevensbeschermingseffectbeoordeling (DPIA) — Ons Verhaaltje

> **Status: CONCEPT** · Versie 0.1 · Opgesteld 17-07-2026
>
> ⚠️ **Disclaimer:** dit is een technisch onderbouwd concept, opgesteld op basis van een
> code-audit van de applicatie. Het is **geen juridisch advies**. Laat deze DPIA
> vóór vaststelling toetsen door een privacyjurist of Functionaris Gegevensbescherming (FG).
> Velden gemarkeerd met **[INVULLEN]** vereisen jouw beslissing of bedrijfsgegevens.

---

## 0. Waarom deze DPIA verplicht is (art. 35 AVG)

Een DPIA is verplicht bij een verwerking die *waarschijnlijk een hoog risico* inhoudt.
Ons Verhaaltje raakt **drie** van de criteria die de EDPB (WP248) en de Autoriteit
Persoonsgegevens als indicatoren noemen — twee is al genoeg:

1. **Gegevens van kwetsbare betrokkenen** — de verwerking betreft **kinderen**.
2. **Bijzondere persoonsgegevens** — bij LoRA-training worden **foto's van het gezicht
   van een kind** verwerkt om een gepersonaliseerd beeldmodel te trainen. Dit kwalificeert
   als **biometrische gegevens** (art. 9 AVG) zodra het model bedoeld is om die persoon
   uniek af te beelden/herkennen.
3. **Innovatieve technologie** — generatieve AI (tekst + beeld + stem) toegepast op
   persoonsgegevens van kinderen.

Conclusie: een DPIA is **vereist**. Deze voldoet daaraan.

---

## 1. Beschrijving van de verwerking

### 1.1 Verwerkingsverantwoordelijke
- **Onderneming:** [INVULLEN — handelsnaam, rechtsvorm]
- **KvK / BTW:** [INVULLEN]
- **Adres:** [INVULLEN]
- **Contact / verantwoordelijke:** Marc van Zetten — [INVULLEN e-mail]
- **Functionaris Gegevensbescherming (FG):** [INVULLEN — of "niet aangesteld; zie §6.1"]

### 1.2 Doel van de verwerking
Het genereren van gepersonaliseerde kinderverhalen met bijpassende illustraties en
optionele voorlees-audio, waarin het kind zelf (op naam, met eigen kenmerken en
interesses) de hoofdpersoon is. Ouders kunnen verhalen bewaren, delen en later tot een
gedrukt boek bundelen.

### 1.3 Betrokkenen
- **Kinderen** — over wie het verhaal gaat (naam, leeftijd, uiterlijk, interesses, en
  bij LoRA optioneel foto's). Zij zijn zelf geen gebruiker.
- **Ouders/verzorgers** — de accounthouders die de gegevens invoeren, toestemming geven
  en de rechten uitoefenen namens het kind.
- **Derden-kinderen** — voornamen van vriendjes die in een verhaal genoemd worden
  (zie risico R7).

### 1.4 Categorieën persoonsgegevens
| Categorie | Voorbeelden | Bijzonder? |
|---|---|---|
| Accountgegevens ouder | naam, e-mail, wachtwoord-hash, taal | nee |
| Betaal-/adresgegevens | via Mollie; adres bij boek-verzending | nee |
| Kindprofiel | voornaam, geboortedatum, geslacht, uiterlijk (haar/ogen/huid), interesses, angsten, huisdieren, vriendjes | nee (wel gevoelig — kind) |
| Kindfoto's (LoRA) | 5-15 foto's t.b.v. modeltraining | **ja — art. 9 (biometrisch)** |
| Gegenereerde content | verhaaltekst (met kindnaam), illustraties, voorlees-audio | nee (wel gevoelig) |
| Gebruiks-/loggegevens | e-maillogboek, foutmeldingen (gescrubd), rate-limit-tellers | nee |

### 1.5 Rechtsgrond
- **Uitvoering overeenkomst** (art. 6(1)(b)) voor account, verhaalgeneratie, betaling.
- **Toestemming** (art. 6(1)(a)) van de ouder namens het kind voor niet-noodzakelijke
  verwerkingen; in Nederland geeft de ouder toestemming voor kinderen tot 16 jaar
  (art. 8 AVG). Vastgelegd via `termsAcceptedAt`.
- **Uitdrukkelijke toestemming** (art. 9(2)(a)) voor de LoRA-fototraining (biometrisch).
  Server-side afgedwongen en vastgelegd via `loraConsentAt`; in één klik intrekbaar.
- **Gerechtvaardigd belang / wettelijke plicht** — order- en factuurgegevens 7 jaar
  bewaard wegens fiscale bewaarplicht (art. 6(1)(c)).

### 1.6 Datastromen en verwerkers (sub-processors)
| Verwerker | Doel | Data | Locatie | Doorgifte |
|---|---|---|---|---|
| Neon | productiedatabase | alle DB-gegevens | Frankfurt (EU) | binnen EU |
| Scaleway | bestandsopslag | illustraties, audio, foto's (privé) | Amsterdam (EU) | binnen EU |
| Vercel | hosting/compute | verkeer/logs | functieregio Frankfurt (EU) | binnen EU |
| Anthropic (Claude) | verhaaltekst + fotomoderatie | prompt met kindkenmerken; foto ter moderatie | VS | **buiten EU** |
| fal.ai | illustraties + LoRA-training | illustratie-prompts; **kindfoto's** | VS | **buiten EU** |
| ElevenLabs | voorlees-audio | verhaaltekst incl. kindnaam | VS | **buiten EU** |
| Mollie | betalingen | betaal-/adresgegevens | Nederland (EU) | binnen EU |
| Brevo | transactionele e-mail/nieuwsbrief | e-mail, naam | EU (Frankrijk) | binnen EU |
| Sentry | foutmonitoring | metadata (PII uitgefilterd) | EU-regio | binnen EU |

> **Doorgifte buiten de EU** (Anthropic, fal.ai, ElevenLabs — VS) vereist een geldig
> transfermechanisme onder hoofdstuk V AVG (adequaatheidsbesluit EU-VS Data Privacy
> Framework, of Standard Contractual Clauses). **[INVULLEN/ACTIE — zie §6.2]**

### 1.7 Bewaartermijnen
| Gegeven | Termijn | Mechanisme |
|---|---|---|
| Account + kindprofielen + verhalen | zolang account bestaat | verwijdering op verzoek |
| LoRA-foto's (origineel) + trainings-zip | tot enkele dagen na training | automatische cron + intrekking |
| LoRA-model bij fal.ai | zolang profiel bestaat; verwijdering aangevraagd | **beperking: zie R6** |
| Verwijderd account | direct + 30 dagen bedenktijd, daarna hard-delete | cron `account-deletion` |
| Orders/facturen | 7 jaar (fiscaal) | `userId` op null gezet, rest bewaard |
| E-maillogboek | 12 maanden | cron `daily` |
| Database-back-ups | 30 dagen | nachtelijke pg_dump + prune |

---

## 2. Beoordeling noodzaak en evenredigheid

| Beginsel | Beoordeling |
|---|---|
| **Doelbinding** (5.1.b) | Gegevens uitsluitend gebruikt voor verhaalgeneratie; geen advertenties, geen verkoop aan derden. **Voldoet.** |
| **Minimalisatie** (5.1.c) | Grotendeels passend. Aandachtspunt: volledige geboortedatum wordt gevraagd terwijl alleen de leeftijd wordt gebruikt (R7); vriendjesnamen zijn optioneel gevoelig. **Deels — zie aanbeveling.** |
| **Juistheid** (5.1.d) | Ouder kan profiel altijd bewerken. **Voldoet.** |
| **Opslagbeperking** (5.1.e) | Bewaartermijnen gedefinieerd en geautomatiseerd (§1.7). **Voldoet, met restpunt R6 (fal.ai).** |
| **Integriteit/vertrouwelijkheid** (5.1.f) | Uitgebreide technische maatregelen (§4). **Voldoet grotendeels.** |
| **Verantwoording** (5.2) | Consent-momenten vastgelegd; deze DPIA. **Voldoet.** |

---

## 3. Risico's voor de rechten en vrijheden van betrokkenen

Beoordeling per risico op een schaal **Laag / Middel / Hoog**, ná de reeds getroffen
maatregelen (restrisico).

| # | Risico | Bron/scenario | Impact | Kans | Restrisico |
|---|---|---|---|---|---|
| R1 | Datalek kindgegevens | ongeautoriseerde toegang tot DB/opslag | Hoog | Laag | **Laag-Middel** |
| R2 | Publieke blootstelling illustraties/audio | bestanden staan op publieke URL; gedeelde link | Middel | Middel | **Middel** |
| R3 | Blootstelling kindfoto's (biometrisch) | LoRA-foto's | Hoog | Laag | **Laag** |
| R4 | Onrechtmatige doorgifte VS | verwerking bij Anthropic/fal.ai/ElevenLabs | Middel | Middel | **Middel (tot DPA's rond zijn)** |
| R5 | Ongepast gegenereerd beeld met kindgelijkenis | ontspoorde generatie op LoRA-pad | Hoog | Laag | **Laag** |
| R6 | Onvolledig verwijderrecht bij fal.ai | fal.ai biedt geen delete-API voor het model | Middel | Middel | **Middel** |
| R7 | Bovenmatige verzameling | volledige geboortedatum; vriendjesnamen (derden) | Laag | Middel | **Laag-Middel** |
| R8 | Verlies van controle ouder | account-overname, ongewenste e-mail | Middel | Laag | **Laag** |

Toelichting op de zwaarste punten:

- **R2 (publieke blootstelling):** illustraties en voorlees-audio worden bewust op
  publiek-leesbare URL's aangeboden (nodig voor de deelfunctie en OG-previews). De URL's
  bevatten niet-raadbare UUID's, maar een gelekte URL blijft toegankelijk. Bewuste,
  gedocumenteerde afweging; kindfoto's vallen hier **niet** onder (die zijn privé — R3).
- **R4 (doorgifte VS):** het transfermechanisme moet contractueel geborgd zijn. Zolang de
  DPA's/SCC's niet getekend zijn, is dit het grootste openstaande compliance-risico.
- **R6 (fal.ai-retentie):** het getrainde model — een statistische afgeleide van het
  gezicht — kan bij fal.ai niet actief via API worden verwijderd. De privacyverklaring is
  hierop eerlijk gemaakt; volledige sluiting vergt een contractuele wisafspraak of een
  provider met delete-functionaliteit.

---

## 4. Getroffen maatregelen (technisch & organisatorisch)

Veel maatregelen zijn recent geïmplementeerd (audit + fix-ronde 17-07-2026):

**Toegang & authenticatie**
- Wachtwoorden met bcrypt (cost 12); reset-/magic-link-tokens 256-bit, alleen als hash
  opgeslagen, single-use met expiry; reset-links gepind op vertrouwde URL (geen poisoning).
- Rolgebaseerde toegang; admins uitgesloten van wachtwoord-login (2FA-achtig).
- Eigendomscontrole op élke route (`childProfile.userId`); geen IDOR's.

**Bijzondere gegevens (kindfoto's)**
- Fotomoderatie **fail-closed** vóór opslag (Claude Vision).
- Foto's + trainings-zip **privé** opgeslagen; fal.ai leest via kortlevende presigned URL.
- Automatische verwijdering na training (cron) — niet meer afhankelijk van gebruikersactie.
- fal.ai safety-checker aan op het pad dat het kindgezicht genereert.
- Uitdrukkelijke, intrekbare toestemming (`loraConsentAt`).

**Data-minimalisatie & bewaring**
- Sentry filtert PII (kindnamen, verhaaltekst, foto's, URL-tokens) uit foutmeldingen.
- Verwijderflow wist DB + alle bucketobjecten; e-maillog- en rate-limit-retentie via cron.
- Orders bewaard onder fiscale plicht met losgekoppeld `userId`.

**Beschikbaarheid & integriteit**
- Dagelijkse, versleutelde, niet-publieke back-ups met restore-test; 30 dagen retentie.
- Rate-limiting op alle betaalde/gevoelige acties; strikte beveiligingsheaders + CSP.
- Betaalstromen atomair (geen dubbele afschrijving/creditering); actuele frameworkversies.

**Transparantie & rechten**
- Privacyverklaring met volledige verwerkerslijst en doorgiftevermelding.
- Selfservice data-export (art. 15/20) en verwijdering (art. 17) met 30 dagen bedenktijd.
- Cookiebanner die klopt met de werkelijk geplaatste (uitsluitend functionele) cookies.

---

## 5. Restrisico en oordeel

Na de getroffen maatregelen resteert een **aanvaardbaar restrisico**, mits de volgende
punten worden afgehandeld:

1. **DPA's/transfermechanismen (R4)** met Anthropic, fal.ai en ElevenLabs tekenen.
2. **fal.ai-retentie (R6)** contractueel regelen of een eerlijke, definitieve termijn
   afspreken; overwegen op termijn een provider met delete-API.
3. **Minimalisatie (R7)** — overwegen geboortedatum te vervangen door maand+jaar of leeftijd.

Zonder deze punten is het restrisico **Middel** (met name R4). Met deze punten afgehandeld
is het **Laag** en is een voorafgaande raadpleging van de AP (art. 36) naar verwachting
**niet** nodig.

---

## 6. Advies, openstaande acties en raadpleging

### 6.1 Functionaris Gegevensbescherming (FG)
Een FG is verplicht bij grootschalige verwerking van bijzondere gegevens (art. 37(1)(c))
of stelselmatige grootschalige monitoring. Gezien de huidige (beperkte) schaal is een FG
waarschijnlijk **niet verplicht**, maar dit moet worden herbeoordeeld naarmate het
klantenbestand groeit. **[INVULLEN — beoordeling + datum]**

### 6.2 Actielijst
- [ ] DPA's/SCC's tekenen met Anthropic, fal.ai, ElevenLabs (**R4 — prioriteit**)
- [ ] fal.ai-modelretentie contractueel of via support borgen (**R6**)
- [ ] Geboortedatum-minimalisatie overwegen (**R7**)
- [ ] Bedrijfsgegevens + FG-beoordeling in deze DPIA invullen
- [ ] DPIA laten toetsen door jurist/FG en vaststellen
- [ ] Herzieningsmoment vastleggen (jaarlijks, of bij nieuwe verwerker/functie)
- [ ] Verwerkingsregister (art. 30) bijwerken conform §1.6

### 6.3 Voorafgaande raadpleging AP (art. 36)
Naar verwachting **niet vereist**, mits de restrisico's naar "Laag" zijn teruggebracht
(§5). Herbeoordeel dit als er nieuwe hoog-risico-functies bijkomen.

---

## 7. Vaststelling

| Rol | Naam | Datum | Paraaf |
|---|---|---|---|
| Verwerkingsverantwoordelijke | Marc van Zetten | [INVULLEN] | |
| FG / privacyjurist (toetsing) | [INVULLEN] | [INVULLEN] | |

**Volgende herziening gepland:** [INVULLEN — bv. 17-07-2027, of eerder bij wijziging]
