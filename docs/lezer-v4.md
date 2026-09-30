# Lezer v4 (BookViewerV4)

De lezer zonder boekformaat, voor `/story/[storyId]` en de deelpagina
`/s/[token]`. De vorige lezer (`BookViewerV3`) staat er nog naast en is
met één schakelaar terug te zetten.

## Lay-out

De lay-out volgt de **oriëntatie** van het scherm, niet de breedte.

| Oriëntatie | Lay-out |
|---|---|
| Staand | Illustratie boven, tekstkaart eronder |
| Liggend | Tekst en illustratie naast elkaar. De illustratie houdt haar eigen verhouding (4:3) en staat in het midden van de hoogte; haar kolom is de helft tot 58 % van de breedte, zolang het beeld met wat lucht in de hoogte past. Verhaalpagina's wisselen van kant; kaft en einde hebben de illustratie links |

Tekstschaal: telefoon 1×, tablet staand 1,35×, tablet liggend 1,45×,
desktop 1,5×, groot beeldscherm (vanaf 1600 × 950) 1,8×.

## Schakelaars

| Schakelaar | Waarden | Standaard |
|---|---|---|
| Env `READER_VERSION` of `?lezer=` | `v4`, `v3` | `v4` |
| Env `READER_TEXT_OVERFLOW` of `?tekst=` | `doorlopend`, `splits` | `doorlopend` |

De URL-parameter wint van de env-variabele. Een env-wijziging in Vercel
gaat pas in na een nieuwe deploy.

**Terug naar de vorige lezer:** zet `READER_VERSION=v3` in Vercel en
deploy opnieuw. Voor één verhaal: zet `?lezer=v3` achter het adres.

**Terug naar bladeren op de telefoon:** zet `READER_TEXT_OVERFLOW=splits`
in Vercel en deploy opnieuw. Voor één verhaal: `?tekst=splits`.

## Tekst die niet op de pagina past

| Scherm | Gedrag |
|---|---|
| Staande telefoon (`doorlopend`, standaard) | Het hele verhaal scrolt door. Elke pagina is een blok met de illustratie bovenaan vastgezet en de tekst eronder; de tekst schuift onder de illustratie door, en is de tekst op, dan duwt de volgende pagina de illustratie omhoog. Kaft en pagina 1 delen één blok (ze hebben dezelfde illustratie): titel en direct daaronder de tekst. Knoppen en stipjes scrollen naar de pagina |
| Tablet staand, en de telefoon met `splits` | Bladeren. De illustratie krimpt eerst (van 47 % tot minimaal 34 % van de hoogte), dan gaat de letter een trap kleiner. Past het dan nog niet, dan komt er een extra pagina met dezelfde illustratie |
| Liggend | Bladeren. De illustratie staat naast de tekst en krimpt niet; past de tekst niet, dan een kleinere letter en daarna een extra pagina |

Bij bladeren heeft de illustratie binnen één verhaal overal dezelfde
maat. Opgesplitste tekst breekt bij voorkeur na een zin en wordt gelijk
over de delen verdeeld. Tijdens het voorlezen bladert de lezer zelf door
naar het volgende deel van dezelfde pagina; bij doorlopend scrollen
scrolt hij mee. De audio loopt dan door.

Is een pagina uitgelezen, dan scrolt de lezer bij doorlopend scrollen na
een korte adempauze zelf naar de volgende pagina en leest die voor, tot
en met het einde (`ReaderHandle.continueReading`, aangeroepen door de
speler). Bij bladeren blijft het omslaan aan de lezer: de pil toont dan
"Sla de bladzijde om".

Op 30 sep 2026 zijn vier opties naast elkaar gezet (extra pagina met
krimpende illustratie, extra pagina met vaste illustratie, scrollende
tekstkaart, doorlopend scrollen). Marc koos doorlopend scrollen; de vaste
illustratie en de scrollende tekstkaart zijn verwijderd.

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
- De vensters buiten de lezer (stemkiezer, delen, reageren) kleuren mee:
  de lezer meldt zijn nachtstand via `onNightChange`, de pagina kiest het
  palet in `src/components/v2/story/dialog-palette.ts`.

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
- **Liggend het hele beeld.** Het ontwerp vult liggend de halve breedte
  bij de volle hoogte (`object-fit: cover`); van een 4:3-illustratie
  bleef op een laptop dan 60 % over en op een tablet 54 %. De illustratie
  houdt nu haar verhouding (`landscapeImageBox`), staand blijft `cover`
  (daar past het vak beter bij het beeld).
- **Voorlezen loopt door** bij doorlopend scrollen (zie boven); het
  ontwerp kende alleen "Sla de bladzijde om".

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
