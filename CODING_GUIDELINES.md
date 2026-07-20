# CODING_GUIDELINES.md

These rules exist so the codebase stays consistent as it grows through the
sprint plan. They encode decisions already made — follow them unless a
sprint explicitly revisits one.

## 1. Where code goes
- `app/` = routing only. Pages are thin wrappers that import from `features/`.
  If a page file exceeds ~20 lines, its logic belongs in a feature component.
- `features/<name>/` = everything owned by one feature: components, services,
  feature-specific constants.
- `shared/` = anything used by 2+ features. If you're about to copy something
  from one feature to another, move it to `shared/` instead.
- Dependency direction: `app → features → shared`. Never the reverse.
  Features never import from sibling features.

## 2. Strings & localization
- **Never** hardcode a user-facing AR/EN string inside a component.
  Add it to `shared/i18n/dictionary.ts` (both languages, always) and use
  `t("feature.key", lang)` or the `useLang()` hook.
- Keys are grouped by feature (`auth.*`, `dashboard.*`, `nova.*`, `common.*`).

## 3. Validation
- Every API route validates its body with a zod schema from
  `shared/schemas/` **before** touching Supabase or OpenAI. Malformed JSON
  gets an explicit 400, never an unhandled crash.
- Client forms reuse the *same* schema before making network calls, so
  client and server can never disagree about what's valid.
- TypeScript types are not validation. Anything crossing a trust boundary
  (request body, URL params, external API response) gets runtime-checked.

## 4. Security invariants (do not weaken)
- Point amounts come only from `shared/constants/points.ts`, keyed by a
  server-verified reason. Never accept an amount from a client.
- `OPENAI_API_KEY` (and any future secret) is read only inside Route
  Handlers / server code. No `NEXT_PUBLIC_` prefix on secrets, ever.
- Error responses to clients are generic; details go to `logger`, not the
  response body.
- Security-sensitive actions call `auditLog()` from `shared/lib/logger.ts`.

## 5. Components
- Push `"use client"` as far down the tree as possible. Server Components
  by default; a page doesn't become a Client Component because one widget
  on it needs interactivity.
- Reuse `shared/components` primitives (`Button`, `Input`, `FormField`,
  `Card`, `AuthLayout`, `EmptyState`, `ErrorState`, `Loading`, `LangToggle`)
  instead of re-inlining Tailwind class strings.
- Visual language: existing CSS utility classes in `globals.css`
  (`btn-primary`, `field-input`, etc.). Don't introduce a parallel styling
  approach without a decision recorded in ARCHITECTURE.md.

## 6. Database
- Schema changes are additive migrations in `supabase/migrations/`,
  numbered sequentially. Never edit `schema.sql` retroactively.
- Every new user-owned table gets RLS enabled + owner-scoped policies in
  the same migration that creates it — not "later".
- Every FK column that will appear in a WHERE/JOIN gets an index in the
  same migration.
- snake_case everywhere; UUID PKs via `uuid_generate_v4()`; `created_at`
  default `now()`; tables with updates get the `set_updated_at` trigger.

## 7. Naming
- Files: `PascalCase.tsx` for components, `kebab-case.ts` for everything
  else, `*.service.ts` for services, `*.schema.ts` for zod schemas.
- Booleans read as predicates (`onboarding_completed`, `leveledUp`).
- API routes return `{ error: string }` on failure — consistent shape the
  client can rely on.

## 8. Logging
- Use `logger.info/warn/error` from `shared/lib/logger.ts` with structured
  fields — never bare `console.log` in server code.
