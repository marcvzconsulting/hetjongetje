# Ons Verhaaltje — Roadmap

Laatst bijgewerkt: 2026-05-08 (cookie-melding toegevoegd)

Lijst van besloten verbeteringen, gegroepeerd in fases. Volg ze van boven naar beneden, of pak per fase iets eruit. Per item: wat het inhoudt + waarom het in deze fase staat.

---

## ✅ Fase 1 — Productkern (klaar — gepusht 2026-05-07/08)

- **Verhaal opnieuw genereren** — knop in de reader (drijvende "Reageren"-modal rechtsonder), max 1 keer per verhaal, met optionele textarea waarin de ouder uitlegt wat er anders moet. Tekst gaat als `regenerationFeedback` mee in de prompt zodat Claude een ander verhaal levert i.p.v. een copy-paste.
- **Klant-feedback per verhaal** — 👍/👎 + optionele notitie in dezelfde modal. Opgeslagen op `Story.feedbackKind/feedbackNote/feedbackAt`. Admin-dashboard heeft een sectie "Klant-feedback op verhalen" met totaal-counts en de 10 meest recente thumbs-down.

Status: live en getest, geen openstaande bugs.

---

## Fase 2 — Operationeel comfort (~2-3 uur)

> Doel: voorkom dat elk klantcontact handwerk in Mollie + DB wordt zodra je >50 klanten passeert.

3. **Audit-log-viewer** — pagina onder `/admin/audit` met tabel + filters per actor / actie / datum. De data wordt al weggeschreven via `logAdminAction` in [src/lib/admin/audit-log.ts](../src/lib/admin/audit-log.ts), alleen de UI ontbreekt. Add to ADMIN_NAV.
4. **Cancellation-reason survey** — bij abonnement-opzegging een radiobutton-stap ("te duur", "weinig gebruikt", "tijdelijk", "anders + tekstveld"). Opslaan op nieuwe `Subscription.cancellationReason` + `cancellationReasonNote`. Admin-rapport per maand op het dashboard.
5. **Customer-support inbox** — `/admin/inbox` met inkomende contact-form-berichten + `info@`-mail-replies via Brevo inbox-API; status open/closed. Vereist Brevo IMAP-key of inbound webhook.
6. **Refund-flow vanuit admin** — knop op user-detail om Mollie-payment terug te boeken (Mollie-API: `payments.refund`), met logging via auditlog + automatische credit-correctie als het credit-order betrof.
7. **Cookie-melding / consent-banner** — eenvoudige banner onderaan bij eerste bezoek met "akkoord" + link naar privacy/cookie-pagina. Strikt-noodzakelijke cookies (NextAuth-session, CSRF) zijn vrijgesteld, dus geen blokkerende consent-gate; dit is vooral transparantie + AVG-cover. Vercel Analytics is cookieloos en hoeft niets, maar als we ooit Plausible/GA toevoegen moet de banner ook daadwerkelijk consent gaten gaan stellen. Keuze opslaan in `localStorage` + niet meer tonen na akkoord.

---

## Fase 3 — Stevigheid (~1-2 uur code + externe setup)

> Doel: vertrouwen voor groei. Deze dingen worden pas zichtbaar wanneer er iets stuk is — beter nu inrichten dan met een kapotte productie.

8. **AI-kostentracking per verhaal** — `Story.aiCostCents` veld, gevuld met **echte** Anthropic + fal.ai usage uit de response-headers / billing-API. Vervangt de €0,15-schatting met feiten. Update de marge-card op het admin-dashboard.
9. **Sentry-alerts** — email naar `admin@onsverhaaltje.nl` bij nieuwe issue. Voornamelijk Sentry-UI vinkjes; documenteren waar het zit.
10. **Uptime-monitoring** — BetterStack of UptimeRobot pingt `/api/health` elke minuut, sms/email als 'ie wegvalt. Ik bouw het health-endpoint, jij maakt het account.
11. **Backup-restore-test** — script dat een test-klant aanmaakt, snapshot maakt via Neon, klant verwijdert, en restore valideert. Bewijs dat we kunnen recoveren.

---

## Fase 4 — Onboarding (~1 uur)

12. **Onboarding-tour** — eerste keer na goedkeuring: 4-staps modal die uitlegt "vul profiel in → kies aanleiding → wij maken verhaal → bundel boekje". Eenmalig, dismiss-baar, opgeslagen op `User.onboardedAt`.

---

## Fase 5 — Groei / marketing (~3-4 uur)

> Doel: features die pas waardevol zijn bij actief werven van klanten.

13. **Publieke share-link voor gedeelde verhalen** — `/s/[token]` met unguessable token, leesbaar zonder login (opa/oma op telefoon), rate-limited en optioneel met opt-out per verhaal.
14. **OG-images per verhaal** — automatisch een 1200×630 preview met titel + cover-illustratie, voor WhatsApp/Facebook-shares. Vercel OG-image-license is gratis op Hobby-tier.
15. **SEO-metadata + structured data** — meta-tags + JSON-LD op de landing, zodat Google een rich snippet kan tonen.
16. **Referral-systeem** — invitee-code per user, "stuur een vriend, beide een gratis verhaal", tracking + auto-credit-grant bij eerste betaling van de uitgenodigde.

---

## Op jouw bord (geen code-actie van Claude)

- **Drukker-API koppeling** — keuze tussen PrintAPI en Peecho, daarna kunnen we de "binnenkort"-placeholder vervangen door een echte boek-bestelflow met PDF-upload, address-validatie en order-tracking. Vereist documentatie + sample inkijken.
- **Externe pen-test** — pas zinvol bij meer schaal.
- **AVG-juridische review** — externe jurist; meestal samen met privacy/voorwaarden-pagina's.
- **Mollie live-tarieven** — staffel-korting onderhandelen wanneer omzet structureel groter is.
- **Catalog-editing voor AI-prompts** (settings, occasions, adventure-types, moods) — bewust geparkeerd; zou Halloween/Kerst toevoegen mogelijk maken zonder code-deploy maar vereist refactor van GenerateWizard + StoryLibrary frontend.

---

## Geparkeerd na security-audit

Uit de security-deferred-hardening sessie van 2026-04-29:

- **Nonce-based CSP** — vereist Next.js middleware + per-component `<style nonce={...}>`-wiring. Grote refactor; nu blijven we op `'unsafe-inline'` voor styles.
- **SRI** voor externe scripts — alleen Sentry + Vercel scripts, niet kritiek.
- **COEP `require-corp`** — zou Google Fonts in de email-template-iframe-preview blokkeren. Pas aan na een eigen font-pipeline.
- Drop `'unsafe-eval'` uit script-src — Sentry browser SDK gebruikt `new Function()` op een paar plekken.

---

## Prioriteit-volgorde wanneer je terugkomt

Mijn voorstel:

1. **Fase 2** in één klap — operationeel comfort betaalt zich snel terug zodra er meer dan een handvol klanten zijn.
2. **Fase 3** in een rustige avond — eenmaal goed neergezet, geen onderhoud.
3. **Fase 4** als je merkt dat nieuwe accounts in de funnel afhaken (data uit het admin-cohort-overzicht).
4. **Fase 5** wanneer je actief gaat werven (drukker-API live + eerste echte marketing-budget).

Drukker-keuze + Fase 5 hangen aan elkaar — een werkende boek-bestelflow is een sterk verhaal voor referral.
