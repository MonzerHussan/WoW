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
