@AGENTS.md

# Het Jongetje - Gepersonaliseerde Kinderverhalen

## Project Overview
Live as **Ons Verhaaltje** on www.onsverhaaltje.nl. Parents fill in a profile about their child, and the app generates short illustrated stories that can be read aloud, shared via a link and downloaded as PDF. A printed book is not live yet (see `docs/roadmap.md`).

Hosting is Vercel: `master` on GitHub (`marcvzconsulting/hetjongetje`) deploys to production, every PR gets a preview (behind Vercel login). Work goes via a branch and PR.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript, React 19
- **Styling**: V2 design tokens in `src/components/v2/tokens.ts` (paper/ink/gold/night), mostly as inline styles; Google Fonts Fraunces (display), Lora (body), Inter (UI). Tailwind CSS v4 is set up but little used.
- **Database**: PostgreSQL on Neon + Prisma 7 (config in `prisma/prisma.config.ts`)
- **Auth**: Auth.js v5 (`src/lib/auth.ts`): password, magic link (`src/lib/magic-link.ts`) and Google
- **AI Stories**: Claude via @anthropic-ai/sdk in `src/lib/ai/story-generator.ts`. Model `claude-fable-5-1` (override with env `STORY_MODEL`), effort "medium", structured outputs against a JSON schema. Fallback `claude-opus-5`: server-side on a refusal, a second call on a technical error.
- **AI Images**: fal.ai. Portret via FLUX.2 Pro; bij goedkeuring wordt een karakterblad (close-up + driekwart) afgeleid (`src/lib/ai/character-sheet.ts`, `Child.referenceSheetUrls`). Verhaalillustraties: FLUX.2 Pro edit met portret + karakterblad als referenties (env `ILLUSTRATION_ENGINE`: `flux2` default | `nano-banana-2` | `flux1` = kill-switch). Zonder portret: FLUX Pro 1.1 tekst+seed. Getrainde LoRA gaat voor. Backfill oude profielen: `scripts/backfill-reference-sheets.ts`.
- **Read-aloud audio**: ElevenLabs (`src/app/api/stories/[storyId]/audio`)
- **Storage**: Scaleway Object Storage (S3-compatible, nl-ams)
- **Payments**: Mollie. **Email**: Brevo. **Monitoring**: Sentry, BetterStack on `/api/health`.
- Installed but not used in `src/`: next-intl, Zustand, TanStack Query. There is no job queue.

## How story generation works
- Claude writes the story **directly in Dutch**; the illustration prompts come back **in English** in the same JSON. There is no translation step.
- Exactly 4 pages, each with its own text and illustration prompt, plus a separate closing illustration.
- Length "kort" or "lang"; word counts per age in `wordCountRange()`. Age instructions per group (0-1, 1-2, 3-4, 5-7, 8+) and some other prompt fragments are admin-editable snippets (`/admin/ai-prompts`, `src/lib/ai/prompts/store.ts`).
- Setting: a key from `STORY_SETTINGS` (`src/lib/ai/prompts/story-request.ts`) or free text from the parent ("Eigen plek" in the wizard).
- Every free-text field from a parent passes `src/lib/ai/sanitize.ts` before it enters a prompt. Request bodies are validated with zod in `src/lib/validation.ts`.

## House rules for story content
- **No Zwarte Piet, always Roetveegpiet.** `toRoetveegpiet()` in `sanitize.ts` is applied to parent input, the stored setting, the previous story in a sequel, and everything the model returns. The prompt rule lives in code, not in an admin snippet, so an override cannot remove it.
- Pets and friends only appear when chosen as companion; the child's listed fears are avoided.

## Project Structure
```
src/
  app/
    (auth)/             login, register, password reset, login error
    (app)/              dashboard, profile/[childId], generate/[childId], story/[storyId], book, credits, account
    (admin)/admin/      users, ai-prompts, email-templates, faq, inbox, pricing, audit, jobs, ...
    api/                stories, payments/mollie, cron/*, auth, health, ...
    auth/magic/         landing page of the magic link from the login email
    s/[token]/          public shared story
  components/v2/        current UI (generation wizard, story reader, landing, admin)
  lib/
    ai/                 story-generator, character sheet, prompts, sanitize, pricing
    pdf/  storage/  payments/  email/  auth/  rate-limit/  reader/  ...
prisma/schema.prisma
scripts/                one-off maintenance and comparison scripts (run with tsx)
docs/                   roadmap.md (status per phase), architecture.md (May 2026, partly dated)
```
`src/components/ui`, `story` and `generation` are no longer imported; `profile` is still used in two places. Build new UI in `components/v2`.

## Conventions
- Use `pnpm` as package manager
- UI language is Dutch; illustration prompts are English
- Colors and fonts come from the V2 tokens, not hard-coded hex values
- API routes in `src/app/api/`
- Database models use snake_case table/column names, TypeScript uses camelCase
- Production schema change: run `pnpm db:push:prod` **before** pushing the code that needs it, otherwise production queries columns that don't exist yet

## Commands
- `pnpm dev` - Start dev server
- `pnpm build` - Production build
- `pnpm lint` - Run ESLint
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to the dev database
- `pnpm db:push:prod` - Push schema to production (reads `.env.production.local`)
- `pnpm db:studio` - Open Prisma Studio
- `npx tsx scripts/<name>.ts` - Run a maintenance script

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
