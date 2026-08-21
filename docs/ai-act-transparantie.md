# AI Act — transparantie & markering (artikel 50)

*Vastgelegd: 21 augustus 2026. Dit document beschrijft hoe Ons Verhaaltje
voldoet aan de transparantieverplichtingen van de EU AI-verordening
(2024/1689), van toepassing sinds 2 augustus 2026, en waarom de gekozen
maatregelen passend zijn. Bedoeld als onderbouwing richting een
markttoezichthouder én als geheugensteun voor onszelf.*

## Juridische positie

- **Rol**: Ons Verhaaltje brengt onder eigen naam een AI-systeem op de
  markt dat synthetische tekst (Claude), beeld (FLUX via fal.ai) en audio
  (ElevenLabs) genereert → wij zijn **aanbieder (provider)** in de zin van
  art. 3(3) en dragen de markeringsplicht van **art. 50(2)**.
- **Art. 50(4) (deepfakes / publieksinformatie)**: niet van toepassing.
  De verhalen zijn fictie voor privégebruik; de illustraties zijn evident
  getekende, niet-fotorealistische kinderboek-illustraties en "would
  [not] falsely appear authentic or truthful" (definitie art. 3(60)).
  Ook de AI-portretten (LoRA) blijven in getekende stijl. Zou dat ooit
  veranderen (fotorealistische weergave van echte kinderen), dan moet
  dit opnieuw beoordeeld worden.
- **Art. 50(1) (chatbot-meldplicht)**: niet van toepassing — de wizard is
  een formulier, geen conversationele AI.
- **Overgangsregeling**: het systeem was vóór 2 augustus 2026 op de markt
  (live sinds april 2026) → markeringsplicht per **2 december 2026**.
  Implementatie afgerond: augustus 2026.
- Art. 50(2) vraagt om oplossingen "as far as this is technically
  feasible, taking into account the specificities and limitations of
  various types of content, the costs of implementation and the
  generally acknowledged state of the art". De vrijwillige Code of
  Practice (juni 2026) is niet ondertekend; onderstaande maatregelen
  zijn onze eigen, gedocumenteerde invulling.

## Machineleesbare markering (art. 50(2))

Centrale module: `src/lib/ai/ai-marking.ts` (idempotent, fail-open,
zonder her-encoding — de beeld-/audiobytes blijven bit-voor-bit gelijk).

| Content | Techniek | Waar ingehaakt |
|---|---|---|
| Illustraties (JPEG/PNG) | XMP-pakket met IPTC `DigitalSourceType = trainedAlgorithmicMedia` + credit, als extra APP1-segment (JPEG) / iTXt-chunk (PNG) | `uploadFromUrl` in `src/lib/storage/scaleway.ts` — het ene funnelpunt waar alle AI-beelden door lopen (verhaalpagina's, ending, AI-portret, demo's) |
| Voorleesaudio (MP3) | ID3v2.3-tag vooraan met TXXX `DigitalSourceType` (zelfde IPTC-URI), TXXX `AI-GENERATED=true` en een NL COMM-omschrijving | audio-route `src/app/api/stories/[storyId]/audio/route.ts` |
| PDF-download | documentmetadata (`creator`, `keywords: trainedAlgorithmicMedia`) + colofonregel | `src/lib/pdf/story-pdf.tsx` |
| Verhaaltekst (los) | vrije tekst kan geen metadata dragen — erkende beperking van het contenttype; disclosure loopt via het zichtbare label en de PDF | — |

De IPTC-`DigitalSourceType`-vocabulaire is de aanpak die o.a. Google
(over "Over deze afbeelding" / SynthID-partners) en Meta uitlezen, en is
voor een eenmanszaak de proportionele state-of-the-art-keuze. C2PA
(cryptografisch gesigneerde manifests) is als toekomstige upgrade
genoteerd zodra tooling/certificaatbeheer voor kleine partijen
praktischer wordt.

**Backfill**: bestaande content is op 21 augustus 2026 met
`scripts/backfill-ai-marking.ts --apply` gemarkeerd (162 objecten,
0 fouten; prefixes `stories/` en `previews/`). Het script is idempotent
en kan veilig opnieuw draaien. LoRA-trainingsfoto's (échte kinderfoto's,
private prefix) worden bewust niet gemarkeerd — dat is geen AI-output.

**Verificatie**: `npx tsx scripts/test-ai-marking.ts` valideert de
bestandsstructuur (JPEG-segmentwalk, PNG-chunkwalk + CRC, ID3-parse) op
fixtures; met een bucket-URL als argument ook op een echt bestand.
Vastgesteld (aug 2026): fal.ai/FLUX levert zelf géén AI-metadata mee,
onze eigen markering is dus noodzakelijk en afdoende.

## Zichtbare vermelding

- Titelspread van elk verhaal (app én deelpagina): colofonregel
  "VERHAAL & ILLUSTRATIES MET AI GEMAAKT" (`BookViewerV3.tsx`).
- Voorleespaneel: stemmen heten expliciet "AI-stem"
  (`StoryAudioPlayer.tsx`).
- Publieke deellink `/s/[token]`: label via de titelspread; de
  OG-preview draagt "onsverhaaltje.nl · met ai gemaakt".
- PDF: colofonregel op de afsluitpagina.
- Voorwaarden (`/voorwaarden`): alinea "AI-transparantie" onder "Inhoud
  van de verhalen".
- Site-footer (`LandingFooter.tsx`, op landing + alle contentpagina's):
  "Verhalen, illustraties en voorleesstemmen worden gemaakt met AI…".

## Bekende beperkingen (bewuste keuzes)

1. **Next.js image-optimizer**: de browser-weergave loopt via
   `/_next/image`, die voor de weergavekopie metadata stript. De
   canonieke outputbestanden (Scaleway-objecten, mp3's, PDF) dragen de
   markering; de zichtbare vermelding dekt de menselijke transparantie
   in de viewer. Proportioneel afgewogen: de optimizer uitzetten zou de
   app voor alle gebruikers trager maken zonder wezenlijke
   transparantiewinst.
2. **Losse verhaaltekst** kan als vrije tekst geen metadata dragen —
   door de verordening zelf erkend als beperking van het contenttype.
3. **Geen onzichtbaar watermerk in de pixels**: metadata is strippbaar.
   De Code of Practice adviseert (voor ondertekenaars) twee technieken;
   voor onze schaal en ons risicoprofiel (fictieve
   kinderboek-illustraties, geen deepfake-risico) is gesigneerde
   herkomst-metadata de proportionele invulling. Herzien bij groei of
   als toezichtspraktijk daar aanleiding toe geeft.

## Onderhoud

- Nieuwe AI-outputroutes? → door de bestaande funnels
  (`uploadFromUrl` voor beeld, `markAudioAsAiGenerated` bij audio) laten
  lopen, of expliciet markeren via `src/lib/ai/ai-marking.ts`.
- Nieuw contenttype (bijv. video)? → markering toevoegen vóór livegang.
- Fotorealistische stijlen of gelijkende weergave van echte personen?
  → eerst de deepfake-analyse hierboven herzien (art. 50(4) kan dan wél
  gaan gelden).
