# CONTRIBUTING.md

## Setup

```bash
git clone https://github.com/MonzerHussan/WoW.git
cd WoW
npm install
cp .env.local.example .env.local   # fill in real values
```

Required env vars (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (server-only — never expose with a NEXT_PUBLIC_ prefix)

Database: run `supabase/schema.sql`, then every file in
`supabase/migrations/` in numeric order, in the Supabase SQL editor.

## Development

```bash
npm run dev          # local dev server
npm run lint         # ESLint
npm run test         # vitest (smoke test for now)
npm run build        # must pass before any PR
```

## Workflow
1. Branch from `main`: `feat/<sprint>-<short-name>` (e.g. `feat/s2-lms-courses`).
2. Keep changes incremental — one concern per PR. Structural moves and
   feature additions never mix in the same PR (this is how Sprint 1.5 was
   able to verify nothing broke).
3. Read `CODING_GUIDELINES.md` before writing code. The import-direction
   rule (`app → features → shared`) and the i18n rule (no hardcoded UI
   strings) are the two most commonly violated — check them first.
4. If your change touches security-relevant code (auth, points, API input
   handling), update `SECURITY.md` in the same PR.
5. Schema changes = a new numbered file in `supabase/migrations/`, never
   an edit to an existing migration.

## PR checklist
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] No hardcoded AR/EN strings (all via `shared/i18n`)
- [ ] New API input validated with a zod schema
- [ ] Docs updated if architecture/security/roadmap changed
