@AGENTS.md

# Het Jongetje - Gepersonaliseerde Kinderverhalen

## Project Overview
A personalized children's story generator web app. Parents fill in a profile about their child, and the app generates short stories with AI illustrations. Stories can be bundled into a printed book.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + Nunito font
- **State**: TanStack Query (server) + Zustand (client)
- **Database**: PostgreSQL + Prisma ORM
- **AI Stories**: Claude API (Sonnet 4.5) via @anthropic-ai/sdk
- **AI Images**: Flux 2 Pro (via fal.ai) - TBD
- **Storage**: Cloudflare R2 (S3-compatible) - TBD
- **i18n**: next-intl (Dutch primary, English for AI generation)

## Key Architecture Decisions
- **Translation pipeline**: NL input → translate to EN → generate story in EN → translate back to NL (best AI quality)
- **Age groups**: 2-4, 5-7, 8-10 (different language complexity per group)
- **Story structure**: 6 pages, 50-150 words per page, structured JSON output from Claude
- **Illustration prompts**: Generated alongside story text by Claude, then sent to Flux 2

## Project Structure
```
src/
  app/
    (auth)/          # Login, register (public routes)
    (app)/           # Authenticated app shell
      dashboard/     # Story library, child profiles
      profile/[childId]/  # Child profile management
      generate/[childId]/ # Story generation wizard
      story/[storyId]/    # Story reader view
      book/          # Book bundling (Phase 3)
    api/             # API routes
  components/
    ui/              # Base UI components
    story/           # Story reader, page turner
    profile/         # Child profile forms
    generation/      # Generation wizard, progress
  lib/
    ai/              # Claude API + Flux integration
      prompts/       # System prompts, templates
    pdf/             # PDF generation (Phase 3)
    storage/         # S3/R2 file storage
    queue/           # BullMQ job queue
    utils/           # Utility functions
  messages/          # i18n translation files (nl.json, en.json)
prisma/
  schema.prisma      # Database schema
```

## Conventions
- Use `pnpm` as package manager
- UI language is Dutch, AI generation pipeline uses English internally
- Color palette: warm, child-friendly (primary: #e8734a, secondary: #2a9d8f, accent: #e9c46a)
- All components use Tailwind CSS classes
- API routes in `src/app/api/`
- Database models use snake_case table/column names, TypeScript uses camelCase

## Commands
- `pnpm dev` - Start dev server
- `pnpm build` - Production build
- `pnpm lint` - Run ESLint
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema to database
- `npx prisma studio` - Open Prisma Studio

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
