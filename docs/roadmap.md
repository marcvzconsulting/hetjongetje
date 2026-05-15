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

## Fase 5 — Groei / marketing (~3-4 uur)

> Doel: features die pas waardevol zijn bij actief werven van klanten.

13. **Publieke share-link voor gedeelde verhalen** — `/s/[token]` met unguessable token, leesbaar zonder login (opa/oma op telefoon), rate-limited en optioneel met opt-out per verhaal.
14. **OG-images per verhaal** — automatisch een 1200×630 preview met titel + cover-illustratie, voor WhatsApp/Facebook-shares. Vercel OG-image-license is gratis op Hobby-tier.
15. **SEO-metadata + structured data** — meta-tags + JSON-LD op de landing, zodat Google een rich snippet kan tonen.
16. **AEO (Answer Engine Optimization) — vindbaarheid voor AI** — getriggerd door een Framer-rapport dat de huidige site op 73/100 scoort. Concrete punten:
    - **Freshness signals** — `datePublished` / `dateModified` op de landing, blog-achtige content en evt. de FAQ. AI-bots zien content zonder datum als "verouderd".
    - **Citation-links** — minimaal 3 externe links uit de body naar gezaghebbende bronnen (kindergeneeskunde, voorleescultuur, taalontwikkeling) zodat we als hub-pagina herkenbaar worden.
    - **Author / byline** — duidelijk wie er achter de site zit (MVZ Consulting + persoon), met JSON-LD `Person` of `Organization`.
    - **AI-crawlers** — `robots.txt` expliciet `Allow` zetten voor `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` (nu impliciet, maar kan strakker).
    - **FAQ-style content** — bestaande `/veelgestelde-vragen` als JSON-LD `FAQPage` markup uitleveren.
    - Overlapt met item 15; zou samen in één PR kunnen.
17. **Referral-systeem** — invitee-code per user, "stuur een vriend, beide een gratis verhaal", tracking + auto-credit-grant bij eerste betaling van de uitgenodigde.

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

1. **Fase 5** wanneer je actief gaat werven — share-links + AEO + SEO + referral hangen aan elkaar.
2. **Drukker-API** is de grootste single-feature die nog open staat. Hangt aan jouw keuze tussen PrintAPI/Peecho.
3. **Onboarding-tour effectiviteit meten** — kijken of het cohort-overzicht in admin laat zien dat onboarding-uitval omlaag gaat zodra echte users binnenkomen.

De roadmap is verder leeg op fase 5 + parked-items na. We zijn ahead of plan.
