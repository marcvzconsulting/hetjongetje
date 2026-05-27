# Ons Verhaaltje — Roadmap

Laatst bijgewerkt: 2026-05-15 (fases 2/3/4 voltooid + audit-refactor + PDF-export)

Lijst van besloten verbeteringen, gegroepeerd in fases. Volg ze van boven naar beneden, of pak per fase iets eruit. Per item: wat het inhoudt + waarom het in deze fase staat.

---

## ✅ Fase 1 — Productkern (klaar — gepusht 2026-05-07/08)

- **Verhaal opnieuw genereren** — knop in de reader (drijvende "Reageren"-modal rechtsonder), max 1 keer per verhaal, met optionele textarea waarin de ouder uitlegt wat er anders moet. Tekst gaat als `regenerationFeedback` mee in de prompt zodat Claude een ander verhaal levert i.p.v. een copy-paste.
- **Klant-feedback per verhaal** — 👍/👎 + optionele notitie in dezelfde modal. Opgeslagen op `Story.feedbackKind/feedbackNote/feedbackAt`. Admin-dashboard heeft een sectie "Klant-feedback op verhalen" met totaal-counts en de 10 meest recente thumbs-down.

Status: live en getest, geen openstaande bugs.

---

## ✅ Fase 2 — Operationeel comfort (klaar — gepusht 2026-05-09)

3. **Audit-log-viewer** — `/admin/audit` met filters (actor, actie, target-type, datum) + paginering. Action-pills gekleurd op type. Live.
4. **Cancellation-reason survey** — bij abonnement-opzegging een radio-stap + textarea. Velden `Subscription.cancellationReason` + `cancellationReasonNote`. Admin-dashboard toont counts per reden + recente toelichtingen.
5. **Customer-support inbox** — `/admin/inbox` met tabs "Open" / "Afgehandeld", "Beantwoorden →" via mailto, markeer afgehandeld/heropen. Contactformulier slaat berichten in DB op (`ContactMessage`). Brevo inbound-replies blijven uitgesteld (vereist DNS-config).
6. **Refund-flow vanuit admin** — knop op user-detail om Mollie-payment terug te boeken. Bij credit-orders wordt `storyCredits` gedecrementeerd (gefloord op 0 als al uitgegeven). Audit-log entry per refund.
7. **Cookie-melding / consent-banner** — banner onderaan bij eerste bezoek met "akkoord" + link naar privacy. Keuze opgeslagen in `localStorage` met version-string voor toekomstige re-prompts.

**Bonus tijdens fase 2:**
- Admin-blok "Abonnement" werkt nu écht — admin-toegekende subs zijn zichtbaar voor klant + opzegbaar zonder Mollie.
- Pre-existing nested-form bug in `/admin/pricing` opgelost.
- Dev-tunnel-mechanisme via `MOLLIE_WEBHOOK_BASE_URL` voor Mollie webhook-tests.

---

## ✅ Fase 3 — Stevigheid (klaar — gepusht 2026-05-09)

8. **AI-kostentracking per verhaal** — `Story.aiCostCents` veld, gevuld op het moment van genereren via `computeStoryAiCostCents()` in [src/lib/ai/pricing.ts](../src/lib/ai/pricing.ts). Tarieven (Claude Sonnet 4.5 + fal.ai flux-pro/lora) zijn op één plek tweakbaar. Admin-dashboard toont gemeten vs. geschat. Regen-kosten worden opgeteld bij origineel.
9. **Sentry-alerts** — twee email-rules in Sentry: "nieuwe production error" en "regressie", beide naar `admin@onsverhaaltje.nl` met 60-min cooldown. Documentatie in `docs/architecture.md`.
10. **Uptime-monitoring** — `/api/health` endpoint (DB-ping, geen externe API-calls, 200/503). BetterStack monitor draait op 3-min interval, email-alerts bij downtime.
11. **Backup-restore-test** — `pnpm tsx scripts/backup-restore-test.ts` maakt synthetische user, exporteert naar JSON, verwijdert, restoret, verifieert. Detecteert schema-changes die migrate-paden breken.

---

## ✅ Fase 4 — Onboarding (klaar — gepusht 2026-05-10)

12. **Onboarding-tour** — 4-staps modal op `/dashboard` voor approved users zonder `User.onboardedAt`. Stappen: Profiel → Aanleiding → Generatie → Bewaren. Server-action zet `onboardedAt = now()` bij voltooien of skippen (eenmalig). Glyphs in goldDeep, body-tekst zonder em-dashes.

---

## ✅ Tussentijdse PDF-export (gepusht 2026-05-10)

Niet uit de oorspronkelijke roadmap maar logisch om vroeg te bouwen — dezelfde PDF-laag is straks de basis voor de drukker-integratie.

- **Download-knop in de reader-chrome** (icoon naast "Bewaren") → server-side PDF-generatie via `@react-pdf/renderer`.
- **Layout**: A4-landscape spreads met titelpagina, per pagina tekst-links + illustratie-rechts, afsluitscène met "Welterusten, {childName}".
- **Beperking**: gebruikt nu PDF-standaard fonts (Helvetica/Times). `@react-pdf/renderer`'s fontkit werkt niet stabiel met variable-font TTFs. Bij de echte druk-integratie willen we toch CMYK + 3mm bleed + 300dpi + huisfonts in één klap aanpakken.

Bestanden: [src/lib/pdf/story-pdf.tsx](../src/lib/pdf/story-pdf.tsx) + [src/app/api/stories/[storyId]/pdf/route.ts](../src/app/api/stories/[storyId]/pdf/route.ts).

---

## ✅ Tussentijdse reader-UX (gepusht 2026-05-10/11)

- **Fullscreen-toggle** in chrome (Fullscreen-API).
- **"Lees opnieuw vanaf het begin"-knop** verschijnt op de laatste pagina.
- **Tablet-swipe** op DesktopBookFrame-route (touch-handlers op Stage).
- **Plankje-link** als pill-knop met goldDeep border i.p.v. tekstlink.
- **Kicker** krijgt `size="lg"` voor verhaal-overzicht-labels.

---

## ✅ Audit-refactor (gepusht 2026-05-12)

Eénmalige opruim-batch op basis van een project-wide audit. Geen feature-changes; betere fundering.

- **Indexes**: `Story` heeft nu indexes op `[createdAt]` en `[feedbackKind]` voor admin-stats counters.
- **Centralisatie**: `requireUser` in [src/lib/admin.ts](../src/lib/admin.ts), `trim`/`nullIfEmpty`/`trimToNull` in nieuwe [src/lib/form.ts](../src/lib/form.ts). 4 inline duplicates uitgefaseerd.
- **Zod-validatie**: nieuwe [src/lib/validation.ts](../src/lib/validation.ts) met `parseJsonBody` helper. Toegepast op `PATCH /api/children/[childId]`, `POST /api/stories`, `PATCH /api/stories/[storyId]`.
- **Dashboard payload-slim**: `findMany({ include })` → `findMany({ select })` op [src/app/(app)/dashboard/page.tsx](../src/app/(app)/dashboard/page.tsx). Geen characterBible/referenceImages/LoRA-velden/generationParams meer over de wire.
- **Type-safety**: `USER_ROLES` + `USER_STATUSES` const-tuples in [src/lib/types/user.ts](../src/lib/types/user.ts) (geen PG-enum-migratie wegens prod-data risico).
- **JSON-fix**: `JSON.parse(JSON.stringify(storyRequest))` vervangen door `Prisma.InputJsonValue` cast.
- **Lint-cleanup**: 2 errors + 10 warnings → 0/0.

Twee items uit de audit zijn bewust **niet** doorgevoerd (te lage impact voor huidige schaal):
- #17 — rate-limit op PATCH/DELETE `/api/children/[childId]` (~10 min werk; ingelogde user kan alleen eigen data raken).
- #1 — admin/users storyCounts laadt alle childProfiles in memory (werkt prima tot ~2k children).

---

## Fase 5 — Groei / marketing ✅ (klaar 2026-05-15)

> Doel: features die pas waardevol zijn bij actief werven van klanten.

13. ✅ **Publieke share-link voor gedeelde verhalen** — `/s/[token]` met unguessable token (~132 bits), read-only reader-modus van BookViewerV3, rate-limited 60/min per IP, noindex via metadata + robots-disallow. Aan/uit via een "Delen"-modal in de story-reader; chrome heeft nu een share-icoon.
14. ✅ **OG-images per verhaal** — `/s/[token]/opengraph-image.tsx` rendert dynamisch een 1200×630 met titel + kindnaam + eerste illustratie. Twitter card + Open Graph metadata gekoppeld.
15. ✅ **SEO-metadata + structured data** — JSON-LD `@graph` op landing met Organization + WebSite + WebPage + Product, met `datePublished` / `dateModified` voor freshness.
16. ✅ **AEO (Answer Engine Optimization)** — alle deelpunten doorgevoerd:
    - Freshness via `datePublished` / `dateModified` in JSON-LD.
    - 3 citation-links op `/over-ons` (Nederlands Jeugdinstituut, Stichting Lezen, Leesmonitor) + AboutPage/Person JSON-LD met byline naar MVZ Consulting.
    - `robots.ts` heeft expliciete Allow-blokken voor GPTBot, OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot.
    - `/veelgestelde-vragen` levert nu FAQPage JSON-LD uit, gevoed door een nieuw `FaqEntry`-model in de DB. Admin CRUD-UI op `/admin/faq` (sortOrder + publish-toggle + verwijderen).
17. ✅ **Referral-systeem** — `User.referralCode` (lazy-generated, 6-char base32 zonder ambigue chars), `referredByUserId`, `referralBonusGrantedAt`. `/r/[code]` zet `ov_ref`-cookie (30d, httpOnly, lax) → bij registratie wordt de invitee gekoppeld en krijgt direct +1 storyCredit cadeau. Bij eerste betaalde order van de invitee krijgt de inviter ook +1 (idempotent via timestamp). Dashboard heeft een ReferralCard met copy-link + Web Share API fallback.

---

## Op jouw bord (geen code-actie van Claude)

- **Drukker-API koppeling** — keuze tussen PrintAPI en Peecho, daarna kunnen we de "binnenkort"-placeholder vervangen door een echte boek-bestelflow met PDF-upload, address-validatie en order-tracking. De PDF-laag staat al klaar (zie tussentijdse PDF-export hierboven), maar voor druk willen we 'm uitbreiden met CMYK + 3mm bleed + huisfonts + 300dpi.
- **Externe pen-test** — pas zinvol bij meer schaal.
- **AVG-juridische review** — externe jurist; meestal samen met privacy/voorwaarden-pagina's.
- **Mollie live-tarieven** — staffel-korting onderhandelen wanneer omzet structureel groter is.
- **Catalog-editing voor AI-prompts** (settings, occasions, adventure-types, moods) — bewust geparkeerd; zou Halloween/Kerst toevoegen mogelijk maken zonder code-deploy maar vereist refactor van GenerateWizard + StoryLibrary frontend.
- **Brevo inbound parsing** — vereist DNS-MX wijziging bij TransIP + webhook-endpoint dat parsed mail in `ContactMessage`-tabel schrijft. Zou de admin-inbox compleet maken (replies op `info@`-mails verschijnen er nu niet).
- **Admin reply via UI** — Brevo's `sendMail` is gewired, dus een reply-textarea in `/admin/inbox` is technisch mogelijk. Wacht op Brevo inbound zodat conversaties één plek hebben.

---

## Geparkeerd na security-audit

Uit de security-deferred-hardening sessie van 2026-04-29:

- **Nonce-based CSP** — vereist Next.js middleware + per-component `<style nonce={...}>`-wiring. Grote refactor; nu blijven we op `'unsafe-inline'` voor styles.
- **SRI** voor externe scripts — alleen Sentry + Vercel scripts, niet kritiek.
- **COEP `require-corp`** — zou Google Fonts in de email-template-iframe-preview blokkeren. Pas aan na een eigen font-pipeline.
- Drop `'unsafe-eval'` uit script-src — Sentry browser SDK gebruikt `new Function()` op een paar plekken.

---

## Prioriteit-volgorde wanneer je terugkomt

Volgende logische stappen:

1. **Drukker-API** is de grootste single-feature die nog open staat. Hangt aan jouw keuze tussen PrintAPI/Peecho.
2. **CSP-hardening** — pas vlak voor pen-test of in rustige periode met staging-omgeving. Zie "Geparkeerd na security-audit" hierboven.
3. **AI-catalog editing** — settings/occasions/adventure-types/moods toevoegen zonder code-deploy.
4. **Brevo inbound parsing** — maakt admin-inbox compleet.

Alle 5 fases zijn klaar, Verbeter-iteratie 2 is klaar (op #6 geschrapt en #7 geparkeerd na). Resteren parked-items + "op jouw bord"-keuzes.

---

## Verbeter-iteratie 2 (concrete plan)

Acht losse items die in willekeurige volgorde aangepakt kunnen worden. Drie buckets op effort. Per item: doel, concrete stappen, en een effort-schatting.

### Quick wins (~30-45 min per item)

#### 1. Rate-limit op `/unsubscribe` en `/resubscribe`
- **Doel**: voorkom dat iemand de token-space brute-forced op een specifieke e-mail om diens nieuwsbrief-status te flippen of bestaan van een account te enumeren.
- **Stappen**:
  - Hergebruik `rateLimit()` uit `src/lib/rate-limit/rate-limit.ts` met key `unsubscribe-view:<ip>` (60 req/min) en `resubscribe-view:<ip>` (60 req/min).
  - Bij overschrijding: redirect naar `/?ratelimited=1` met `notFound()`-stijl response zodat een attacker niet weet dat ze in de buurt zijn.
- **Effort**: ~30 min. Geen schema- of UI-werk.

#### 2. Sentry user-context koppelen
- **Doel**: errors in Sentry hebben nu geen user-id; debugging is daardoor traag.
- **Stappen**:
  - In `src/instrumentation-client.ts` na de Sentry.init: een `useEffect` (of een aparte client-component die in `AppShell` geladen wordt) die `Sentry.setUser({ id, email })` aanroept zodra de auth-sessie binnen is.
  - Email scrubben via bestaande `scrubPII` zodat we niet ineens PII in Sentry hebben.
- **Effort**: ~30 min. Eén commit, geen migratie.

#### 3. Onboarding-effectiviteit meten
- **Doel**: weten waar mensen uitstappen tussen registratie en eerste betaalde order.
- **Stappen**:
  - Nieuwe sectie op `/admin` (of een nieuwe pagina `/admin/onboarding`) met een funnel die elke trap meet vanuit bestaande DB-velden — geen nieuwe events nodig:
    1. Geregistreerd → `User` rij bestaat
    2. Goedgekeurd → `User.status = approved`
    3. Eerste kindprofiel → `ChildProfile` bestaat voor user
    4. Eerste verhaal → `Story` bestaat voor child van user
    5. Eerste betaling → `Order.status = paid` voor user
  - Toon absolute aantallen + percentage van top + drop-off per stap (zelfde stijl als bestaande `Funnel`-component uit `/admin`).
  - Optioneel: filter op cohort (laatste 30/90 dagen).
- **Effort**: ~45 min. Geen schema-changes; bestaande Funnel-component hergebruiken.

### Middel (~1-2 uur per item)

#### 4. Lighthouse-audit + concrete fixes
- **Doel**: meet performance + a11y + best practices op de paginas die het meeste verkeer trekken; pak de top-3 bevindingen aan.
- **Stappen**:
  - Run Lighthouse (DevTools of CLI) op `/`, `/register`, `/dashboard`, `/story/[id]`, `/s/[token]`.
  - Verwacht typische bevindingen: oversized images zonder `next/image`, missende `alt`-attributen, ontbrekende `lang` op nested elements, render-blocking inline styles op landing.
  - Fix de top-3 per pagina; documenteer rest als parked.
- **Effort**: ~1-2 uur afhankelijk van bevindingen. Geen risico op stuk maken (rapport is leidend).

#### 5. Reminder-mail voor onaffe profielen
- **Doel**: een ouder die wel registreerde maar nooit een kindprofiel maakte, drift weg. Een vriendelijke reminder na 3 dagen kan een deel terughalen.
- **Stappen**:
  - Cron-route (Vercel cron of een server-side route die elke nacht draait) die users selecteert met: `status=approved`, `createdAt < now-3 dagen`, `children.length = 0`, en geen reminder-mail meer ontvangen (nieuw veld `reminderSentAt`).
  - Nieuwe e-mail-template `profile-incomplete-reminder` (editable via `/admin/email-templates`).
  - Eénmalige verzending, daarna stoppen (geen herhaal-spam).
- **Effort**: ~1.5 uur (DB-veld, route, template).

#### ~~6. Live HTML-preview in `/admin/email-templates/[code]`~~ (geschrapt 2026-05-27)
De bestaande server-rendered preview-iframe op de template-editor-pagina blijkt in de praktijk al voldoende: editor links, sandboxed iframe-preview rechts, ververst bij opslaan. De roadmap dacht "nog te bouwen" maar het stond er al. Een echte client-side live preview (update tijdens typen) zou een fetch-on-change API-route plus debouncing vereisen — meer code, meer risico, en de save-flow is in de praktijk snel genoeg.

#### 8. AVG-export per user ✅ (klaar 2026-05-27)
- Nieuwe GET-route `/api/account/export` levert JSON-download met user, abonnement, kindprofielen + verhalen, boeken, orders, contact-berichten, newsletter-signup, en de admin-audit-entries waarvan deze user het target was.
- Bewust niet meegestuurd: passwordHash, magic-link/reset-token-hashes — geen persoonsgegevens van de aanvrager.
- Rate-limit: 1× per 24u per user via bestaande `rateLimit()`-infra.
- Audit-trail: schrijft `gdpr.export` naar adminAuditLog zodat we kunnen aantonen dat het verzoek is verwerkt.
- UI: nieuwe sectie "Je gegevens" op `/account` tussen wachtwoord en gevarenzone.

---

## Aanbevolen volgorde (historisch — items klaar of geparkeerd)

1. ✅ **#1 Rate-limit unsubscribe/resubscribe** — security leak, snel weg.
2. ✅ **#2 Sentry user-context** — verhoogt debug-snelheid voor alle volgende werk.
3. ✅ **#3 Onboarding-meten** — geeft je actiebare data over wat er stuk gaat.
4. ✅ **#5 Reminder-mail** — directe retentie-impact, beste ROI op verkeer dat al gevallen is.
5. ✅ **#4 Lighthouse** — perf 81–89 → 84–91, dashboard image-savings 1.3MB → 8KB, alle canonicals + a11y main landmark + form-labels gefixed.
6. ~~#6 Email-preview~~ — geschrapt; bestaande server-side preview voldoet.
7. ✅ **#8 AVG-export** — wettelijk, klaar.
8. ⏸️ **#7 CSP-hardening** — geparkeerd, zie sectie "Geparkeerd na security-audit" hierboven voor details.
