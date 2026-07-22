# SECURITY.md

## Fixed in Sprint 3 (found via two-real-account acceptance testing, not code review)

### 🔴 Would-have-been-CRITICAL if shipped as first designed — points awarded by a broad cross-user RLS policy
**Files:** `supabase/migrations/013_assessor_points_and_reference_grants.sql`, `app/api/lms/quizzes/grade/route.ts`
**The trap avoided:** the natural-looking fix for "an assessor needs to award points to a *different* user when confirming their quiz pass" is an RLS policy like `for update using (exists (...assessor capability...))` on `profiles`. That would let *any* assessor account set *any* user's `points`/`level` to anything — the same client/caller-trusted-amount class of bug this file already documents as fixed once for `app/api/points/award`.
**What shipped instead:** `award_quiz_points(p_attempt_id uuid)`, a `security definer` Postgres function. No broad UPDATE policy on `profiles` for non-owners exists at all. The function re-verifies, server-side, that the target attempt is real, `passed = true`, and `graded_by = auth.uid()` (i.e. the caller is the assessor who actually graded it) before paying out a fixed amount — never a client- or even caller-supplied number. A `points_awarded` guard column + `select ... for update` row lock make a second call for the same attempt a safe no-op (`false`, no double payout) — tested directly: first call `true` (0→20 points), identical second call `false` (points unchanged).
**Mirrors:** the same pattern already used for `spend_coins()` (migration 007b) — no `service_role` key anywhere in this project; every cross-user write goes through a narrowly-scoped, self-verifying function instead.

### 🟠 Assessor's own "approve" click silently affected zero rows
**File:** `app/api/lms/quizzes/grade/route.ts`
**Was:** `quiz_attempts` had an owner-only policy (`auth.uid() = user_id`) and a *select-only* assessor policy — no UPDATE policy at all for an assessor grading someone else's attempt. Postgres/PostgREST do not treat "UPDATE matched zero RLS-visible rows" as an error, so the route's own update silently no-opped while still returning `{"passed":true}` to the client. **This passed a first round of testing undetected** — only because that test happened to use the same account as both student and assessor (`auth.uid() = user_id` was incidentally true). It only surfaced once tested with two genuinely separate accounts.
**Fixed:** `013` adds an UPDATE policy scoped to `graded_by is null and (caller holds 'assessor' capability)`, with an explicit `WITH CHECK (graded_by = auth.uid())` — deliberately *not* reusing the `USING` clause as `WITH CHECK` (Postgres's default for UPDATE policies), since the whole point of the update is to move `graded_by` away from `null`, which a reused check would immediately reject.

### 🟡 `entity_skills` / `skill_evidence` had no write path for anyone but the row's own owner
**Files:** `supabase/migrations/010, 012_*.sql`
**Was:** `entity_skills`' only write policy required `source = 'self'`; the quiz-pass credit uses `source = 'assessment'` (deliberately a stronger, distinct source per DOMAIN_CONTRACTS.md §2's weight order), which no policy covered — for the user crediting themselves (auto-pass) *or* an assessor crediting someone else (hybrid/human-confirmed pass). `skill_evidence`'s insert policy required `submitted_by = auth.uid()`, which an assessor writing evidence *on behalf of* the student they just graded can never satisfy. `005`'s own comment already anticipated a server-side write path ("Verification writes happen server-side (assessor queue / org flows)") but the policy enabling it was never written until now.
**Fixed:** two new `entity_skills` policies (self `source='assessment'` writes; assessor-capability-gated writes for another user, both still scoped to `entity_type='user' AND source='assessment'` — never a blanket write), and one `skill_evidence` policy scoped tightly to `evidence_type='quiz_attempt' AND verified_by_type='assessor' AND verified_by_id=auth.uid()` plus a live assessor-capability check — an assessor cannot use it to write evidence of another type or claim a different verifier.

### 🟡 `career_scores` had no INSERT policy for anyone, `system_actors` had no read grant
**Was:** `004`'s own comment said career score inserts were "system only" but no policy was ever written to permit *any* role to insert — this silently blocked even the self-service auto-quiz-pass path, unrelated to the assessor flow. `system_actors` (used to attribute AI-computed scores/recommendations) has no RLS enabled at all, yet returned empty for every role — a missing base `GRANT SELECT`, not an RLS gap (RLS policies have no effect on a table where RLS was never enabled).
**Fixed:** `013` adds an owner-only INSERT policy on `career_scores` (covers the auto-pass path only — assessor-confirmed recompute is deliberately deferred, see TECH_DEBT.md #9) and a plain `GRANT SELECT ... TO anon, authenticated` on `system_actors` (public, non-sensitive reference data — same trust level as `skills`/`skill_categories`).

## Instructor personal courses + live sessions (migration 014)

**File:** `supabase/migrations/014_instructor_personal_courses_and_live_sessions.sql`

Building the first real owner-driven course UI (§9 of ARCHITECTURE.md)
surfaced the same class of pre-existing, never-until-now-exercised gap
as Sprint 3's RLS findings above: `modules`/`lessons` had no owner-manage
policy at all — every course shipped before this was seeded directly via
the SQL Editor (superuser, bypasses RLS), so nothing in the app itself
had ever actually needed to write to them under a real user's session.
014 adds 10 new policies across 5 tables, none of them broad:

| Table | Policy | Scope |
|---|---|---|
| `courses` | `Courses: invite-code courses are discoverable` (SELECT) | `invite_code is not null` — an unlisted-link pattern, not a broad read; a personal course stays out of the public catalog (`is_published=false`) regardless |
| `courses` | `Courses: enrolled can read own course` (SELECT) | caller has an `enrollments` row for this course |
| `modules` | `Modules: user-owner manages own course` (ALL) | course's `owner_type='user' AND owner_id=auth.uid()` |
| `modules` | `Modules: enrolled can read` (SELECT) | caller has an `enrollments` row for this course |
| `lessons` | `Lessons: user-owner manages own course` (ALL) | same owner chain, through `modules→courses` |
| `live_sessions` | `Live sessions: instructor manages own` (ALL) | `instructor_id = auth.uid()` |
| `live_sessions` | `Live sessions: enrolled students read` (SELECT) | caller has an `enrollments` row for this course |
| `live_session_attendance` | `Attendance: student marks own join` (INSERT) | `user_id = auth.uid()` AND caller is enrolled in the session's course |
| `live_session_attendance` | `Attendance: student reads own` (SELECT) | `user_id = auth.uid()` |
| `live_session_attendance` | `Attendance: instructor reads own session's attendance` (SELECT) | session's `instructor_id = auth.uid()` |

**Why `invite_code` doesn't need to be an authorization gate:** the
pre-existing `enrollments` self-insert policy (`schema.sql`, unchanged)
already lets any authenticated user self-enroll into any `course_id`
they already know, published or not — enrollment was never actually
gated by publish status. `invite_code` only had to solve *discovery*
(finding an unpublished course's id at all), not authorization —
confirmed by a real anon REST test: attempting to insert
`live_session_attendance` for a session the caller isn't enrolled in is
correctly rejected (`42501`), independent of whether they know the
`invite_code`.

**Verified against a real regression risk:** removing
`course.service.ts`'s redundant `.eq("is_published", true)` filter (now
relying on RLS alone: "published" OR "enrolled" OR "owner") was tested
directly — the existing published PMP course still returns identically
for an anonymous catalog request, and a non-enrolled/non-owner request
against an unpublished course id still returns zero rows, exactly as
before.

**New convention this migration introduces:** every `create policy` here
is preceded by `drop policy if exists` on the same name, and every
column/table/index add uses `if not exists`. This was adopted after a
first run of an earlier, non-idempotent draft of this file hit `42710:
policy already exists` partway through (traced via a read-only
`information_schema`/`pg_policies` diagnostic to a clean pre-migration
state — nothing from that draft had actually persisted). Future
migrations that add policies should default to this pattern: it makes a
migration file safe to re-run to completion from any partial-failure
state, at zero cost when it was never actually partially applied.

## Curriculum contribution governance (migrations 015a-d)

**Files:** `supabase/migrations/015a_content_manager_role_enum.sql`, `015b_curriculum_contribution_governance.sql`, `015c_curriculum_review_status_gating.sql`, `015d_cleanup_test_lessons.sql`

### `content.manage`: a narrow role, not a repurposed admin
`content.manage` already existed as a permission (003), already granted
to `admin`/`super_admin` — but both carry unrelated permissions
(`users.manage`, `roles.assign`, finance, `audit.read`, etc). The owner
asked for `content.manage` specifically for their own account, not full
admin. `015a`/`015b` add a new, single-purpose `content_manager` role
mapped to *only* `content.manage`. Split into two files because a newly
added Postgres enum value (`ALTER TYPE ... ADD VALUE`) cannot be
referenced in the same transaction it was added in (error `55P04`) —
Supabase's SQL Editor runs a pasted multi-statement file as one implicit
transaction, so the first combined draft aborted entirely and rolled
back cleanly (confirmed via a read-only `pg_enum`/`pg_policies`
diagnostic before writing the split).

### 10 new RLS policies (015b), all additive, all idempotent
| Table | Policy | Scope |
|---|---|---|
| `content_review_votes` | (constraint widened) | `voter_type` now also accepts `peer_instructor`, not just `peer_assessor` (008 only ever wired the assessor case) |
| `content_review_votes` | `Votes: instructor capability peer-votes` (INSERT) | `voter_type='peer_instructor' AND voter_id=auth.uid() AND` caller holds `instructor` capability |
| `lessons` | `Lessons: instructor proposes for shared course` (INSERT) | caller holds `instructor` capability AND target course `owner_type IS NULL` AND `review_status` pinned to `nova_check_pending` at insert (can't insert a pre-approved lesson) |
| `lessons` | `Lessons: content-manage administers` (UPDATE) | `has_permission('content.manage')` — deliberately not scoped to shared courses only; matches `content.manage`'s own documented "Full content administration" scope, and `profiles.role` cannot be self-elevated the way `user_capabilities` can, so this isn't the broad-RLS points mistake repeated |
| (function) | `run_nova_check_placeholder(uuid)` | security definer — the vote it writes has `voter_id=NULL` (system-attributed), which no RLS policy on `content_review_votes` grants a real user's session; scoped to the lesson's own `last_edited_by = auth.uid()` so it can only ever advance a lesson the caller themselves just submitted |

### Real bug #1 (015c): the `return=representation` false-negative, for real this time
SECURITY.md's Sprint 3 section already documents this exact failure mode
as a *diagnostic-curl artifact* (the `skill_evidence` false negative).
This time it was a genuine bug in real app code: `suggest-lesson/route.ts`
chains `.insert(...).select(...)`, which requires reading the row back
immediately after insert — and nothing granted the submitting instructor
SELECT on their own not-yet-visible pending lesson, so the insert itself
surfaced as a generic RLS violation. Fixed by 015c's new permissive
SELECT policy granting the submitter (and reviewers) read access to
pending shared-course lessons specifically.

### Real bug #2 (015c): pending lessons were visible to every enrolled student
Found while chasing bug #1, not a re-test of anything: the existing
`Lessons: enrolled or free preview` policy (004) has zero awareness of
`review_status` — an enrolled student could already see every lesson in
a course regardless of approval state. A freshly-proposed, unapproved
lesson was therefore visible to every enrolled student the instant it
was submitted, before any review at all — the opposite of the "goes
through review before students see it" guarantee this feature exists to
provide.

**Fixed with a `RESTRICTIVE` policy**, not another permissive one — a
second *permissive* SELECT policy only ever widens access via OR, so a
stricter one alongside the existing unconditional policy would have had
zero effect. Only `AS RESTRICTIVE` actually narrows what a permissive
policy already allows (it ANDs against the OR'd permissive set). The
restrictive policy requires `review_status='approved'` for ordinary
visibility, exempting: the submitter, any instructor/assessor/
content.manage holder, and — critically — every personal-course lesson
(`owner_type='user'`), which never goes through this workflow at all
(014 already tested and shipped that feature; it must stay completely
unaffected).

**This fix required a backfill**, checked before shipping: all 18
already-live PMP lessons were still sitting at `review_status=
'nova_check_pending'` (008's column default) — they predate this
governance workflow entirely, seeded directly via SQL as trusted
content, never actually run through it. Without backfilling them to
`'approved'` first, the new restrictive gate would have hidden the
entire published PMP course from every Beta student. Confirmed via REST
with a real enrolled student's JWT, before and after: exactly 18 lessons
visible, unchanged.

### Test-data cleanup (015d) — a real, if minor, incident
Two rows from my own RLS debugging (`curl` inserts made with
`Prefer: return=minimal` to isolate the return=representation bug
above) were never actually deleted — the `DELETE` calls returned `204`
but matched zero rows, because **no DELETE policy exists on `lessons`
for anyone** (see below), so they silently no-opped. `015c`'s backfill
then marked them `review_status='approved'` along with every legitimate
lesson, making them briefly visible on the real, live, published PMP
course — the same Supabase project backing production. `015d` deletes
them by exact id. Caught and fixed before any push to GitHub or Vercel
redeploy; the same real-account REST verification loop that catches
everything else in this project caught this too.

### `lessons` has no DELETE policy for anyone — by design, not an oversight
Content moves through `review_status` (`nova_check_pending` →
`human_review`/`nova_check_failed` → `approved`/`rejected`); nothing in
this system ever hard-deletes a lesson row. This is intentional: a
rejected or superseded proposal stays in `content_review_votes`'
audit trail via its `lesson_id`, and `content_manage`'s own UPDATE
policy is scoped to `review_status` transitions, not row removal. If a
real deletion need ever arises (e.g. GDPR-style erasure), it should go
through a new, explicitly-scoped policy or security-definer function —
not a broad DELETE grant — for the same reason `content.manage`'s
UPDATE policy exists instead of just handing out row ownership.

## Fixed during this audit

### 🔴 CRITICAL — Client-controlled point awarding
**File:** `app/api/points/award/route.ts`
**Was:** The route accepted `{ amount, reason }` from the request body and
awarded `amount` directly. Any authenticated user could `curl` this endpoint
with `{ "amount": 999999 }` and grant themselves unlimited points/levels/badges.
**Fixed:** The route now accepts only `{ reason }`, and the point value is
looked up server-side from a fixed `REASON_POINTS` map. A client can never
dictate how many points an action is worth.
**Residual risk:** Nothing currently *calls* this endpoint at the real
moment of completing a lesson/quiz (that UI doesn't exist yet — LMS is
Sprint 2). When it's wired up, the caller must itself verify the lesson was
actually completed server-side — never a plain client button firing
directly at this route without server-side proof of completion.

## Fixed in Sprint 1.5

| Area | Was | Now |
|---|---|---|
| `app/api/nova` rate limiting | None — cost-blowout risk. | Per-user sliding window (20 msgs / 10 min) via `shared/lib/rate-limit.ts`, returns 429 + `Retry-After`. **Known limitation (documented in the file):** in-memory, so per-instance on serverless — must move to a shared store (Upstash Redis) before real public traffic (Sprint 3). |
| `app/api/nova` input trust | Client `history` spliced into OpenAI messages with TS types only (no runtime check). | zod-validated (`shared/schemas/nova.schema.ts`): role enum enforced, message ≤ 2000 chars, history capped at 20 entries × 4000 chars. |
| `app/api/nova` resilience | No timeout, no retry, provider errors could hang the request. | 15s AbortController timeout, single retry on transient failure, generic error message to client (no provider internals leaked), structured logging on every failure path. |
| All API routes validation | Ad hoc checks (`Number(body?.amount)` style). | zod schemas per route under `shared/schemas/`, parsed at the top of every handler; malformed JSON handled explicitly (400, not a crash). |
| Forms validation | Empty-field checks only; real validation deferred to Supabase error messages. | Same zod schemas now run client-side in `SignUpForm`/`LoginForm`/`OnboardingWizard` before any network call. |
| Audit logging | None. | `auditLog()` hook (`shared/lib/logger.ts`) now fires on every points award; ready to extend to role changes/admin actions. Currently logs to stdout — writing to an `audit_log` table is a later-sprint upgrade. |

## Open findings (flagged for Sprint 9, or earlier on request)

| Severity | Area | Finding | Recommendation |
|---|---|---|---|
| High | `shared/lib/rate-limit.ts` | In-memory limiter is per-serverless-instance, so the effective global limit is limit × instances. Still open — the Sprint 3 personal agent (`features/agent/`, renamed from Nova) reused this same limiter as-is. | Replace with Upstash Redis (or similar shared store) before the agent gets real public/Beta traffic. |
| Medium | RLS | `profiles` has SELECT/UPDATE policies for the owner, but no explicit comment documenting that INSERT is intentionally left to the `SECURITY DEFINER` trigger only. | Documented in migration 002; keep this comment so a future contributor doesn't "fix" this by adding a public INSERT policy. |
| Low | Headers | ~~No custom security headers.~~ **Partially fixed in Sprint 1.5:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` now set globally in `next.config.js`. | Remaining: a strict Content-Security-Policy, deferred to Sprint 9 because it needs testing against Google Fonts + Supabase before enforcement. |
| Low | Env vars | `.env.local.example` exists and `.gitignore` correctly excludes `.env.local`. No server-only secret is exposed to the client — `OPENAI_API_KEY` is only read inside a Route Handler. | No action needed now; keep enforcing "no `NEXT_PUBLIC_` prefix on secrets" as a review rule. |
| Low | CSRF | Supabase's SSR cookie helper defaults to `SameSite=Lax`, which mitigates classic CSRF for the auth cookie. Current API routes are same-origin `fetch` calls reading that same cookie. | Revisit if any route ever accepts state-changing requests from a different origin (e.g. a future public API or webhook). |

## Not currently applicable
- **SQL injection:** not a risk today — every query goes through the
  Supabase query builder (parameterized); no raw SQL string interpolation
  exists anywhere in the codebase.
- **XSS:** no `dangerouslySetInnerHTML` or raw HTML injection exists
  anywhere currently. If Nova's replies are ever rendered as HTML/Markdown
  in the future, sanitize before rendering.
