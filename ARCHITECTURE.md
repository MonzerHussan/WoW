# ARCHITECTURE.md — WOW (World of Work)

## 0. Sprint 3 update
`features/nova/` was removed and replaced by `features/agent/`: the
assistant is now a per-user named agent (`user_agent_profiles.chosen_name`,
picked by the user at first use — never a fixed "Nova" persona in the
UI), reads the user's real Career DNA (skills, active capabilities,
latest employability score) as context, and can write real
`career_recommendations`, not just chat replies. `features/lms/` and
`features/profile/` are new. See section 4 (agent), section 6 (LMS), and
section 7 (the cross-user write pattern) below.

## 0b. Sprint 1.5 update
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
   ├── Server Components  (data reads: features/dashboard, features/lms, features/profile)
   ├── Client Components  (forms, chat: features/auth, features/onboarding, features/agent)
   ├── Route Handlers     (app/api/*)
   └── Middleware         (session guard on protected routes)
   │
   ▼
Supabase
   ├── Auth (email/password)
   ├── Postgres (profiles, courses, enrollments, entity_skills, quiz_attempts...)
   └── Row Level Security (per-row ownership checks + narrow security
       definer functions for the few legitimate cross-user writes)
   │
   ▼
OpenAI GPT-4o (the personal agent), called only from the server
(app/api/agent/route.ts), behind a per-user rate limiter
(shared/lib/rate-limit.ts) and a 15s timeout + single retry.
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
`horizon_progress`, `entity_skills`, `skill_evidence`, `career_scores`,
`quiz_attempts`) is protected by RLS policies scoped to `auth.uid()`.
`profiles` is both the identity record and the gamification record (points,
level) — see TECH_DEBT.md for the argument to eventually split these.

The one recurring exception is an assessor confirming *someone else's*
quiz attempt — a small, explicit set of additional policies/functions
cover exactly that case (see section 7) rather than loosening the
owner-only default.

## 4. AI agent

The agent is **never called from the client with the OpenAI key**. The flow is:

```
AgentChat (client) → POST /api/agent → load profile + agent name +
capabilities + top skills + latest employability score +
recent recommendations (server) → inject as context →
OpenAI chat.completions → strip a trailing ```rec fenced block if
present and insert it into career_recommendations → persist both
turns to ai_conversations → return reply to client
```

The system prompt is built dynamically per request
(`features/agent/prompt.ts`) from the user's chosen name and DNA
context — no fixed persona string. "First use" (whether to show the
name-picker) is derived from `user_agent_profiles.updated_at !==
created_at`, not a dedicated flag: `chosen_name` always has a value
(`'رفيق'` default via the row-creation trigger, 007b), so its mere
presence can't distinguish "never asked" from "kept the default on
purpose" — the row's own `updated_at` only moves once a name has
actually been saved.

Free to use for now — `spend_coins()` (007b) is not wired to `/api/agent`
yet; that's a subscriptions-sprint task, per an explicit product
decision, not an oversight.

## 5. Points / gamification

Points are **only** ever granted server-side from a fixed
`REASON_POINTS` map in `app/api/points/award/route.ts` — a client can request
`{ reason: "QUIZ_COMPLETE" }` but can never dictate the amount. See
SECURITY.md for why this replaced the original design.

## 6. LMS (`features/lms/`)

```
Catalog (/courses, public) → Course page (/courses/[id]) → enroll
(direct RLS-guarded insert, no API route needed) → Lesson player
(/courses/[id]/lessons/[lessonId]) → "mark complete" →
POST /api/lms/lessons/complete (RLS-gated read proves the lesson was
actually visible to this user before granting LESSON_COMPLETE points)
→ Quiz (/courses/[id]/quizzes/[quizId]) → POST /api/lms/quizzes/submit
(server-side scoring; correct_index never sent to the client)
→ auto mode: immediate pass/fail + DNA effects
→ human/hybrid mode: pending, routed to /assessor/queue →
POST /api/lms/quizzes/grade (assessor-only) → DNA effects
```

Which lessons/quizzes a request even returns is entirely RLS-driven
(`is_free_preview = true` or an `enrollments` row must exist) — there is
no separate client-side "locked" flag computed anywhere; a locked
lesson simply isn't in the response.

## 7. Cross-user server-side writes: security definer functions, never broad RLS

Some real events legitimately require writing to *another* user's row —
an assessor confirming a quiz pass needs to credit that student's
points and skills, not their own. The recurring, load-bearing pattern
in this codebase for that is a `security definer` Postgres function
that re-verifies the real event server-side before writing, **not** an
RLS policy that just checks "does the caller hold role X" and then lets
them touch any row:

- `spend_coins()` (007b) — verifies `p_user = auth.uid()` before
  touching a wallet.
- `award_quiz_points()` (013) — verifies the target attempt is real,
  passed, and graded by the calling assessor before paying out a fixed
  amount, with a `points_awarded` guard + row lock against replay.

Plain per-column RLS policies are used instead only when the write is
genuinely self-scoped (owner writing their own row) — see
`SECURITY.md`'s Sprint 3 section for the specific policies added and
why a broader policy was deliberately rejected for points.

## 8. What's intentionally NOT built yet

- Admin/moderator tooling (RBAC foundation is in place — `profiles.role` —
  but no admin UI or admin-guarded routes exist yet).
- Certificate issuance (no UI/flow triggers it yet — the LMS→DNA
  "certificate issued" leg of DOMAIN_CONTRACTS.md §5 has no producer).
- Employability recompute when an assessor (not the user themselves)
  confirms a pass — TECH_DEBT.md #9.
- Content governance voting UI (`content_review_votes`, migration 008) —
  schema exists, no UI consumes it yet.
- Real job listings, applications, employer portal (Sprint 4/5).
- Payments/subscriptions, and `spend_coins()` wired to the agent (Sprint 7).
- Any caching layer, background jobs, or queues.
- Automated tests of any kind (Sprint 10).

## 9. Instructor personal courses + live sessions (migration 014)

A second, deliberately separate path onto the LMS tables, alongside the
shared-curriculum path (§8's `content_review_votes` governance, still
unbuilt): an individual instructor's own course, which they alone own
and approve — no peer/assessor/nova_check voting gate, because there is
no "shared" content to govern.

```
Instructor (capability='instructor', self-activated from /profile
like any other capability) → POST /api/instructor/courses (zod +
capability check, server-generates a unique invite_code) → courses row
(owner_type='user', owner_id=instructor, is_published=false — never
enters the public catalog) → instructor freely adds modules/lessons via
direct RLS-guarded inserts (features/instructor/, no API route needed —
ownership is enforced by RLS itself, not application code) → instructor
shares /join/[invite_code] → student visits it (auth required) →
course resolved by invite_code (its only discovery path — plain
knowledge of the course's RLS-permitted the same as the invite code) →
enrollments upsert (RLS already allowed self-enrollment in any course id
pre-014; invite_code only solves discovery, not authorization) →
redirect to the normal /courses/[id] page, now reachable for this
student because it's their own enrollment, not because it's published.
```

**Ownership model:** reuses `courses.owner_type`/`owner_id`, which
already existed (004) but had never actually been exercised by the app
— every course shipped before this was seeded directly via the SQL
Editor (superuser, bypasses RLS). Building the first real owner-driven
UI surfaced a real gap: modules/lessons had no owner-manage RLS policy
at all, only a published-only SELECT policy. Closed in 014 — see
SECURITY.md for the exact policies.

**Live sessions** (`live_sessions`, `live_session_attendance`, both new
in 014): a scheduled meeting link, not a Zoom/meeting-provider API
integration. An instructor schedules a session against their own course
(`instructor_id = auth.uid()`, RLS-enforced); enrolled students see
upcoming sessions on the normal course page and click "join," which
opens the link in a new tab and self-reports `joined_at`.
**Attendance here is self-reported, not verified by any meeting
provider** — a student can click "joined" without actually attending.
This is a known, deliberate design limitation (no Zoom API integration
this sprint), not a bug. `live_session_attendance` must never be treated
as proof of real attendance by anything downstream (skill_evidence,
points, employability) for exactly this reason.

**Scope:** deliberately limited to `owner_type='user'` (individual
instructors). Organization-owned course management (`owner_type=
'organization'`) has the same latent modules/lessons RLS gap but was
out of scope for this pass — not touched.
