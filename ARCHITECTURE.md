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
recent recommendations + published course catalog + this user's own
enrollments (server) → inject as context → OpenAI chat.completions →
strip a trailing ```rec fenced block if present and insert it into
career_recommendations → persist both turns to ai_conversations →
return reply to client
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

**Catalog grounding**: the agent's only source of truth for courses is
`buildCatalogContextBlock()` (`features/agent/prompt.ts`), fed the live
published catalog (`getPublishedCourses`, reused from `features/lms/`)
and the caller's own `enrollments` (`getEnrollmentContext`,
`features/agent/services/agent.service.ts`). Without this block the
model had zero signal that WOW has real courses at all and fell back
to its own training knowledge — it was recommending Udemy/Coursera/
LinkedIn Learning for "how do I register for a course," which the
guardrails in `buildAgentSystemPrompt` now explicitly forbid: any
course recommendation must cite a real `course_id` from that block and
link to `/courses/{id}`; an empty catalog must be stated plainly, never
papered over with outside knowledge. The `complete_course` recommendation
kind carries the same real `course_id` in its payload for the same
reason.

Free to use for now — `spend_coins()` (007b) is not wired to `/api/agent`
yet; that's a subscriptions-sprint task, per an explicit product
decision, not an oversight.

**Profile grounding** (migration 016): `buildDnaContextBlock()` also
carries `age`, `gender`, and `reasonForJoining` (`profiles.onboarding_goal`,
resolved to its display label via `GOALS[account_type]`) straight from
the profile row — `age`/`gender` are nullable, so pre-existing accounts
that signed up before 016 render as "not stated" rather than erroring.
"Strengths" and "gaps" are **not** stored fields — there is no
free-text column for either, deliberately, per T2's "no score without
evidence" principle. Both are computed at request time from the
caller's own `entity_skills` rows (highest 5 by level = strengths,
lowest 5 = gaps); a user with few recorded skills can see the same
skill appear in both lists, which is an accepted small-N artifact, not
a bug. Verified via a real logged system prompt (not just a code read)
for two accounts: a fresh signup showed `Age: 27 · Gender: أنثى` and the
model's own reply used matching Arabic feminine grammar unprompted; a
pre-016 account correctly showed `Age: not stated · Gender: not
stated` with no error.

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
- `credit_coins()` (020) — verifies `p_user = auth.uid()`, then reads
  the coin amount from `coin_packages` by id server-side; never accepts
  a coin amount from the client. See §12.

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

## 10. Curriculum contribution to WOW's own shared courses (migrations 015a-d)

A second, deliberately separate path onto the same `lessons` table as
§9 — but governed, unlike a personal course's ungoverned self-approval.
An instructor proposes a lesson for a *shared* course
(`courses.owner_type IS NULL`, e.g. the published PMP course), and it
only becomes visible to students once WOW's own owner explicitly
approves it — regardless of how many peers voted for it.

```
Instructor (capability='instructor') → picks an existing module on a
shared course → POST /api/instructor/curriculum/suggest-lesson (zod +
capability + course-ownership check) → lessons row
(review_status='nova_check_pending') + a content_contributions row →
run_nova_check_placeholder() RPC (security definer — see below) →
review_status becomes 'human_review' → appears in /instructor/review
for anyone with 'instructor'/'assessor' capability (peer votes,
recorded in content_review_votes as voter_type='peer_instructor'/
'peer_assessor', purely informative — never touch review_status) →
the owner's account (role='content_manager', permission
content.manage — migration 015a/b) casts the one vote that matters
(voter_type='owner'): review_status → 'approved' or 'rejected',
independent of any peer vote count → POST /api/instructor/review/vote
does both the vote insert and the review_status UPDATE, both under the
owner's own RLS-checked session.
```

**"Nova check" is a placeholder, not real content review.** The
automated pre-check step (`run_nova_check_placeholder()`, a security
definer function) always auto-approves without analyzing anything —
real automated review logic doesn't exist yet. It exists purely so a
freshly-proposed lesson advances out of `nova_check_pending` into the
human review queue. Replace it before trusting this signal for
anything beyond a demo.

**The review-status visibility gate is the load-bearing part of this
feature, and it was NOT free** — building this surfaced that the
existing lesson-visibility policy (004) had zero awareness of
`review_status` at all: an enrolled student could already see every
lesson in a course's modules regardless of approval state. A
newly-proposed, unapproved lesson would therefore have been visible to
every enrolled student the instant it was submitted — the opposite of
the intended guarantee. Fixed in 015c with a `RESTRICTIVE` policy
(narrows the existing permissive one; a second permissive policy would
have had no effect) requiring `review_status='approved'` for ordinary
visibility, with explicit exemptions for: the lesson's own submitter,
any instructor/assessor/content.manage holder (the reviewer audience),
and — critically — any personal-course lesson (`owner_type='user'`),
which never goes through this workflow at all and must never be gated
by review_status. 015c also had to backfill every one of the 18
already-live PMP lessons to `review_status='approved'`, since all of
them predate this workflow and were still sitting at the column's
`nova_check_pending` default — without the backfill, the new gate would
have hidden the entire published PMP course from every student.

**content.manage is a narrow, single-purpose role** (`content_manager`,
015a/b), not a repurposed `admin`/`super_admin` — those also carry
unrelated permissions (`users.manage`, `roles.assign`, finance, etc).
`profiles.role` cannot be self-elevated the way `user_capabilities` can
(only an existing admin/super_admin assigns roles, per 003's RBAC
design), which is what makes a direct `has_permission('content.manage')`
RLS check on `lessons` UPDATE (015b) an appropriate, proportionate
design here — not a repeat of the broad-RLS points mistake CLAUDE.md
already documents once.

See SECURITY.md for the full RLS policy list and the two real
bugs (not just re-tests) this feature's own testing surfaced.

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

## 11. Language task submissions — first real `spend_coins()` call site (migrations 017-018)

> Superseded in part by §16: since migration 023 this is only one of
> **two** live task shapes, and readers go through `resolveLanguageTask`
> rather than reading `module_closing` directly. Everything below about
> the submission/charge/rollback flow itself is unchanged.

Each PMP Level 1 module's closing lesson carries an optional English
`optional_language_task` inside `lessons.content->module_closing` (seed
data, 009) — no `task_type` field exists to distinguish "write" from
"record/prepare" prose; all six are answered as text, since there is no
audio recording/upload capability anywhere in this project. This
feature wires that field to a real submission flow, and is the first
place `spend_coins()` (007b) is actually called from application code —
still not wired into `/api/agent` itself, per the existing, deliberate
deferral to the subscriptions sprint.

```
LanguageTaskCard (client, features/lms/) → POST
/api/lms/language-task/submit → insert language_task_submissions
(unique(user_id, lesson_id) is the real anti-replay guard) →
spend_coins(auth.uid(), coin_cost, 'language_task',
'language_task_submissions', <row id>) → on success, the client calls
the existing sendAgentMessage() (features/agent/services/agent.client)
— same /api/agent path Task 1 already grounds in catalog + DNA, no
second OpenAI call site — wrapping the task text + the user's response
into one feedback-request message.
```

`coin_cost` and the task text itself are read from `lessons.content`
server-side inside the route on every request — never trusted from the
client, same principle CLAUDE.md #4 already states for points.

**A real bug was found and fixed during this feature's own acceptance
testing, not a design change:** 017 shipped `language_task_submissions`
with no DELETE policy at all ("a submission is permanent once made"),
but the route's own insufficient-balance path tries to `DELETE` the
just-inserted row as a rollback. Because PostgREST/Postgres treat a
DELETE matching zero RLS-visible rows as success, not an error — the
exact same failure class SECURITY.md already documents from the
Sprint 3.3 assessor-approve bug — that rollback silently no-opped,
leaving a real orphaned "submitted" row behind with no matching
`coin_transactions` entry after a genuine 402. Confirmed live via a
manually-lowered test balance. Fixed in 018 with a DELETE policy narrow
enough to permit exactly the rollback case: a row is deletable by its
owner only if no `coin_transactions` row references it — a submission
that was actually paid for stays permanently undeletable, preserving
017's original intent. Verified post-fix, all via real REST calls with
the test account's own JWT: the orphaned row deleted successfully
(200, row returned), a genuinely paid row's delete attempt returned
200 with an empty body (RLS silently blocked it, row confirmed still
present), and a clean resubmission of the same lesson after restoring
balance succeeded end-to-end (balance debited correctly, new
submission + `coin_transactions` rows, real agent feedback returned).

## 12. Wallet purchase simulation on `/profile` (migration 020)

`credit_coins(p_user, p_package_id)` mirrors `spend_coins()`'s security
model exactly, in reverse: reads the coin amount from `coin_packages`
by id server-side, verifies `p_user = auth.uid()`, credits `wallets`,
and inserts a `coin_transactions` row with `type='purchase'` and
`reason='simulated_purchase'` — a deliberately distinct reason from any
future real-gateway purchase, so the two stay filterable apart in any
later financial reporting. Called from `POST /api/wallet/purchase`
(`WalletPanel`, `features/profile/`), never directly from the client —
same server-route-calls-the-RPC pattern as every other security
definer function in this codebase (`spend_coins`, `award_quiz_points`,
`run_nova_check_placeholder`).

**This is explicitly a local simulation, not a payment integration —
there is no gateway, no real charge, and (deliberately, for now) no
rate limit on repeat purchases.** See TECH_DEBT.md: this path must be
disabled or replaced with a real payment gateway before any Beta
traffic beyond the closed test circle, same severity as RBAC.md's
minors-policy launch blocker. Verified live: a real account's balance
went 25 → 325 → 625 → 925 across three consecutive purchases of the
same package, each producing its own real `coin_transactions` row
(`amount=300, type='purchase', reason='simulated_purchase'`) — proving
the "no limit" behavior is real, not assumed.

`coin_packages.name_en` (also added in 020) is read and branched on
correctly in `WalletPanel` — but `/profile` has no `LangToggle`
anywhere (same pre-existing gap the lesson player had before §11's
fix, out of scope for this task), so in practice a real user never
sees the English name today; the code path exists and is correct, but
is currently unreachable.

**Update (language persistence, §13):** once `useLang` began persisting
the choice, `WalletPanel` — which calls `useLang` itself — did start
showing `name_en`. What remains is narrower and is now tracked as
TECH_DEBT #13: `ProfileView` still receives a hardcoded `lang="ar"`
prop, so the panels around the wallet stay Arabic while the wallet
follows the persisted language, and `/profile` still offers no way to
switch language from the page itself.

## 13. Language persistence + the lesson player's pronunciation tools (migration 021)

**`useLang` now persists** (`localStorage`, key `wow.lang`). It reads
storage inside an effect rather than during render, deliberately: the
server cannot see `localStorage`, so seeding state from it directly
would make the first client render disagree with the server's HTML —
a real hydration mismatch. The cost is a brief first paint in the
default language before a stored non-default choice applies. A
server-read cookie would remove even that flash, but only by threading
an initial language through every page that renders a translated
component. Each `useLang()` call still owns its own state, so two
independent toggles on one page would not live-sync; no page mounts
two today.

**The lesson player** (`features/lms/components/LessonView.tsx`) owns
the toggle for the lesson route and passes `lang` down as a prop to
every child that needs it, rather than each child calling `useLang`
separately — that mismatch is what left "Mark as complete" stuck in
Arabic once before. Its header is `sticky top-0` so the toggle stays
reachable while reading. Prev/next navigation is computed in
`getLessonNeighbors` (`lesson.service.ts`) over
`(module.order_index, lesson.order_index)`, so it crosses module
boundaries — the last lesson of a module links to the first of the
next. RLS filters that list like everything else, so a locked lesson
simply isn't a neighbor. The unavailable direction is omitted, not
rendered disabled.

**Pronunciation practice** (`PronunciationPractice`, migration 021)
lets a learner record themselves reading any English text on the page
— lesson body, each vocabulary word, each grammar example — listen
back, and optionally pay `COIN_COSTS.PRONUNCIATION_EVALUATION` (3) to
have their agent compare what they said against the reference. The
recording and playback are free and unlimited; only the evaluation
costs coins, and it is repeatable without limit by design (021 has no
unique constraint, unlike `language_task_submissions` — repeated
drilling is the point).

The load-bearing constraint, verified against the live API surface
rather than assumed: **`SpeechRecognition` cannot transcribe a
recorded Blob.** It does live capture only and exposes no way to
accept a `MediaStream` (its entire surface is `grammars, lang,
continuous, interimResults, maxAlternatives, abort, start, stop,
processLocally, phrases`). So one press must drive `MediaRecorder`
*and* `SpeechRecognition` at the same moment — two independent
captures of the same microphone, not a shared stream — and the
transcript must be produced while speaking, not derived afterwards.

**⚠️ The dual capture has NOT been verified against a real microphone.**
It was built and tested in an environment where microphone access is
blocked, so what is confirmed is: both APIs are present, the interface
genuinely cannot take a `MediaStream`, and every *failure* path behaves
correctly (a denied microphone shows its reason and stays out of the
recording state; a missing `SpeechRecognition` hides the paid button
and explains why). What is **not** confirmed is that `MediaRecorder`
and `SpeechRecognition` actually capture the same microphone
concurrently without conflict on real Chrome/Edge — that is the
expected behavior on Windows (WASAPI shared mode), but it is an
inference, not an observation. **This needs one manual confirmation on
a real device.** The graceful degradation below is deliberately built
to cover its failure, so a conflict would surface as a visible,
non-charged error rather than a broken feature — but the happy path
should not be described as verified until someone has actually spoken
into a microphone and seen a transcript come back.

Because that dual capture can fail in ways outside our control, every
failure is surfaced and none is chargeable: no `SpeechRecognition`
(Firefox) leaves recording and playback fully working with the
evaluate button hidden and the reason shown; a recognition error or an
empty result leaves the recording playable and explains why evaluation
isn't possible. Coins are only ever spent once a non-empty transcript
already exists, so a user cannot pay for recognition that didn't work.

**No audio is ever uploaded or stored** — it lives as an in-memory
Blob plus an object URL that is revoked on unmount, and dies with the
page. Only text reaches the server. This is also why the UI states
plainly that the evaluation measures word accuracy via speech-to-text
and *not* accent or sound quality: the agent receives a transcript and
never hears the recording.

**Note on `lesson.title` → `localized.title`:** the title's listen
button originally spoke the raw `lesson.title` because that was the
explicit spec at the time ("`lesson.title` بالإنجليزي دائماً، ليس
`localized.title`"). Switching it to `localized.title` (and showing it
only in EN) is a later product decision by the owner, not a regression
being corrected.

## 14. Agent-led language layer, phase A: English placement (migration 022)

The owner's direction for the language layer: the agent assesses the
learner's level, remembers them, and proposes suitable lessons — the
learner decides. This phase is the foundation the later phases (lesson
suggestions, gating/unlocking the language layer, the floating agent)
all depend on: a real stored level and a real durable memory.

```
PlacementChat (client, features/agent/, composed into ProfileView via a
placementSlot — the DashboardView assistantSlot pattern, deliberately
not a sibling-feature import) → POST /api/agent/placement →
[GUARD: user_language_profiles row exists? → 409 with stored level,
 BEFORE the rate limiter and BEFORE any OpenAI call] →
rate limit (15 msgs/10min, own key, reusing shared/lib/rate-limit) →
buildPlacementSystemPrompt (features/agent/prompt.ts — a different job
from the general agent, so a different prompt entirely) →
callAgentWithRetry (shared/lib/openai.ts) →
extractPlacementBlock: the agent ends its final reply with a fenced
```placement {"level","summary","facts"} block (the exact ```rec
pattern) → zod-validate → insert user_language_profiles +
learner_notes(source='placement') → { completed: true, level }
```

**Why the guard order is load-bearing:** the conversation is free and
once-only by owner decision. A completed user costs one indexed SELECT
per attempt — never a model invocation. The table's PRIMARY KEY on
`user_id` backstops the race the pre-check can't see (two parallel
tabs): the losing insert hits 23505 and is returned as the same 409.
What the guard deliberately does NOT cover — abandoned, never-completed
conversations that restart forever — is a real OpenAI cost exposure
bounded only by the in-memory rate limiter, tracked as TECH_DEBT #15
with launch-blocker severity.

**Durable memory begins here.** Until 022, everything a learner told
the agent lived in the client-held 20-message history and died with the
page. Now `learner_notes` (append-only; no UPDATE/DELETE policies) and
`english_level` are injected into the general agent's DNA context block
on every `/api/agent` conversation — capped at the 15 most recent notes
so the prompt can't grow without bound. `source='conversation'` is
reserved for later phases where ordinary chats also write notes.

**Extraction, not duplication:** the OpenAI client and its retry logic
(15s timeout, one retry, gpt-4o) moved verbatim from
`app/api/agent/route.ts` to `shared/lib/openai.ts` when the placement
route became a second caller. `/api/agent`'s behavior is unchanged and
was re-verified live after the move, not just recompiled.

**Deferred by explicit owner decision, not forgotten:** re-placement
("test up to a higher level") — the UI says so; there are no UPDATE
policies on `user_language_profiles` yet for exactly this reason.
Known cosmetic limitation: the placement card is composed server-side
with `lang="ar"`, so it does not follow the lesson page's client-side
AR/EN toggle (same class of inconsistency as TECH_DEBT #13).

**Update (relocation + prompt fix, 2026-07-26):** two follow-ups from
the owner's own first real conversation.

*Relocated from the lesson page to `/profile`.* The placement is now a
general one-time introduction composed there (`app/profile/page.tsx` →
`ProfileView`'s `placementSlot`), not tied to a specific lesson —
`LessonView` no longer accepts or renders a `placementSlot` at all.
Its scope grew to match: besides the English level, the conversation
now explicitly asks about the learner's career path (current role/
field, what they're aiming for on WOW), and `learner_notes` facts are
described accordingly.

*Prompt fix: the model was giving up on English too easily.* A real
session showed the failure mode directly: the learner replied "لا
افهم انجليزي، هل يمكنك التحدث بالعربية؟" and the agent switched fully
into Arabic small talk with no further English elicitation at all —
technically permitted by the original wording ("switch to Arabic for
comfort and instructions") but never enforced continuing to ask for
English afterward, so the rest of the conversation produced zero
assessment evidence. `buildPlacementSystemPrompt` now makes this
explicit: an Arabic-language first message is normal opening small
talk, not evidence of struggle; a switch to Arabic instructions
requires an explicit "I don't understand English" or two ignored
invitations; and **every turn after switching must still end with one
small, concrete English ask** — never pure Arabic chit-chat. Verified
live by replaying the exact reported scenario: the same trigger phrase
now produces `"لا مشكلة، سأساعدك باللغة العربية. لكن حاول أن تكتب
جملة قصيرة بالإنجليزية إن أمكن، مثل \"My name is ...\" 🙂"` instead of
abandoning English — and the conversation went on to gather real
evidence (including a genuine grammar error, "I want learn english")
and concluded with an honest level (A2) and career-path facts.

## 15. The floating agent — reachable from anywhere, aware of the lesson you're on

Phase B of the same language/agent layer. Three of the four parts the
owner scoped (the icon on every page, the chat panel, the text button)
shipped together here; the fourth — a real-time conversational **voice
call** — stayed deferred as its own phase, because nothing in the
codebase supports it yet (no WebRTC/WebSocket dependency, no metered
per-minute billing anywhere, and a browser-side Realtime session needs
a server-minted ephemeral credential so `OPENAI_API_KEY` never reaches
the client — CLAUDE.md #5).

```
FloatingAgent (client, features/agent/) — FAB + panel, mounted per page
  ├─ /dashboard, /profile               (middleware-protected)
  ├─ /courses, /courses/*/lessons/*     (PUBLIC — user really can be null)
  └─ lesson pages additionally pass lessonId
        │
        └→ sendAgentMessage(msg, history, { lessonId })
              → POST /api/agent  { message, history, lessonId? }
                   → zod: lessonId must be a uuid (400 otherwise, before OpenAI)
                   → getLessonAgentContext(supabase, lessonId)   [RLS-scoped]
                   → buildLessonContextBlock(...) appended to the system prompt
```

**Why it is not in `app/layout.tsx`.** The root layout is a pure Server
Component with no client wrapper, and mounting there would mean deciding
visibility by pathname — fragile, and re-decided on every new route. It
is composed per page instead (the established `assistantSlot` /
`placementSlot` pattern), and each host page already resolves the user
server-side. The consequence is the security property the owner asked
for: a signed-out visitor does not get the component *hidden*, they
never receive it at all. Verified by fetching `/courses` and a
free-preview lesson page with no cookies — zero occurrences of the
widget's markup in HTML that otherwise rendered the full lesson.
`/courses` and lesson pages are genuinely public (not in `middleware.ts`'s
matcher), so both branch on `user` explicitly. The route-group
alternative is TECH_DEBT #16.

**Lesson awareness: only the id crosses the wire.** The client sends
`lessonId`, never lesson text. The route re-fetches the content itself
through the caller's own Supabase session, so the same
`Lessons: enrolled or free preview` RLS policy that governs the lesson
page governs what the agent can see — a client cannot inject arbitrary
text into the system prompt, nor read a lesson it isn't entitled to.
Proven with one variable changed and nothing else: the *same* account
sending the *same* locked lesson id logged `withLessonContext:false` and
answered "I have no information about specific lessons" before
enrolling, then `withLessonContext:true` and named that lesson's exact
grammar point (Present Perfect vs Past Simple) after enrolling.

**Prompt size is a per-turn cost, not a one-off.** The lesson block is
rebuilt and sent with *every* message from a lesson page, so
`getLessonAgentContext` applies hard caps: 1200 chars per body (AR and
EN separately), 600 for the grammar explanation, 25 vocabulary pairs,
and it sets `truncated` so the agent can say plainly that it can't see
the rest rather than inventing it. Measured against all 19 real lessons
currently in the DB, the longest values are 415 / 557 / 317 chars and 5
vocabulary pairs — every cap is comfortably clear of current content, so
the truncation branch is **not exercised by any lesson that exists
today** and is verified by code reading only, not by live data.

**Known limitation, verified rather than assumed:** the widget follows
the persisted AR/EN choice on every fresh page load, but not a switch
made while the page is already open — each `useLang` instance reads
localStorage once at mount and nothing notifies the others. Confirmed
live (lesson player in EN, floating agent still Arabic; correct after
reload) and tracked as TECH_DEBT #18 together with #13.

**Not solved here:** the agent still forgets the conversation itself on
reload. `ai_conversations` has been written to since Sprint 3 and has
never been read back — see TECH_DEBT #17, which the owner flagged as
directly at odds with the "رفيق حقيقي" intent and the natural next step
after 022's durable memory.

## 16. Every lesson gets a writing task — the second task shape (migration 023)

Phase (و) of the language layer. The 6 tasks that existed since 009
covered only module-ending lessons; the owner authored 12 more, one per
remaining PMP Level 1 lesson, each drilling **that lesson's own** grammar
point and vocabulary rather than being generic practice.

**Why a second shape rather than reusing the first.** The original tasks
live at `content.module_closing.optional_language_task` and belong
there — those 6 lessons genuinely end a module, and the UI renders a
"لإنهاء هذه الوحدة" card for them. Filing the new 12 under the same key
would have made that closing card appear on mid-module lessons: a
semantic error, not a cosmetic one. So 023 writes a new root key,
`content.language_task = {prompt, coin_cost}`, valid on any lesson, and
the 6 old rows were deliberately **not** migrated — no rewrite of data
real users have already submitted against, and
`language_task_submissions.task_text_snapshot` keeps matching what those
users were actually shown.

Both shapes are therefore live and permanent. One resolver decides
between them:

```
resolveLanguageTask(content)          // features/lms/services/lesson.service.ts
  → content.language_task             (023, any lesson, 3 coins)
  ?? content.module_closing.optional_language_task   (009, 6 endings, 5 coins)
  → { taskText, coinCost, source } | null
```

It is used by all three readers — the lesson page (whether to prefetch
wallet/submission state), `LessonView` (whether to render the card), and
`/api/lms/language-task/submit` (**the price enforcement point**) — so
they cannot drift on which task wins or what it costs. The client never
decides the cost; it only displays the number the server gave it
(CLAUDE.md #4).

**The migration verifies itself.** An `UPDATE` whose `WHERE` matches
nothing is not an error in Postgres — the same silent-no-op class that
018 had to fix for `DELETE`. A title typo would have quietly left a
lesson without its task. 023 ends with a `DO` block that raises unless
exactly 12 lessons carry `language_task`, exactly 6 still carry the
original `module_closing` task, and **zero** carry both. The disjointness
was also checked against live data before the file was written: the 12
target lessons have no `module_closing` object at all.

**Dashboard cleanup shipped alongside.** The fixed `AgentChat` card was
removed from `/dashboard` by owner decision now that the floating agent
(§15) reaches the agent from everywhere — two chat surfaces on one page,
each with its own separate history, confused more than they helped.
`DashboardView`'s `assistantSlot` prop went with it rather than being
left as an optional prop nobody passes; `ProfileView`'s `placementSlot`
still demonstrates the same composition pattern if the dashboard ever
needs an in-page panel again.
