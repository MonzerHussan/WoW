# ARCHITECTURE.md — WOW (World of Work)

## 0. Sprint 1.5 update
The codebase was reorganized into a Feature-Based Architecture this sprint
(see PROJECT_STRUCTURE.md for the full breakdown). Nothing below changed
in *behavior* — only *where* the code that implements it lives. The one
behavior-relevant addition is that `/api/nova` now has rate limiting, a
timeout + single retry, and zod-validated input.

## 1. High-level shape

```
Browser (Client Components)
   │  fetch() / supabase-js
   ▼
Next.js 14 App Router
   ├── Server Components  (data reads: features/dashboard/components/DashboardView)
   ├── Client Components  (forms, chat: features/auth, features/onboarding, features/nova)
   ├── Route Handlers     (app/api/*)
   └── Middleware         (session guard on protected routes)
   │
   ▼
Supabase
   ├── Auth (email/password)
   ├── Postgres (profiles, courses, enrollments, badges, ai_conversations...)
   └── Row Level Security (per-row ownership checks)
   │
   ▼
OpenAI GPT-4o (Nova), called only from the server (app/api/nova/route.ts),
now behind a per-user rate limiter (shared/lib/rate-limit.ts) and a
15s timeout + single retry.
```

## 2. Auth flow

1. `signup` / `login` (Client Components) call `supabaseBrowser()` directly.
2. Supabase sets an httpOnly session cookie via `@supabase/ssr`.
3. `middleware.ts` reads that cookie on every request to a matched path and
   redirects based on session presence (protects `/dashboard`, `/onboarding`;
   redirects logged-in users away from `/login`, `/signup`).
4. Server Components (e.g. `app/dashboard/page.tsx`) re-verify the session
   server-side via `supabaseServer()` — middleware is a fast-path guard, not
   the only line of defense.
5. A Postgres trigger (`handle_new_user`) auto-creates the matching
   `profiles` row the moment `auth.users` gets a new record, keyed off
   `user_metadata` set at sign-up time.

## 3. Data ownership model

Every user-owned table (`enrollments`, `user_badges`, `ai_conversations`,
`horizon_progress`) is protected by RLS policies scoped to `auth.uid()`.
`profiles` is both the identity record and the gamification record (points,
level) — see TECH_DEBT.md for the argument to eventually split these.

## 4. AI agent (Nova)

Nova is **never called from the client with the OpenAI key**. The flow is:

```
NovaChat (client) → POST /api/nova → load profile (server) →
inject as context → OpenAI chat.completions → persist both
turns to ai_conversations → return reply to client
```

The system prompt lives in `features/nova/prompt.ts` as a plain exported string —
no template engine, no external file reads at runtime (avoids FS access in
serverless functions).

## 5. Points / gamification

Points are **only** ever granted server-side from a fixed
`REASON_POINTS` map in `app/api/points/award/route.ts` — a client can request
`{ reason: "QUIZ_COMPLETE" }` but can never dictate the amount. See
SECURITY.md for why this replaced the original design.

## 6. What's intentionally NOT built yet

- Admin/moderator tooling (RBAC foundation is in place — `profiles.role` —
  but no admin UI or admin-guarded routes exist yet).
- Real job listings, applications, employer portal (Sprint 4/5).
- Payments/subscriptions (Sprint 7).
- Any caching layer, background jobs, or queues.
- Automated tests of any kind (Sprint 10).
