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

### 5a. NEVER pass a function across the Server → Client boundary

**A Server Component may not pass a function as a prop to a Client
Component. Slot props are passed as `ReactElement<{ lang: Lang }>` and
their `lang` is overridden with `cloneElement`.**

```tsx
// ✗ WRONG — 500s at runtime. tsc, lint and build all pass.
//   Error: Functions cannot be passed directly to Client Components
<AdminRolesPageContent instructorQueueSlot={(lang) => <Queue lang={lang} />} />

// ✓ RIGHT — an element; the client parent injects the live lang
<AdminRolesPageContent instructorQueueSlot={<Queue lang={initialLang} />} />

// …and inside the Client Component:
{slot && isValidElement(slot) && cloneElement(slot, { lang })}
```

**Why an element and not just a plain node:** a pre-built node freezes at
the server-rendered language and stops following the page's toggle (the
independent-`useLang` problem, TECH_DEBT #18/#27). `cloneElement` also
preserves the component instance across re-renders, so the slot's own
internal state survives a language switch.

**This is not a hypothetical.** It has shipped twice:

| | |
|---|---|
| **commit `245f4f3`** | `placementSlot` as a render-prop function — **500'd `/profile`** |
| **2026-08-20** | `instructorQueueSlot` as a render-prop function — **500'd `/admin/roles`**, four weeks later, in a file that same commit had touched |

**The rule was already documented both times** — in a comment at
`ProjectWorkspace.tsx:27` and in `245f4f3`'s own commit message — and was
broken anyway. A comment inside one file is only read by someone who
happens to open that file. That is why the rule now lives *here*, in the
guidelines that are read before writing code.

**Nothing in the toolchain catches it.** `tsc --noEmit`, `npm run lint`
and `npm run build` all pass; the error only appears when the page is
actually requested. Worse, the pages most likely to hit it end with
`redirect()` for signed-out visitors, so an *unauthenticated* smoke check
never reaches the broken JSX — `/admin/roles` returned `307` without a
session and `500` with one. This is the whole reason the authenticated
smoke check is a commit gate (see CLAUDE.md).

Working examples to copy: `gamesSlot` in `ProjectWorkspace.tsx`,
`placementSlot` in `AssessmentsContent.tsx`, `instructorQueueSlot` in
`AdminRolesPageContent.tsx`.

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
