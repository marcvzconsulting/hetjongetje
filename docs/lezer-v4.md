# Lezer v4 (BookViewerV4)

De lezer zonder boekformaat, voor `/story/[storyId]` en de deelpagina
`/s/[token]`. De vorige lezer (`BookViewerV3`) staat er nog naast en is
met één schakelaar terug te zetten.

## Lay-out

De lay-out volgt de **oriëntatie** van het scherm, niet de breedte.

| Oriëntatie | Lay-out |
|---|---|
| Staand | Illustratie boven, tekstkaart eronder |
| Liggend | Tekst en illustratie naast elkaar, elk 50 %. Verhaalpagina's wisselen van kant; kaft en einde hebben de illustratie links |

Tekstschaal: telefoon 1×, tablet staand 1,35×, tablet liggend 1,45×,
desktop 1,5×, groot beeldscherm (vanaf 1600 × 950) 1,8×.

## Schakelaars

| Schakelaar | Waarden | Standaard |
|---|---|---|
| Env `READER_VERSION` of `?lezer=` | `v4`, `v3` | `v4` |
| Env `READER_TEXT_OVERFLOW` of `?tekst=` | `splits`, `splits-vast`, `scroll`, `doorlopend` | `splits` |

De URL-parameter wint van de env-variabele. Een env-wijziging in Vercel
gaat pas in na een nieuwe deploy.

**Terug naar de vorige lezer:** zet `READER_VERSION=v3` in Vercel en
deploy opnieuw. Voor één verhaal: zet `?lezer=v3` achter het adres.

## Tekst die niet op de pagina past

| Optie | Gedrag |
|---|---|
| `splits` | De illustratie krimpt eerst (van 47 % tot minimaal 34 % van de hoogte), dan gaat de letter een trap kleiner. Past het dan nog niet, dan komt er een extra pagina met dezelfde illustratie |
| `splits-vast` | De illustratie houdt 47 %. Past de tekst niet, dan direct een extra pagina |
| `scroll` | De illustratie krimpt. Past het dan nog niet, dan scrollt de tekstkaart |
| `doorlopend` | Staande telefoon: het hele verhaal scrolt door. Elke pagina is een blok met de illustratie bovenaan vastgezet en de tekst eronder; de tekst schuift onder de illustratie door, en is de tekst op, dan duwt de volgende pagina de illustratie omhoog. Kaft en pagina 1 delen één blok (ze hebben dezelfde illustratie): titel en direct daaronder de tekst. Knoppen en stipjes scrollen naar de pagina. Op tablet en liggend werkt dit als `splits` |

De illustratie heeft binnen één verhaal overal dezelfde maat. Opgesplitste
tekst breekt bij voorkeur na een zin en wordt gelijk over de delen
verdeeld. Liggend staat de illustratie naast de tekst; daar speelt
krimpen niet.

Tijdens het voorlezen bladert de lezer zelf door naar het volgende deel
van dezelfde pagina. De audio loopt dan door.

## Nachtmodus

`nacht = handmatige keuze ?? (automatisch aan && binnen het tijdvak)`

- Het tijdvak stel je in op `/admin/nachtmodus`. Standaard 20:00–07:00.
- De lezer rekent met de klok van het toestel. De server kent die niet
  en gebruikt voor de eerste weergave Nederlandse tijd.
- Het maantje in de bovenbalk geldt voor de sessie (`sessionStorage`).
- Opslag: tabel `app_settings`, sleutels `reader.autoNight`,
  `reader.nightStart`, `reader.nightEnd` (minuten sinds middernacht).
  Ontbreekt een rij of de hele tabel, dan geldt de standaard.
- Elke wijziging schrijft een auditregel `reader.night_mode.update`.

## Uitrol

1. `pnpm db:push:prod` maakt de tabel `app_settings` aan. De wijziging
   voegt alleen toe.
2. Deploy.

De lezer werkt ook als stap 1 nog niet gedaan is: hij valt dan terug op
de standaard. Alleen opslaan op `/admin/nachtmodus` mislukt dan.

## Bestanden

| Pad | Inhoud |
|---|---|
| `src/components/v2/story/BookViewerV4.tsx` | Bladeren, omslag, nachtmodus, bediening |
| `src/components/v2/story/v4/` | Pagina, doorlopend scrollen (`ReaderFlow`), bediening, menu, lay-out, meten, palet |
| `src/lib/story/reader-units.ts` | Spreads naar pagina-eenheden, tekst opsplitsen |
| `src/lib/reader/` | Nachtvenster, instelling laden en opslaan, schakelaars |
| `src/app/(admin)/admin/nachtmodus/` | Adminpagina |
| `scripts/test-reader-v4.ts` | Controles op de logica: `npx tsx scripts/test-reader-v4.ts` |

## Bewuste afwijkingen van het ontwerp

Op verzoek van Marc (30 sep 2026):

- **Bovenbalk doorzichtig.** Geen dekkende balk met vervaging; alleen een
  zachte overgang van boven naar beneden, zodat de illustratie erdoorheen
  zichtbaar blijft. 's Nachts iets meer dekking, anders zijn titel en
  knoppen op een lichte illustratie niet te lezen.
- **Tekst direct op het papier.** De tekstkaart heeft geen eigen kleur en
  geen korrel meer; tekst en illustratie vormen één geheel, zoals in de
  liggende lay-out.
- **Golvende rand.** Elke illustratie krijgt een zachte, onregelmatige
  rand boven en onder, en liggend ook aan de kant van de tekst
  (`v4/edge.ts`, een SVG-masker met ruis), als aquarel op nat papier.
  Browsers zonder maskers tonen een rechte rand.

Uit de bouw:

- **Marge boven en onder.** Het ontwerp rekent met 54 px bovenin voor de
  statusbalk van het toestelkader. In een browser staat de pagina daar
  niet onder; de lezer gebruikt de veilige marge van het toestel
  (`env(safe-area-inset-*)`).
- **Illustratie krimpt.** In een telefoonbrowser is het scherm lager dan
  de 874 px uit het ontwerp. Met een vaste 47 % zou ook een kort verhaal
  worden opgesplitst.
- **Kaft en einde schalen mee** op tablet en desktop. In het ontwerp
  schaalt alleen de verhaaltekst.
- **Melding "Nachtmodus gaat automatisch aan om …"** staat alleen in de
  drie uur vóór het tijdvak op de kaft. Overdag gaat de bladerhint voor.
- **Klik in het midden** toont of verbergt de bediening alleen op een
  aanraakscherm. Met een muis blijft de bediening staan.
- **Laatste pagina:** de bediening blijft staan, zodat "Nog een keer!" en
  "Maak je eigen verhaal" niet verdwijnen.
