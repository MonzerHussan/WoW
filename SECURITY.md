# SECURITY.md

## TECH_DEBT #13 closed (migration 034, 2026-07-30)

`instructor`/`mentor`/`assessor` were self-grantable through the same broad "Own capabilities: manage" policy meant for `learner`/`job_seeker`/`freelancer`/`client` — surfaced while live-testing migration 032 (a plain account granted itself `assessor` with one PostgREST call and immediately had real authority to grade other users' quizzes and trigger real point/score payouts).

**Confirmed before writing any code that no legitimate alternative grant path existed anywhere.** `earner_profiles.verification_status` and `assessor_calibration_results` (008) are pure dead schema — grepped the entire `app/` and `features/` tree and found zero reads, zero writes, zero references. Every real authority check in this codebase (`award_quiz_points`, `recompute_employability_score`, the `quiz_attempts`/`entity_skills` RLS policies) checks only `user_capabilities` membership, never `verification_status`. Closing self-service without a replacement would have left no way — not even for the platform owner — to ever grant these three capabilities again.

`grant_capability(p_user, p_capability)` — the same shape as `assign_role` (031): SECURITY DEFINER, checks `has_permission('users.manage')` — confirmed against `role_permissions` before choosing it (held by exactly `admin`/`super_admin`, same pair as `roles.assign`) rather than assumed — raises 42501 loudly, writes `audit_log` unconditionally. `/admin/roles` gained a second, independently-gated section (`users.manage`) rather than a new page, listing users and letting a holder grant any of the three. `ActivateCapabilityButton` (the self-service UI) now only ever offers the four safe capabilities, so it never presents an option RLS will refuse.

**Verified live:** a plain account attempting to self-grant `assessor`/`instructor`/`mentor` directly via PostgREST was refused **403/42501** (`"new row violates row-level security policy"`) for all three; an independent read confirmed none landed. The same account granting itself `job_seeker`/`freelancer`/`client` succeeded identically to before, unaffected. A real `admin` account (holding `users.manage`) called `grant_capability` to grant `assessor` to the plain account — succeeded, landed on an independent read from the *target's own session*, and wrote a real `audit_log` row (`capability.granted`, correct actor/target/metadata). **Negative control on the boundary itself:** the same `admin` session, which passes `grant_capability`'s permission check, was *still* refused when attempting the identical grant as a **direct** table write — proving the RLS gate is real and not merely bypassed by whoever happens to hold the permission; the function is the only door, not a convenience wrapper around one already open.

## TECH_DEBT #17 closed (migration 033, 2026-07-30)

The agent's conversation memory died on every reload — `ai_conversations` was written to but never read back. Reused (renamed to `agent_messages`, `message`→`content`) rather than duplicated: the table already had exactly the right shape and an index (002) built for exactly this "most recent N for a user" query, which nothing had ever actually run.

Its previous owner-insert policy meant a client could `POST` a fabricated `'assistant'` row directly via PostgREST — a real, if unexploited, hole specific to this feature: a fake assistant turn would be blindly trusted as real history and fed back into a future prompt as context, a prompt-injection angle distinct from a normal input-validation gap. Closed the same way as `pricing_units`/`placement_usage` (030): zero write policies, `forbid_client_write()` (the same `FOR EACH STATEMENT` trigger, reused unchanged) rejects any direct client write, and `record_agent_turn()` (SECURITY DEFINER, self-only — no `p_user` parameter to spoof, same shape as `award_lesson_points`) is the only writer. It writes both turns together, only once a real OpenAI reply exists — the old code wrote the user's turn *before* the model call and the reply after, which could leave an orphaned user-only row on a failed call.

The client-supplied `history` field is gone entirely — schema, client helper, and all four call sites (`FloatingAgent`, `AgentChat`, `PronunciationPractice`, `LanguageTaskCard`). The server now derives its own context from `agent_messages` on every call; a client no longer has any say in what the model treats as prior turns. Both the OpenAI context and each UI surface's own on-load read use the same `AGENT_CONTEXT_WINDOW` (20, `shared/constants/agent.ts`) — one number, not two independently-tuned caps that could drift, and an explicit, documented cost/speed tradeoff (memory beyond roughly the last ~10 exchanges is deliberately sacrificed) rather than an unstated limitation.

**Verified live, end to end, in a real browser against the real route (not just the RPC in isolation):** signed in as a real test account, opened the floating agent, sent a real message, got a real OpenAI reply displayed in the UI. Independent read confirmed both rows landed with matching content. **Reloaded the page for real** (fresh component mount, no React state carried over) and reopened the panel — both messages reappeared, pulled from `agent_messages`. Replaying the original gap as an attack — a direct client `INSERT` of a fabricated `'assistant'` row — was refused **403/42501** (`"Direct INSERT on agent_messages is not permitted — this table is only written by a verified server-side function"`), and an independent read afterward showed only the two genuine rows, no fake row present.

## TECH_DEBT #9 closed (migration 032, 2026-07-30)

`recompute_employability_score(p_attempt_id)` — the assessor-confirmed path for `career_scores(employability)`, deferred since 013. Checked live, before writing any code, whether the assessor's own session could run the TS auto-path function's three counting queries directly: `quiz_attempts` read is broad for any assessor, but `entity_skills` assessor-read is scoped to `source='assessment'` only, and `lesson_progress` has **no assessor read policy at all**. Opening one just for this would have been the same broad-RLS-grant-for-staff shape already rejected once for points (013) and skills (012), so the function reads all three tables itself, as a SECURITY DEFINER, bypassing RLS entirely — no new read policy was added anywhere.

Verification reuses `award_quiz_points` (027)'s own branch-A predicate (`graded_by = auth.uid()` and the caller holds `assessor`), copied rather than shared through a helper — consistent with every other definer function in this codebase, each of which independently re-verifies its own triggering event.

**Verified live, replaying a real assessor-confirmation end to end:**
1. A real test account submitted the seeded hybrid quiz ("PMP Level 1 Final Assessment", 18 questions) with genuinely correct answers (score **100**, `pending_review:true` — the hybrid path, not auto).
2. A second test account, holding the `assessor` capability, approved the attempt (`passed:true, graded_by:<assessor>`), then called `award_quiz_points` (→ `true`) and `recompute_employability_score` (→ `true`) in the same order the route uses.
3. **Independent read** (student's own session) confirmed a genuinely new `career_scores` row: `score:4.50`, `explanation.factors` = `[{المهارات الموثّقة, weight 0.5, value 0}, {الاختبارات المجتازة, weight 0.3, value 15}, {الدروس المكتملة, weight 0.2, value 0}]` — `0*0.5 + 15*0.3 + 0*0.2 = 4.5`, matching the ported formula exactly.
4. The student then completed a real lesson (`lesson_progress.completed=true`, own session). The assessor's session, queried directly against `lesson_progress` for that student, still returned **empty** — proving the read gap noted above stayed closed, not just unused. Re-invoking `recompute_employability_score` (still as the assessor) then correctly picked up the change via its RLS-bypassing read: a second real row, `score:5.50`, lessons factor now `5.00` — proof the function sees real data the assessor's own client session cannot.
5. **Regression check:** the exact operation the untouched TS auto-path performs (`insert` into `career_scores` under the caller's own session, satisfying the pre-existing owner-only policy from 013) still succeeds identically post-032 — tested directly, succeeded.
6. **Negative control:** the student, holding no `assessor` capability, calling the new function directly on their own attempt was refused **403/42501** (`"Not authorized to recompute this score"`).

**Adjacent finding, out of scope, flagged not fixed:** provisioning the `assessor` capability for this test surfaced that `user_capabilities`' "Own capabilities: manage" policy (003, `for all using (auth.uid()=user_id)`) lets any authenticated session self-grant **any** capability — including `assessor` — with no verification step. Confirmed live: a plain test account inserted its own `assessor` row via a direct PostgREST call and it was immediately honored by `award_quiz_points`/`recompute_employability_score`. Not part of TECH_DEBT #9 and not touched here; worth its own item.

## TECH_DEBT #24 + #21 closed (migrations 030-031, 2026-07-30)

**1. "Successful silence" on refused writes (TECH_DEBT #24).** `pricing_units`/`placement_usage` have RLS enabled with no INSERT/UPDATE/DELETE policy at all, so an unprivileged direct write always matched zero rows and PostgREST reported it as a plain 200/204 — correct protection, misleading shape, the same class already fixed once for `career_scores`/`language_task_submissions` (017-018).

The 026 pattern (a `FOR EACH ROW` trigger) does **not** work here: with no write policy, RLS reduces the matched row set to zero *during the scan*, before any row-level trigger is invoked — so a row-level trigger would simply never fire for a fully-blocked write. The fix is a **`FOR EACH STATEMENT`** trigger (`forbid_client_write()`), which fires once per SQL statement unconditionally, before RLS row-filtering happens at all. It rejects any `current_user in ('authenticated','anon')` and is SECURITY INVOKER, not DEFINER — 026's lesson applied deliberately, since `update_pricing_unit`/`consume_placement_quota` are both SECURITY DEFINER and must keep passing through as the function owner.

*Verified live, replaying the original attack:* an unprivileged `PATCH pricing_units {"coin_cost":0}` now returns **403** with `{"code":"42501","message":"Direct UPDATE on pricing_units is not permitted — this table is only written by a verified server-side function"}`; the same account's `PATCH`, `DELETE`, and `INSERT` against `placement_usage` all return the same explicit **403/42501**. An independent read after each attempt confirmed the data never moved (`coin_cost` stayed 3). *No regression:* the same account's real `consume_placement_quota()` call still succeeded and genuinely incremented its counter (0→1, confirmed by an independent read); a `finance_manager` account's real `update_pricing_unit()` call still moved a live price 3→99→3, both changes landing in `audit_log`.

**2. `roles.assign` had no write path at all (TECH_DEBT #21).** 025/026 correctly locked `profiles.role` against every client session, which also meant an `admin` holding `roles.assign` had no in-app way to use it — roles could only be granted out-of-band in the SQL editor. `assign_role(p_user, p_role)` closes the gap with the exact shape `update_pricing_unit` (024) already established: SECURITY DEFINER, checks `has_permission('roles.assign')` and raises a loud `42501` rather than a silent `false`, and — specifically because this is the same permission family the original privilege-escalation hole (025/026) was found in — an extra explicit check for `has_permission('roles.assign_super')` before allowing a `super_admin` target. That check is belt-and-suspenders: the pre-existing `trg_guard_super_admin` (003) trigger already enforces the same rule on the UPDATE itself, unconditionally, since it reads `auth.uid()` (unaffected by SECURITY DEFINER) rather than `current_user`.

Reused the existing `roles.assign`/`roles.assign_super` permissions rather than introducing a new one — they are already exactly this permission, already held by exactly `admin`/`super_admin`, and a parallel permission would only be two keys that must always be granted together. The admin screen also needs to list users; `profiles` had never had any staff-wide read policy (002's own comment left it as a placeholder), so 031 adds one scoped to `roles.assign`, ORed with the pre-existing owner-only policy rather than replacing it.

*Verified live, including the escalation path this sits next to:* an unprivileged account calling `assign_role` on itself to become `admin` was refused **403/42501** (`"Not authorized to assign roles"`), role unchanged. A real `admin` account successfully promoted a different account to `moderator` (persisted, `audit_log` row written: `role.assigned`, `old_role:"user"→"moderator"`). The *same* `admin` account — which holds `roles.assign` but not `roles.assign_super` — then attempted to promote that account to `super_admin` and was refused **403/42501** (`"Only a super_admin can assign super_admin"`), with the account's role confirmed still `moderator`, not silently reset or overwritten. The new read policy was confirmed dynamic, not a point-in-time grant: the same account listed all users while holding `admin`, then lost that visibility (back to seeing only its own row) the instant its own role was reverted to `user` via the same `assign_role` path — a live self-clean that also doubled as a second real exercise of the legitimate write path.

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

## Sensitive field addition: `profiles.age`/`gender` (migration 016, 2026-07-23)

New columns, added per an explicit owner decision (RBAC.md "تحديث حرج على
سياسة القاصرين"). No new RLS policy was written or needed: `profiles`
already has exactly one SELECT policy ("Profiles are viewable by owner")
and no organization-facing policy exists on this table at all — unlike
`career_profiles`/`career_scores`, which are exposed to orgs through
`career_consents.scope`. Verified before shipping that no code path
selects `profiles.*` (or these columns specifically) into any
org-facing query or API response; `age`/`gender` reach exactly two
places: the owner's own onboarding review screen and the agent's system
prompt (sent to OpenAI on the user's own behalf, same trust boundary as
every other DNA field already in that prompt). Whether `age` specifically
gets folded into any future `career_consents.scope` is an open policy
question, not decided now — it's tied to the still-pending minors-policy
call in RBAC.md, see DOMAIN_CONTRACTS.md §11. `gender` has no documented
sensitivity decision at all and no claim is made about it here beyond
today's RLS boundary.

## Language task submissions — DELETE-policy rollback bug (migrations 017-018, 2026-07-25)

**🟠 Insufficient-balance rollback silently no-opped, leaving orphaned "submitted" rows**
**Files:** `supabase/migrations/017_language_task_submissions.sql`, `018_language_task_submission_delete_fix.sql`, `app/api/lms/language-task/submit/route.ts`
**Was:** 017 shipped `language_task_submissions` with an INSERT and a SELECT policy only — deliberately no DELETE policy at all, on the reasoning that "a submission is permanent once made." The route itself inserts a submission row *before* calling `spend_coins()` (so the unique `(user_id, lesson_id)` constraint acts as the real anti-replay guard), and tries to `DELETE` that row as a rollback if the spend fails (insufficient balance). Because Postgres/PostgREST treat a DELETE matching zero RLS-visible rows as a successful no-op, not an error — the same failure class already documented in this file from Sprint 3.3's assessor-approve bug — that rollback silently did nothing. **This passed the route's own happy-path testing** and only surfaced when a real 402 (insufficient-balance) case was tested end-to-end: the "already submitted" row stayed behind with no corresponding `coin_transactions` entry, meaning the user would have been permanently locked out of that task (by the unique constraint) despite never actually paying for it.
**Fixed:** 018 adds one DELETE policy, scoped as narrowly as the INSERT/SELECT policies already are: `user_id = auth.uid() and not exists (select 1 from coin_transactions where ref_table = 'language_task_submissions' and ref_id = language_task_submissions.id)`. A row can only be deleted by its own owner, and only if it was never actually paid for — a genuinely successful, paid submission remains permanently undeletable by anyone, preserving 017's original guarantee.
**Verified live**, all via REST with the test account's own JWT: a real orphaned row (created by a genuine 402) deleted successfully post-fix (`200`, row returned in body); the same DELETE attempted against an already-*paid* row returned `200` with an **empty** body — RLS silently blocked it, and the row was confirmed still present immediately after. A clean resubmission of the same lesson (after restoring the test balance) then succeeded end-to-end: correct debit, new `language_task_submissions` + `coin_transactions` rows, and a real agent reply.

## English placement one-shot guard (migration 022, 2026-07-25)

**The "once only" rule is enforced server-side, before any OpenAI call — never by hiding a button.** `POST /api/agent/placement` checks `user_language_profiles` for an existing row as its first act after authentication: a completed user gets a 409 (with their stored level) at the cost of one indexed SELECT, with zero model invocations — provable from server logs, which show `placement_already_done` with no OpenAI call event after it. Client-side, `PlacementChat` also hides the invitation for placed users, but that is presentation; the route is the enforcement. The conversation is free (no coins) and once-only by explicit owner decision, so without this guard every repeat would be an uncharged real OpenAI cost — the same cost-exposure class documented for the simulated purchase.

**The PRIMARY KEY is the race backstop.** Two parallel tabs can both pass the pre-check and both reach a completed placement; the second `INSERT` hits the `user_id` primary key (23505) and is returned as the same 409 — the first result stands, nothing is overwritten (there is no UPDATE policy on the table at all).

**What the guard deliberately does not cover:** abandoned conversations. A user who never completes placement can restart indefinitely, bounded only by the in-memory rate limiter (15 msgs/10min — per-instance, resets on redeploy). Documented as TECH_DEBT #15 with the same before-real-Beta severity as the unlimited simulated purchase; a durable DB-stored attempt cap is the named fix.

**Block validation:** the agent's ```placement output is parsed and zod-validated (`placementResultSchema`: strict A1-C2 enum, capped summary and facts) before anything is written. A malformed block is logged and dropped and the conversation simply continues — a bad model output can never produce a corrupt or partial placement row.

## Pronunciation practice (migration 021, 2026-07-25)

**Coin cost is server-side, never client-supplied.** `COIN_COSTS.PRONUNCIATION_EVALUATION` (`shared/constants/coins.ts`) is the single source of truth, read inside `POST /api/lms/pronunciation/evaluate`; the request schema (`shared/schemas/pronunciation.schema.ts`) deliberately has **no** `coinCost` field, so a client cannot propose a price. Same rule CLAUDE.md #4 already fixed once for points. Charging goes through the existing `spend_coins()` (007b) — no new spending path was invented.

**Rollback policy carried forward from 018, not rediscovered.** The route inserts the attempt row before charging, so it needs a working DELETE to undo that row when the charge fails. 021 therefore ships its DELETE policy *up front*, scoped identically to 018's: an attempt is deletable only by its owner and only while no `coin_transactions` row references it — a paid attempt is permanent. Without this the rollback would silently no-op (zero-row DELETE reads as success), which is exactly the orphaned-row bug 018 had to fix retroactively.

**No unique constraint, deliberately.** Unlike `language_task_submissions`, repeated attempts are the intended behavior, so the unique index cannot serve as an anti-double-charge guard here. Nothing needs it to: each attempt is a distinct, intentional purchase. This does mean the endpoint is repeatable at will, bounded only by the user's own balance — an ordinary spend, not an exploit, since every call debits real coins (contrast with the *unlimited free* simulated purchase, which is a genuine launch blocker in TECH_DEBT.md).

**No audio ever reaches the server *from pronunciation practice*.** Recordings stay in browser memory (Blob + object URL, revoked on unmount) and are never uploaded; only the reference text and the speech-to-text transcript are stored. There is consequently no voice-data retention duty *for this feature*, and the UI says so explicitly. **Voice calls (036) are a different transport with a different disclosure — see below.**

**Charge ordering.** Coins are spent only after a non-empty transcript exists (produced client-side during recording, and re-validated server-side by the schema's `min(1)`). A failed or empty transcription never reaches the endpoint and never costs anything.

## Agent voice calls (migration 036)

**Audio leaves the device, and the disclosure says so.** Unlike pronunciation practice, a voice call streams the user's microphone live to OpenAI for the duration of the call. The transport is WebRTC **browser → OpenAI directly**: the audio does not pass through WOW's servers, which are on the credential-minting path only (`/api/agent/voice/session` mints a short-lived client secret; `OPENAI_API_KEY` never reaches the browser).

**What WOW stores:** the session row (start, end, duration, model, coins charged and refunded, OpenAI call id) and the conversation **transcript**, written to `agent_messages` with `source='voice'` so its provenance is visible. **No audio is stored by WOW at any point.**

**What WOW does not control:** what OpenAI retains of the audio it receives, which is governed by OpenAI's own API data policies, not ours.

**The cap is disclosed, not enforced.** Calls are sold in 5-minute blocks and the UI ends the call at the cap, but the server is not on the media path and cannot force an in-progress call to stop — so a modified client can exceed it. The exposure is bounded (block paid up front, one active call per user, call starts rate-limited) and is disclosed here rather than implied away, the same treatment DOMAIN_CONTRACTS §8 gives self-reported live-session attendance.

## Wallet purchase simulation (migration 020, 2026-07-25)

`credit_coins(p_user, p_package_id)` — same security shape as
`spend_coins()`: `security definer`, verifies `p_user = auth.uid()`
before touching anything, and the coin amount is *never* client-supplied
— it's read from `coin_packages.coins` by `p_package_id` inside the
function. `revoke execute ... from anon` matches `spend_coins()`'s own
grant. Called only from `POST /api/wallet/purchase`, never directly
from the client (`supabaseBrowser()`), matching every other
security-definer call site in this codebase.

**Deliberately no rate limit on repeat purchases** — this is a known,
explicitly-accepted gap for a locally-simulated purchase with no real
money involved, not an oversight. Verified live that it behaves exactly
as expected: three consecutive purchases of the same package from the
same account each succeeded and each produced its own real
`coin_transactions` row (`25 → 325 → 625 → 925`). **This must not ship
to real Beta traffic as-is** — see TECH_DEBT.md, same severity as
RBAC.md's minors-policy launch blocker: today, any authenticated user
can mint unlimited free coins by repeatedly clicking "buy."

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

## CRITICAL: privilege escalation via self-UPDATE on `profiles` (migration 025, 2026-07-26)

**Found while building 024, reproduced live against the real project — not a theoretical review finding.** An ordinary test account (`role='user'`) escalated itself to `admin` with a single request:

```
PATCH /rest/v1/profiles?id=eq.<own id>  {"role":"content_manager"}   -> 200
POST  /rest/v1/rpc/has_permission       {"perm":"content.manage"}    -> true
PATCH /rest/v1/profiles?id=eq.<own id>  {"role":"admin"}             -> 204
PATCH /rest/v1/profiles?id=eq.<own id>  {"role":"super_admin"}       -> 400 (blocked)
```

Only `super_admin` was refused, by the 003 trigger `guard_super_admin_promotion`, which guards that single value and nothing else. `admin` carries `users.manage`, `content.manage`, `content.moderate`, `roles.assign`, `audit.read`.

**Root cause:** `schema.sql`'s policy `on public.profiles for update using (auth.uid() = id)` is column-blind — it correctly prevents editing another user's row, but places no restriction on which of your own columns you may write, and `role` is one of them.

**Blast radius beyond 024:** the curriculum-review governance shipped in 015b/015c has gated the owner's decisive vote on `content.manage` since it shipped; that gate was bypassable the whole time. 024's pricing functions gate on the same permission.

**Fixed in 025 + 026 — 025 alone did NOT work.** 025 installed a `BEFORE UPDATE` trigger but declared the function `SECURITY DEFINER`, which makes `current_user` report the *function owner* (postgres) rather than the calling session role. Its early-out `if current_user not in ('authenticated','anon') then return new` therefore evaluated true on every call and the guard returned before checking anything — inert in exactly the case it existed for. Caught by re-running the same escalation test after 025 was applied: all four PATCHes still returned **204** and the columns really changed (`role → admin`, `status → suspended`, `identity_verified_at` set), then were reverted. 026 drops and recreates the function as **SECURITY INVOKER** (the default) so `current_user` reports the real effective role, and restates the condition positively so an unrecognised role fails toward "trusted context" instead of silently disabling the guard for end users. 026 asserts `prosecdef = false` and the trigger's presence in a `DO` block, so the bug cannot come back unnoticed.

The working guard uses a trigger because RLS `WITH CHECK` cannot compare against `OLD` — also the pattern 003 already used. `role`, `status` and `identity_verified_at` are unchangeable from a client session; `service_role`, the SQL editor and SECURITY DEFINER functions are deliberately unaffected. Verified safe against every client-session writer of `profiles` in the codebase first.

**Lesson worth keeping:** `SECURITY DEFINER` is load-bearing for functions that must *act* with elevated rights, and actively harmful for a trigger that must *inspect who is acting*. A guard that silently allows everything looks identical to a guard that works, until it is actually tested against a real attempt.

**STILL OPEN — `points`/`level` self-award.** The same column-blind policy lets a user PATCH their own `points` and `level` (verified: `points=999999, level=99` succeeded; the test row was reverted immediately). 025 does **not** lock these, because `shared/services/points.service.ts` `awardPoints` writes them through the user's own session — locking them would break lesson completion and quiz rewards outright. This is the same bug class as the original client-controlled points hole that CLAUDE.md rule #4 says must never return: the API route was fixed, but the direct PostgREST path bypasses the route entirely. Proper fix: move `awardPoints` into a security-definer function, as `award_quiz_points` (013) already is, then extend the 025 trigger to cover both columns. Tracked in TECH_DEBT with launch-blocker severity.

## Central pricing functions (migration 024, 2026-07-26)

`pricing_units` has **no INSERT/UPDATE/DELETE policy at all** — with RLS enabled, every direct write from a normal session is refused regardless of caller, and the two security-definer functions are the only door. Same "never a broad RLS write for a money-touching table" rule as `spend_coins`/`credit_coins`.

- `update_pricing_unit(p_key text, p_new_cost int)` — verifies `has_permission('finance.edit_rates')` (the real one-argument signature; there is no `has_permission(uuid, text)` overload), rejects negative/null costs, writes an `audit_log` row on every successful change including no-op changes, and raises `42501` on refusal so a denial is loud and distinguishable from "key not found" (which returns `false`).
- `update_coin_package_price(p_package_id uuid, p_new_price numeric)` — same checks, deliberately a **separate** function. A single generic function taking a table name would be an injection surface and would apply one permission check to tables nobody reviewed.
- Both `revoke execute ... from anon`, matching the 007b `spend_coins` precedent.
- `/api/admin/pricing` validates shape with zod but is **not** the security boundary — the check lives in the functions, so a future caller cannot bypass it. `/admin/pricing` refuses to render without the permission, but that is only the UI half.

**Permission choice.** Gated on `finance.edit_rates`, which already existed in the seeded RBAC model (003) and was already held by `finance_manager` and `super_admin`. `content.manage` was considered first and rejected: RBAC.md lists "financial settings" among `admin`'s explicit denials, and `content_manager` (015a) is a narrow curriculum-review role — gating money on a content permission would have silently widened both. No new permission was created and no role's grants changed.

**Audit trail.** Both functions write to the existing `audit_log` (003) rather than a new pricing-specific table. `audit_log` had been created with RLS, indexes and a comment stating that inserts happen via SECURITY DEFINER functions only — but nothing had ever written to it; these are its first real writers. `target_id` is a uuid, so a `pricing_units` key (text) travels in `metadata` with `target_id` null, while a coin-package change uses `target_id` properly. The table's `num_nonnulls(actor_user_id, actor_system_id) = 1` check is satisfied because `has_permission` already proved `auth.uid()` resolves to a real profile — an anonymous caller can never reach the insert.

## Points/level hardening — TECH_DEBT #20 closed (migration 027, 2026-07-27)

The last column of the same family. `profiles.points`/`level` were writable from any client session through the column-blind self-update policy — verified live before the fix (`{"points":999999,"level":99}` succeeded, reverted immediately). 025/026 deliberately could not cover them, because `awardPoints` wrote them through the user's own session; locking first would have broken lesson and quiz rewards outright. 027 does both halves in one migration: create the verified write paths, then close the column.

**Why not one generic `award_points(p_reason)`.** A reason-based function callable by `authenticated` is a *worse* hole than the one being closed: today a user could set their total once to an arbitrary number, but a generic RPC would let them mint `PMP_LEVEL_COMPLETE` (100 points) on repeat, indefinitely, and it would look like ordinary traffic. 013's `award_quiz_points` already established the correct shape and 027 follows it — **one function per real event**, each verifying the event and each idempotent via a persisted `points_awarded` flag taken under a row lock.

- `award_lesson_points(p_lesson_id)` — verifies a `lesson_progress` row for `auth.uid()` with `completed = true`, sets `points_awarded` under `for update`. No `p_user` parameter exists, so a caller can only ever pay themselves.
- `award_quiz_points(p_attempt_id)` — same signature as 013, **extended not forked**. Branch A (unchanged) is the assessor confirming an attempt they graded. Branch B (new) is the auto-graded path: the caller's own passed attempt on an `assessment_mode = 'auto'` quiz with `graded_by is null`. A hybrid/human quiz cannot pay out through branch B.
- Existing completed lessons were backfilled to `points_awarded = true`, so the migration cannot retroactively pay for past work or let anyone claim it twice.
- The 026 guard was extended to `points`/`level`, still **SECURITY INVOKER**, with the 025 lesson restated in the file and asserted (`prosecdef = false`) in a `DO` block.
- `/api/points/award` was retired (410 Gone). It paid out any `REASON_POINTS` key with no check that the event occurred — trusting the *reason* while Sprint 1 had already established it must not trust the *amount*. It had zero callers.

**Verified live, not asserted:** a real lesson completion moved points 10 → 20 with the flag set; four direct `PATCH` shapes were refused **403 / 42501** with values unchanged on independent read; replaying the RPC on an already-paid lesson returned `false` and changed nothing; a hybrid attempt did not auto-pay; and the assessor path still paid a second account 0 → 20 on a genuinely passed attempt.

## Quiz answer key isolated — CLOSED (migration 028, 2026-07-27)

Found while testing 027, and demonstrated end to end rather than reasoned about. `quiz_questions.question` is one jsonb holding `{text, options[], correct_index}`. The submit route strips `correct_index` before sending questions to the browser — ARCHITECTURE.md says "correct_index never sent to the client" — but that is a property of the route, not of the data. A plain `GET /rest/v1/quiz_questions?select=question` returns the whole object, key included, to any student enrolled in the course.

Reproduced with a fresh test account: read all 18 keys, submitted them through the real route, scored **100%**, and the attempt was then approved by a real assessor and paid out.

Hybrid review does not mitigate it — the assessor sees a score, and a cheated attempt presents as the strongest possible pass. Same shape as the points and role holes: a careful route, and a direct PostgREST path that bypasses it.

**Fixed in 028, as a property of the data rather than of a route.** RLS cannot hide part of a column, so the column had to change:

1. `quiz_answer_keys(question_id, correct_index)` — RLS enabled with **zero policies**. No policy means no client role can read a single row; the security-definer function runs as the table owner and is the only thing that can. Same "no policy is the policy" pattern 024 used for pricing writes, applied here to reads.
2. `correct_index` was **physically deleted** from every `question` jsonb (`question - 'correct_index'`), after being copied across. It is no longer hidden behind a check — it is not in the row.
3. `submit_quiz_attempt(p_quiz_id, p_answers)` does the grading inside the database and returns **only an aggregate score** — deliberately no per-question breakdown, which would let a caller recover the key by diffing attempts. It also re-implements the enrollment check by hand (SECURITY DEFINER bypasses RLS) and moves the one-attempt-per-quiz rule into the same transaction as the insert, closing a race the route previously had between its SELECT and its INSERT.
4. The submit route no longer reads questions or scores anything. That is the structural point: scoring in TypeScript *required* the key to be readable by the caller's session.

**Verified live:** a direct read of `quiz_answer_keys` returns `[]`; all 18 question objects now expose exactly `options,text`; the embedded-join bypass `select=id,quiz_answer_keys(correct_index)` returns `null`; the exact cheat that worked before now yields nothing to cheat with; correct answers through the real route still score **100**, wrong answers **0.00**; and the hybrid assessor path still paid a fresh account **0 → 20** on the approved attempt while the unapproved 0% one stayed at 0.

**Known residue:** `009_seed_pmp_level1.sql` still contains `correct_index` inside its jsonb, per the never-edit-old-migrations rule. Re-seeding a fresh database therefore needs 009 **then** 028; 028's self-check fails loudly if the key is ever present again, and `quiz.service.ts` keeps a defensive strip as a second net.

## Two Beta launch blockers closed (migration 029 + wallet kill switch, 2026-07-29)

**1. Durable cost cap on the placement conversation (TECH_DEBT #15).** The once-only guard on `/api/agent/placement` only fires after a *completed* placement, so start-abandon-restart was unbounded, and the only brake was an in-memory `rateLimit()` that resets on every deploy and cold start and multiplies by instance count on serverless.

`placement_usage` now holds a per-user lifetime counter with a hard cap of 40 messages, consumed by `consume_placement_quota()` immediately before the model call and after validation — so a malformed request cannot burn quota and an over-quota user costs nothing.

- **Check and increment are one atomic statement.** `insert ... on conflict do update ... where message_count < cap`. A read-then-write would let two concurrent requests both see 39 and both proceed; a cost control must not have that race. The `where` also means an over-quota caller updates zero rows, so the counter stops at the cap instead of climbing forever.
- **The cap is a constant inside the function, not a parameter.** PostgREST exposes every public function, so a `p_cap` argument would have been raised by simply passing a bigger number — the same reasoning as never accepting a coin or points amount from a client.
- **The table has a read-only owner policy and no write policy**, so a user can see their own count but cannot reset their own cost cap.

*Verified live:* one real message incremented the counter to 1 and returned a genuine reply (no regression). Calls 38-40 returned `allowed:true`; call 41 returned `allowed:false` with the stored count pinned at **40, not 41**. A real route request then returned **429**, logging `placement_quota_exhausted` with **no** `placement_reply_sent`. The stronger evidence is timing: warm, three consecutive refusals took a flat **1913 / 1394 / 1388 ms** — the Supabase round-trip alone, far below real gpt-4o latency — so "no model call happened" is shown positively, not inferred from a missing log line. After a **full server restart** the counter still read 40 and the route still refused, which is precisely the scenario that reset the old limiter.

**2. The simulated coin purchase is off by default.** `credit_coins()` mints spendable coins with no payment gateway and no limit on repeats; until now the only protection was a warning in this file and an orange box in the UI, neither of which stops a POST.

`/api/wallet/purchase` now refuses unless `WALLET_SIMULATION_ENABLED === "true"`. A missing or misspelled variable **fails closed**, which is the correct direction for something that hands out free currency. The check is the first line of the handler, before the session is even read — whether a feature exists is not a per-user question — and returns **503, not 403**: the capability is absent, the caller did nothing wrong.

*Verified live, both branches:* with the flag unset, **503** with a clear Arabic message, balance unchanged at **10**, and **no** new `coin_transactions` row. With `WALLET_SIMULATION_ENABLED=true`, **200**, balance `10 → 310`, and a real `+300 simulated_purchase` row — no regression in development.

The UI shows a plain notice and disables the buy buttons when off, but that is presentation only; the route refuses regardless of what the client renders. This is **not** a payment gateway and does not pretend to be one — real purchasing remains separate, later work.

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
