# ROADMAP.md

## Sprint 1 — Database + RBAC ✅ (this audit)
- Full architecture audit (see reports below).
- Stabilized project so it actually builds: `tsconfig.json`, `next.config.js`,
  `next-env.d.ts`, `.eslintrc.json` added.
- Fixed critical points-awarding vulnerability.
- Added RBAC foundation: `app_role` enum + `profiles.role` column +
  `current_user_role()` helper (no admin UI/policies built on top yet —
  that's for whichever sprint first needs an admin view).
- Added missing FK indexes + `updated_at` trigger (migration 002).
- Added `app/error.tsx` + `app/not-found.tsx`.
- Documented, but did **not execute**, the feature-based restructuring —
  proposed as the first task of Sprint 2 (see PROJECT_STRUCTURE.md).

## Sprint 1.5 — Foundation Hardening ✅
- Feature-based restructure executed (`features/` + `shared/`), all routes
  preserved, old `lib/` + `components/` removed after relocation verified.
- zod validation on every API route + shared with client forms.
- Centralized i18n (`shared/i18n`) — removed 3× duplicated dictionaries.
- Shared UI primitives extracted (AuthLayout, Button, Input, FormField,
  Card, Loading, EmptyState, ErrorState, LangToggle) — zero visual change.
- Nova protected: per-user rate limit, 15s timeout + 1 retry, structured
  logging, capped/validated history.
- Security headers added in `next.config.js` (CSP deferred to Sprint 9).
- Audit-log hook wired into points awarding.
- Testing foundation: vitest config + smoke test (real coverage = Sprint 10).
- New docs: CODING_GUIDELINES.md, CONTRIBUTING.md.

## RBAC Design Phase ✅ (between 1.5 and Sprint 2)
- Full actors model designed and approved across iterative reviews:
  platform staff (atomic permissions), individual capabilities,
  organizations & memberships, polymorphic ownership, guests, system
  actors, affiliates, API partners, disputes, mentor/assessor,
  assessment_mode (auto/human/hybrid), profiles.status.
- Deliverables: `RBAC.md` + `supabase/migrations/003_full_rbac_blueprint.sql`
  (final, approved — run 001 → 002 → 003).
- **Launch blocker (policy, not code):** minors / guardian-consent policy
  must be decided before real public sign-ups (see RBAC.md).
- **Next-sprint wiring task:** middleware must treat non-`active`
  profiles.status as unauthenticated.

## Sprint 2 — Domain Core ✅ (scope revised by agreement: domain before UI)
- **Skills Framework** (migration 004): taxonomy + polymorphic
  `entity_skills` — the shared backbone LMS/Jobs/DNA/AI all reference.
- **Career DNA nucleus** (Professional Digital Twin, 10-axis definition
  approved): `career_profiles` (jsonb axes), `career_goals`,
  `career_scores` (TIME SERIES + mandatory explanation), `career_preferences`,
  `career_consents` (per-org, revocable, personality never shareable),
  `career_recommendations` (Nova-attributed, measurable).
- **LMS tables**: courses extended (polymorphic owner + is_published),
  modules, lessons, quizzes/questions/attempts (auto/human/hybrid),
  lesson_progress, certificates, sponsored enrollments
  (`sponsor_org_id` + training_manager visibility), full RLS incl. the
  guest published-only rule.
- **DOMAIN_CONTRACTS.md**: binding Jobs/Employer contracts + the
  Transparency & Privacy Charter (T1–T9).
- Run order now: 001 → 002 → 003 → 004.

## Sprint 2.1 — Evidence Engine + Trust ✅ (approved extension)
- Verified skill sources added (`employer_verified`,
  `certification_verified`) with a binding matching-weight order.
- **Evidence Engine** (`skill_evidence`): Skill → Evidence → Confidence;
  9 evidence types (certificate, quiz, project, instructor/manager review,
  video, GitHub, portfolio, interview); internal evidence links real rows,
  external links count at reduced weight until verified.
- **Trust Score**: `trust` added to career_scores (time-series +
  mandatory explanation), fed by auditable `trust_events` (server-written
  only, signed weights); `profiles.identity_verified_at` badge; the
  badge/number split keeps employer visibility consent-based (T3/T7).
- **Nova quality metrics**: `confidence_score` + full lifecycle
  (accepted/rejected/ignored/implemented) + `nova_quality_metrics` view.
- Run order now: 001 → 002 → 003 → 004 → 005.

## Sprint 2.2 — Workforce Outsourcing Domain ✅ (approved: third-party model)
- Legal model: platform = tech intermediary + guarantor; licensed
  `workforce_partner` org = employer of record (outsourcing contracts
  REQUIRE a partner by check constraint).
- `guarantee_terms` (public, versioned, selective eligibility thresholds),
  `workforce_contracts` (both models; activation trigger enforces
  eligibility), `placements`, `placement_reviews` (talent always sees
  their reviews; reviews feed trust_events + manager_review evidence),
  `guarantee_claims` (replacement/refund lifecycle under the new
  `guarantees.review` permission).
- Run order now: 001 → 002 → 003 → 004 → 005 → 006.

## Sprint 3 — LMS + Personal Agent + Profile + DNA wiring ✅
Delivered: `features/lms/` (course catalog, course page, lesson player,
quiz taking, assessor grading queue), `features/agent/` (replaces
`features/nova/` — per-user `chosen_name` picked at first use, no fixed
"Nova" branding in UI, reads full DNA context, writes real
`career_recommendations`), `features/profile/` (`/profile`: DNA axes,
skills+evidence, certificates, Employability/Trust scores, active
capabilities with self-service activation, agent recommendations).

**Also fixed (found the same way — real login, not code review):**
`shared/lib/supabase/server.ts`'s cookie `set`/`remove` calls threw
uncaught whenever Supabase tried to refresh an aging session token
mid-render on a plain Server Component (Next.js only allows cookie
writes from a Server Action or Route Handler) — every page crashed to
`app/error.tsx` once a session was old enough. Wrapped in `try/catch`
per Supabase's own documented guidance (`middleware.ts` already
refreshes sessions on every protected request, so a Server Component's
own write attempt failing is expected and safe to swallow).

**Content:** `009_seed_pmp_level1.sql` — the first real course (PMP Level
1, 6 modules, 18 lessons, 18-question hybrid final assessment).
`011_pmp_level1_course_skills.sql` — tags the course with its 4 skills
via `entity_skills(entity_type='course')`, the missing link the quiz-pass
DNA feed needs to have anything to credit.

**LMS→DNA feed contract activated** (DOMAIN_CONTRACTS.md §5): lesson
complete → `lesson_progress` + `LESSON_COMPLETE` points (server-verified
via RLS-gated read, not a client flag). Quiz pass, auto or
assessor-confirmed → `entity_skills(source='assessment')` +
`skill_evidence('quiz_attempt')` + points, all through a genuinely
working write path (see below). Auto-pass also recomputes
`career_scores(employability)` with a real `{factors, tip}` explanation;
the assessor-confirmed path does **not** yet (deferred — see below).

**Acceptance testing (per TESTING_POLICY.md, added this sprint) found
and fixed 5 real RLS write-permission gaps** that unit-level code review
never would have caught — only surfaced by testing with two separate
real accounts (a student and an assessor), not one account playing both
roles:
- `migrations/009-013`: `courses.track` NOT NULL omission and a
  `quiz_purpose` column that never existed in the seed script; an
  ambiguous `profiles` embed in the assessor queue query (`quiz_attempts`
  has two FKs into `profiles` — `user_id` and `graded_by` — so
  `profiles(...)` alone is genuinely ambiguous to PostgREST); a missing
  UPDATE policy that silently let an assessor's "approve" click affect
  zero rows when grading someone else's attempt (masked in the first
  test only because that account happened to grade its own submission);
  and — the one that actually blocked points/skills/evidence from ever
  being written — `entity_skills`, `skill_evidence`, `career_scores`,
  `user_badges`, and `system_actors` each had either no policy or no
  grant covering a write/read made by anyone other than the row's own
  owner.
- **Points are never awarded via a broad RLS policy on `profiles`** —
  that would reopen the exact class of bug SECURITY.md already
  documents as fixed once. Instead, `award_quiz_points(attempt_id)`, a
  `security definer` function that only pays out for a real, passed,
  not-yet-paid attempt graded by the calling assessor themselves
  (row-locked, replay-tested — a second call for the same attempt
  correctly returns `false` and awards nothing). See SECURITY.md.

**Deferred, explicit, documented (not silently skipped):**
- `career_scores(employability)` recompute when an assessor confirms a
  hybrid/human attempt for someone else — needs the same
  security-definer-function treatment as points before it's safe to
  wire up. Tracked in TECH_DEBT.md.
- Third-party badge grants (an org/system awarding a badge the user
  didn't trigger themselves) — same reasoning, same deferral.
- middleware: treat non-`active` profiles.status as unauthenticated
  (carried task from 003 — still not done).
- Rate limiter → shared store before the agent gets real public traffic
  (carried from 1.5 — still not done).

## Sprint 3.1 — Beta (5-10 real users, 1 week) — next
Defined in `TESTING_POLICY.md`. Numeric success criteria (signup
completion, dashboard latency, zero raw-error leaks, lesson+points
completion, agent uptime) before any capacity investment (Redis,
Supabase upgrade) — measure real usage first, same philosophy as
deferring Subscriptions until there's a reason to build them.

## Sprint 3.2 — Instructor System: Personal Courses + Live Sessions ✅
Delivered: `features/instructor/` (new), `app/instructor/courses/*`,
`app/join/[code]`, `app/api/instructor/courses`. An instructor
(capability self-activated from `/profile`, same as any other
capability) creates a personal course (`owner_type='user',
is_published=false` — never enters the public catalog), adds
modules/lessons to it freely (no `content_review_votes` approval gate —
they're the sole owner and approver of their own course, unlike the
shared-curriculum path), and shares a generated `/join/[invite_code]`
link that auto-enrolls a student. Live sessions
(`live_sessions`/`live_session_attendance`, migration 014): instructor
schedules a meeting-link session on their course; enrolled students see
it on the normal course page and can "join" (opens the link +
self-reports `joined_at` — **not verified by any meeting provider, by
design** — see SECURITY.md / DOMAIN_CONTRACTS.md §8 for the caveat).

**Explicitly a separate task at the time:** the shared-curriculum
contribution path (`content_review_votes` governance, migration 008 —
owner + peer_assessor + nova_check voting gate) was **not** part of this
delivery. This sprint covered only an individual instructor's own,
ungoverned personal courses. See Sprint 3.3 below — that gap is now
closed too.

Building the first real owner-driven course UI surfaced a pre-existing,
never-until-now-exercised RLS gap: `modules`/`lessons` had no
owner-manage policy at all (every course shipped before this was seeded
directly via the SQL Editor, bypassing RLS). Closed via 10 new,
narrowly-scoped RLS policies across 5 tables — see SECURITY.md. Tested
end-to-end with two real, separately-signed-up accounts (instructor +
student) per TESTING_POLICY.md, plus a regression check confirming the
existing published-catalog flow is unaffected.

## Sprint 3.3 — Instructor System: Curriculum Contribution ✅
Delivered: `/instructor/courses`' second section ("المساهمة في منهج
WOW المشترك"), `/instructor/review`, `app/api/instructor/curriculum/
suggest-lesson`, `app/api/instructor/review/vote`. Closes the gap Sprint
3.2 explicitly left open: an instructor can now propose a lesson
(title/body AR+EN, 5 vocabulary pairs, optional toolbox) on a *shared*
WOW course (`owner_type IS NULL`, e.g. the published PMP course) — but
unlike a personal course, it does not go live on their say-so. It moves
through `review_status` (`nova_check_pending` → `human_review` →
`approved`/`rejected`), governed by `content_review_votes` exactly as
008 originally specified: any `instructor`/`assessor` capability holder
can cast an informative peer vote, but only the owner's own decision
(`voter_type='owner'`, gated by a new narrow `content_manager` role
mapped to just the `content.manage` permission — not a repurposed
`admin`) actually flips `review_status`, independent of peer votes.

**Two real bugs found and fixed during testing, not re-tests of
anything:**
- The submitting instructor's own API route (`.insert().select()`)
  failed with a generic RLS error — the exact `return=representation`
  false-negative pattern SECURITY.md's Sprint 3 section already
  documents from a *diagnostic curl call*, except this time it was a
  real bug in real app code (015c).
- Chasing that surfaced something bigger: lesson visibility had never
  actually been gated on `review_status` at all — an enrolled student
  could already see every lesson in a course regardless of approval
  state, meaning a freshly-proposed lesson would have been visible to
  students the instant it was submitted. Fixed with a `RESTRICTIVE`
  policy (015c) — a second permissive policy would have had zero
  effect — with a backfill for all 18 already-live PMP lessons (still
  sitting at the review_status column's `nova_check_pending` default,
  since they predate this workflow entirely) and an explicit exemption
  for personal-course lessons (Sprint 3.2), so that already-shipped,
  already-tested feature stays completely unaffected.

Also worth recording: `lessons` has no DELETE policy for anyone, by
design (content moves through `review_status`, never gets hard-deleted)
— see SECURITY.md. A minor incident during this sprint's own testing
(two stray debug rows briefly became visible on the live PMP course
after the 015c backfill, since a `DELETE` silently no-ops without a
matching policy) was caught and cleaned up (015d) before anything was
pushed.

**Acceptance testing performed** (three real accounts — instructor,
peer voter, and the real platform-owner account holding
`content.manage`) per TESTING_POLICY.md: full flow end-to-end, verified
via REST with the student's own JWT both that the pending lesson was
genuinely invisible before approval and genuinely visible after
(Module 3: 5 → 6 lessons), plus a regression check confirming all 18
original PMP lessons stayed visible and unchanged throughout.

**This closes the instructor system trilogy** (Sprint 3.2 + 3.3):
personal courses, live sessions, and shared-curriculum contribution.

## Sprint 3.4 — Agent Catalog Grounding + Coin Wallet Activation (in progress)
Triggered by a real user-reported quality bug, not a planned feature:
asking the agent (chosen name "المرشد" on the reporting account) "كيف
أسجل بالدورة؟" got a generic Udemy/Coursera/LinkedIn Learning answer —
a direct violation of the "recommend only real WOW content" guardrail,
because nothing had actually broken that guardrail's *enforcement*: the
context-fetching `Promise.all` in `app/api/agent/route.ts` never
queried course/enrollment data at all, so the model had zero signal
WOW even has real courses and fell back entirely to its own training
knowledge.

**Task 1 (done, tested)**: catalog grounding. Added
`getEnrollmentContext()` (`features/agent/services/agent.service.ts`),
reused `getPublishedCourses()` from `features/lms/` (imported at the
`app/` composition layer, not into `features/agent/`, per the
import-direction rule), and a new `buildCatalogContextBlock()`
(`features/agent/prompt.ts`) injected into the system prompt — plus an
explicit guardrail forbidding external-platform course mentions and
requiring any `complete_course` recommendation to carry a real
`course_id` from that block. See ARCHITECTURE.md §4. Tested locally via
a direct authenticated call to `/api/agent` with the exact repro
message: the agent now names the real PMP course and links to its real
`/courses/{id}`, with no external platform mentioned.

**Profile expansion + deeper agent grounding (done, tested)**: a
separate, larger follow-on request, sized up-front before starting
(per the same discipline used for the earlier language-toggle
investigation) into six parts (أ-و); two were approved for this
session:
- **(أ) `profiles.age`/`gender`** (migration 016): a new onboarding
  step (5 steps now, was 4) collects both — `age` mandatory in the UI,
  both columns nullable at the DB level since `handle_new_user()`
  creates the row before onboarding runs. Flagged as tech debt
  (TECH_DEBT.md #11): a static integer freezes and never advances —
  `date_of_birth` is the real fix, deferred deliberately for now.
- **(ب) deeper agent grounding**: the agent's DNA context now also
  carries age, gender, and "reason for joining"
  (`profiles.onboarding_goal`, already existed, was just never wired
  in), plus **inferred** strengths/gaps from the caller's own
  `entity_skills` (no new free-text field — T2 forbids a score/claim
  without evidence). See ARCHITECTURE.md §4 for the exact mechanism
  and SECURITY.md for why no new RLS was needed. Verified with the
  *actual logged system prompt* sent to OpenAI for two real accounts,
  not just a code read — including the model's own reply switching to
  correct Arabic feminine grammar unprompted once `gender` entered its
  context.
- DOMAIN_CONTRACTS.md §10 (new): the "no official language-level
  equivalence" disclosure rule, added ahead of (ج)/(د)/(هـ) below so
  it exists before any UI references a language level.
- (ج) coin-wallet-backed language opt-in remains a separate future
  session; (و) needed no change. (د) and (هـ) are now both done — see
  below.

**Language task submissions (done, tested — migrations 017-018)**: a
separate, directly-commissioned piece of work, distinct from Task 2
below — each PMP module's existing `optional_language_task` content
(009 seed data, previously display-only) is now a real submission flow:
`LanguageTaskCard` → `POST /api/lms/language-task/submit` → charges
`coin_cost` via `spend_coins()` (007b) — **the first real call site for
that function anywhere in the codebase** — then routes the same
message through the existing `/api/agent` chat path for feedback, no
second OpenAI call site. A real bug (not a design change) was found and
fixed during this feature's own acceptance testing: an insufficient-
balance rollback silently no-opped because 017 shipped with no DELETE
policy at all; fixed in 018 with a narrowly-scoped DELETE policy (see
SECURITY.md and ARCHITECTURE.md §11 for the full account). Verified
live via REST with a real account's own JWT: correct debit (30→25),
real `coin_transactions`/`language_task_submissions` rows, the 409
duplicate guard, the 402 insufficient-balance path, the rollback fix
itself (orphaned row deletable, paid row permanently protected), and a
real agent feedback reply captured as evidence.

**Lesson player language toggle fix (done, tested)**: a real bug found
independently of any task above — the lesson player hardcoded `lang =
"ar"` with no toggle at all, so `lessons.translations.en` and
`toolbox_en` (both real, already in the 009 seed data) were completely
unreachable. Fixed by splitting the page into a thin server data-fetch
(`app/courses/[id]/lessons/[lessonId]/page.tsx`) and a new client
component owning a real `useLang()` + `LangToggle`
(`features/lms/components/LessonView.tsx`) — the same local-toggle
pattern already used in onboarding/auth/instructor forms elsewhere in
this codebase, not a new cross-app persisted-preference system (none
exists yet). `LessonCompleteButton` had the same bug one level deeper
(its own independent `useLang("ar")`, ignoring the page's toggle) and
was fixed the same way.

**TTS listening (د, done, tested)**: `shared/components/SpeakButton.tsx`
wraps the free browser `SpeechSynthesis` API — no external TTS call, no
coin cost, no audio storage. Wired into `LessonView`: a listen button
next to the lesson title always speaks the raw English title
regardless of the page's current AR/EN toggle; a second button next to
the lesson body only appears in EN mode.

**Grammar content (هـ, done, tested)**: all 18 PMP Level 1 grammar
points (migration 019), authored directly by the product owner from
each lesson's real topic/vocabulary — Claude Code's role was applying
and verifying, not writing the content. Same `lessons.content` jsonb
pattern as `module_closing`/`vocabulary`, no schema change. Rendered
via a new `GrammarPointCard` in `LessonView`; each English example gets
its own `SpeakButton`. `explanation_ar` is always Arabic regardless of
the page's toggle, deliberately — verified live that toggling to EN
switches the grammar point's title but leaves the Arabic explanation
unchanged. Verified all 18 lessons independently via REST (not just
the SQL editor's own per-statement feedback) both before migration 019
(`grammar_point` null everywhere) and after (present, correct
`title_en`, 3 examples, on every one of the 18 — and absent on the
three unrelated non-PMP lessons, confirming no `UPDATE` touched
anything outside its intended single row). This closes the English
language-development initiative for PMP Level 1 opened in this sprint.

**Lesson player improvements, batch 1 (done, tested — migration 021)**:
five items commissioned together after the language initiative closed.
- **Vocabulary pronunciation regression fixed**: the TTS pass wired
  listen buttons to the lesson title and body but not to each
  vocabulary word, even though its own notes called for it. Every word
  now has one, in either page language.
- **Title listen button** now speaks `localized.title` and appears only
  in EN. Recorded for accuracy: the original `lesson.title` behavior was
  the explicit spec at the time — this is a later product decision by
  the owner, not a regression being corrected.
- **Sticky language toggle** on the lesson page, so it stays reachable
  while reading (verified pinned at viewport top after scrolling to the
  page maximum).
- **Language choice now persists** across pages and reloads via
  `useLang` + localStorage, replacing per-page local state. See
  ARCHITECTURE.md §13 for the hydration-mismatch reasoning behind
  reading storage in an effect rather than during render. Side effect
  worth noting: this made `/profile`'s wallet panel start honoring the
  persisted language while its sibling panels (hardcoded `lang="ar"`)
  did not — TECH_DEBT #13 was rewritten to describe that real
  inconsistency instead of its now-inaccurate original framing.
- **Prev/next lesson navigation** across module boundaries
  (TECH_DEBT #12, now closed and removed).
- **Pronunciation practice** (migration 021): record yourself reading
  any English text on the page, listen back, and optionally pay 3 coins
  for agent feedback. Free and unlimited to record; the paid evaluation
  is repeatable without limit by design. The architectural constraint
  that shaped it — `SpeechRecognition` cannot transcribe a saved
  recording, so both captures must run simultaneously — plus the
  never-silent, never-charged failure handling and the no-audio-stored
  guarantee are documented in ARCHITECTURE.md §13 and SECURITY.md.

**Task 2 (done, tested — migration 020)**: real coin balance +
`WalletPanel` on `/profile` (`features/profile/`), with a
locally-simulated purchase flow for the 3 existing `coin_packages` via
a new `credit_coins()` security-definer function (mirrors
`spend_coins()`'s security shape in reverse — reads the coin amount
from `coin_packages` server-side, never from the client) called from
`POST /api/wallet/purchase`. `coin_packages` also gained a `name_en`
column so package names follow the same bilingual pattern as every
other user-facing table (see ARCHITECTURE.md §12 for why that branch
is correct but currently unreachable on `/profile`, TECH_DEBT.md #14).
Verified live: a real account's balance went 25 → 325 → 625 → 925
across three consecutive purchases, each producing its own real
`coin_transactions` row. **Explicitly not launch-safe as-is** — no rate
limit on repeat purchases, a real payment gateway must replace this
before real Beta traffic; see the dedicated launch-blocker section in
TECH_DEBT.md.

**Agent-led language layer, phase A — English placement (done, tested —
migration 022)**: the foundation for the owner's redirection of the
whole language layer (agent assesses, remembers, proposes; learner
decides). A one-time free English placement conversation with the
learner's own named agent: 5-8 friendly exchanges assessed from real
evidence (vocabulary, structures, errors), concluded by a fenced
```placement block (the ```rec pattern) that writes
`user_language_profiles` (level A1-C2 + Arabic summary, once-only via
PK) and `learner_notes` (durable facts, append-only) — the first real
cross-session agent memory; until now everything the learner said died
with the page. Both now feed the general agent's context on every
conversation (capped at 15 notes). Key engineering: the once-only
guard runs server-side BEFORE any OpenAI call (SECURITY.md); the
OpenAI client/retry was extracted to `shared/lib/openai.ts` and the
live `/api/agent` re-verified after the move; a forced-conclude nudge
at ~7 exchanges stops a chatty model outgrowing the design. Abandoned-
conversation OpenAI cost exposure documented as TECH_DEBT #15
(launch-blocker severity). Re-placement to a higher level is a
deferred owner decision, stated in the UI. Next phases build on this:
lesson suggestions by level, language-layer gating, the floating agent.

**Follow-up (done, tested, 2026-07-26)**, from the owner's own first
real conversation: (1) diagnosed a reported "your agent is unavailable"
error as a real client-side network failure (the dev server was down
mid-rebuild during a concurrent session), not a rate limit or model
failure — traced from the exact Arabic string, which only that catch
path in the code can produce. (2) Fixed the assessment steering: the
model was following the learner into pure Arabic small talk after a
single "I don't understand English" and never asking for more English
afterward, producing zero further assessment evidence — the prompt now
requires a small concrete English ask on every turn even after
switching to Arabic comfort, verified by replaying the exact reported
trigger phrase. (3) Relocated the placement card from the lesson page
to `/profile` as a general one-time introduction (`placementSlot`
removed from `LessonView` entirely, added to `ProfileView`), and
broadened its scope to explicitly ask about career path alongside
English level — verified live that a fresh account's stored facts now
include a real career-path fact ("يعمل في مجال المبيعات").

**Floating agent — parts 1-3 of 4 ✅ (2026-07-26).** Investigated
first (no code) at the owner's request, then sized into two pieces and
approved: the icon, the chat panel and the text button shipped
together; the voice call stayed deferred.

- Reachable from `/dashboard`, `/profile`, `/courses` and lesson pages,
  composed per page (owner's decision — no `app/` reorganization now;
  route-group alternative recorded as TECH_DEBT #16).
- **Never rendered for a signed-out visitor**, server-side, not hidden
  with CSS — verified by fetching the two public host pages with no
  cookies: zero occurrences of the widget markup in HTML that otherwise
  contained the full lesson.
- **Lesson-aware on lesson pages.** Only `lessonId` is sent; the route
  re-fetches the content under the caller's own RLS. Verified live on a
  real lesson: the agent named the exact lesson title, its grammar
  point, and all five vocabulary pairs — and, asked the identical
  question from `/profile`, correctly said it had no lesson details
  (server log `withLessonContext` true/false respectively).
- **RLS boundary proven with one variable changed**: the same account
  sending the same *locked* lesson id got no context before enrolling
  and full context after.
- New TECH_DEBT: #16 (per-page mounting), #17 (`ai_conversations` is
  written but never read — the agent forgets every conversation on
  reload, flagged by the owner as at odds with the "رفيق حقيقي"
  intent), #18 (a mid-page language switch doesn't reach the widget
  until reload — found during testing, not assumed).

**المرحلة (و) — كل درس صار له مهمة كتابة ✅ (2026-07-26, migration 023).**
المالك كتب 12 مهمة جديدة، واحدة لكل درس بقي بلا مهمة، كل واحدة تُدرّب
النقطة القواعدية ومفردات درسها تحديداً.

- **شكل ثانٍ للمهمة، لا نقل للقديم**: `content.language_task` في جذر
  `content` (أي درس، 3 كوينز) إلى جانب
  `content.module_closing.optional_language_task` الأصلي (الـ6 نهايات
  وحدات، 5 كوينز). الستة لم تُلمس — لا إعادة كتابة لبيانات سلّم عليها
  مستخدمون فعلاً. السبب دلالي: وضع الـ12 تحت `module_closing` كان
  سيُظهر بطاقة "لإنهاء هذه الوحدة" في دروس لا تُنهي شيئاً.
- `resolveLanguageTask()` واحدة يستخدمها القرّاء الثلاثة (صفحة الدرس،
  `LessonView`، ومسار التسليم الذي هو نقطة فرض السعر) فلا يختلفون.
- الـmigration **يتحقق من نفسه**: كتلة `DO` ترفع استثناءً ما لم يكن 12
  جديدة + 6 قديمة سليمة + **صفر ازدواج** — لأن `UPDATE` لا يطابق شيئاً
  ليس خطأً في Postgres (نفس صنف الصمت الذي أصلحه 018 للـ`DELETE`).
- **تحقق فعلي على الـ18 درساً كلها** عبر HTML المُقدَّم من الخادم بجلسة
  حقيقية: بطاقة مهمة واحدة بالضبط في كل درس، 3 كوينز على الـ12 و5 على
  الـ6، وبطاقة "لإنهاء هذه الوحدة" تظهر **فقط** على الـ6 (صفر على
  الـ12). والـ12 عرضت 12 نصاً مختلفاً — لا مهمة عامة مكررة.
- **تسليمان حقيقيان بحساب حقيقي**: المحفظة 30 → 27 → 22، أي **−3 على
  الشكل الجديد و−5 على القديم بالضبط**، مع صفَّي
  `language_task_submissions` بـ`coin_cost` 3 و5 ولقطتَي نص مختلفتين،
  وصفَّي `coin_transactions` مربوطَين بمعرّف كل تسليم.
- **بطاقة `AgentChat` الثابتة حُذفت من `/dashboard`** بقرار المالك بعد
  وصول الوكيل العائم (سطحان بسجلَّين منفصلين يربكان)، وحُذف معها
  `assistantSlot` من `DashboardView` بدل تركه prop لا يمرّره أحد.

**Task 3 / floating agent part 4 — real-time voice calls ✅ (migration 036).**
Sized before any code (six named parts أ-و, same discipline as the
profile expansion), and two of the sizing answers changed the design
before it was built:

- **No post-call metering exists.** Verified against OpenAI's live docs:
  no endpoint returns a completed call's duration or usage, and there is
  no `realtime.call.ended` webhook (only `realtime.call.incoming`, SIP
  only). A sideband monitor socket *does* exist
  (`wss://.../v1/realtime?call_id=...`) but needs a long-lived process
  this serverless deployment cannot host — the same constraint that
  ruled out a relayed WebSocket transport in favour of WebRTC.
- **The ephemeral token does not bound the call.** Its expiry gates
  *creating* a session, not continuing one, so it cannot enforce the
  5-minute cap. The first billing sketch assumed it could.

What shipped instead: charge the whole capped block up front, refund
unused whole minutes measured from **the database's own clock**, forfeit
if the end is never reported. No client-supplied number touches the money
path (027's rule). Model and cap are constants *inside*
`start_agent_call()` — a `p_model`/`p_cap` argument would be raised by
any caller through PostgREST (029's lesson). There is deliberately **no
generic refund function**: the amount is computed inside
`end_agent_call()` from a verified session, because a callable
`refund_coins(amount)` would be the coin-minting hole 027 refused to
write for points.

**Two real bugs caught before they shipped, both by testing rather than
reading.** (1) `Permissions-Policy: microphone=()` — an *empty
allowlist*, which denies the feature to our own origin — had shipped in
Sprint 1.5 and silently killed PronunciationPractice's (021) recording
path for its entire life; found while sizing this feature, fixed to
`microphone=(self)`, and 021 has now been confirmed working end-to-end
for the first time (TECH_DEBT #29). (2) Minting a Realtime session
without an `input.transcription` block echoes back `"transcription":
null` — user transcription is **off by default**, so the transcript pair
would never complete and voice memory would have failed silently with a
perfectly working call. Verified against the live API and fixed to
`gpt-4o-mini-transcribe`, which bills separately from realtime audio.

**Privacy is a charter matter here, not copy.** Voice is the only place
on the platform where a user's audio leaves their device, so the
existing "no audio ever reaches the server" guarantee was *scoped* to
pronunciation (still exactly true there) rather than weakened, and
DOMAIN_CONTRACTS §12 was added: disclosure before the first call, what
WOW stores, an explicit refusal to claim anything about OpenAI's
retention, a recorded **T8 limitation** (hard erasure reaches our rows
and the transcript, never audio a third party already received), and the
cap disclosed as unenforceable — the same treatment §8 gives
self-reported live-session attendance.

Voice turns enter the same `agent_messages` memory as text, marked
`source='voice'`. That is knowingly client-supplied text (033 removed
exactly this for the text path), bounded two ways: `record_agent_turn`
refuses a voice turn unless the caller has an ACTIVE session, and every
row carries its provenance.

**Verified live** (real charges, real OpenAI, owner's own browser and
microphone): a real WebRTC call connected, Marin spoke natural Arabic,
and a genuine `source='voice'` pair landed in memory. Across three full
call cycles plus a pronunciation charge and the welcome grant, the
wallet balance equalled the sum of `coin_transactions` **exactly** — no
ledger drift. Server-side: 409 on a second concurrent start, 402 with
`balance`/`required` when short, a normal 56s call billing 1 minute and
refunding 16, a 1s failed handshake refunding all 20 (`status='failed'`),
a voice turn refused after the call closed, and opening the disclosure
charging nothing at all. The first `type='refund'` row this codebase has
ever written.

**بنية تسعير مركزية + أول واجهة أدمن ✅ (2026-07-27, migrations 024-026).**

- **`pricing_units`** مصدر التسعير الوحيد، **حسب نوع الإجراء لا حسب الدرس**
  (تحقق حي في 023: كل مهمة عادية 3 وكل ختام وحدة 5، بلا استثناء عبر
  الـ18 درساً). `lessons.content->coin_cost` بقي في البيانات لكنه صار
  **غير معتمد** للعرض وللخصم — TECH_DEBT #22.
- **الصلاحية `finance.edit_rates`** الموجودة أصلاً في 003، لا `content.manage`.
  هذا حسم التناقض بدل توثيقه: RBAC.md يمنع `admin` صراحةً من "financial
  settings"، و`content_manager` (015a) دور ضيّق للمناهج. **لا صلاحية جديدة
  ولا تغيير على منح أي دور.**
- **سجل التدقيق في `audit_log` الموجود (003)** — هذه الدفعة أول كاتب حقيقي
  له منذ إنشائه. لا جدول منافس، مطابقةً لقاعدة RBAC.md نفسها.
- **`/admin/pricing`** أول واجهة أدمن على المنصة: صفحة واحدة مخصّصة الغرض،
  بلا هيكل إداري عام. الحارس الحقيقي في القاعدة (لا سياسة UPDATE على
  الجدول + الدالتان تفحصان الصلاحية)، والصفحة والمسار طبقة عرض فقط.

**🔴 ثغرة تصعيد صلاحيات حرجة اكتُشفت أثناء البناء وأُغلقت (025 + 026).**
سياسة `profiles` كانت عمياء تجاه الأعمدة، فأي مستخدم يمنح نفسه `admin`
بطلب واحد — **مُثبت حياً**، وكان يُبطل كل حارس صلاحيات على المنصة بما فيها
حوكمة المناهج في 015b/c. **025 وحده لم يعمل**: كتبتُ دالة الـtrigger
بـ`SECURITY DEFINER` فصارت `current_user` تُرجع مالك الدالة دائماً
والحارس يخرج قبل أي فحص — كُشف بإعادة الاختبار لا بقراءة الكود. **026**
أعاد إنشاءها `SECURITY INVOKER` مع كتلة تحقق ذاتي تفحص `prosecdef = false`.

**الأدلة الفعلية** (معايير القبول الستة، كلها بقراءات مستقلة من القاعدة):
الحارس يرفض `role`/`status`/`identity_verified_at` بـ**403/42501** والقيم
لا تتغيّر (كانت 204 وتتغيّر قبل 026)؛ التحديث المشروع ما زال 200؛ النقاط
سليمة (`0 → 10` بإكمال درس حقيقي)؛ تغيير سعر من الواجهة `3 → 7` كتب
`updated_by` وصفَّي `audit_log`؛ تسليم فعلي خُصم **7 لا 3**؛ فرع ختام
الوحدة ما زال يخصم **5** (المحفظة `22 → 15 → 10`)؛ حساب بلا صلاحية
يُرفض على الصفحة (بلا تسريب هيكل) وعلى الدالتين بـ403/42501.

**`points`/`level` ما زالا قابلين للتزوير مباشرة عبر PostgREST** — لم
يُقفلا عمداً لأن `awardPoints` يكتبهما عبر جلسة المستخدم، وقفلهما كان
سيكسر مكافآت الدروس والاختبارات. **TECH_DEBT #20 بدرجة مانع إطلاق.**

**إغلاق ثغرة points/level ✅ (2026-07-27, migration 027).**
آخر عمود من نفس عائلة 025/026. النقاط والمستوى لم يعودا قابلين للكتابة
من أي جلسة عميل، والدفع يمر عبر دالتَي `security definer` تتحقق كل واحدة
من **حدث حقيقي واحد** ولا تدفع مرتين (`award_lesson_points`،
و`award_quiz_points` من 013 **موسَّعة لا مفرَّعة** لتقبل المسار الآلي
أيضاً). **لم أكتب دالة عامة `award_points(reason)`** لأنها كانت ستصير
ثغرة أسوأ: سكّ 100 نقطة بالتكرار بدل ضبط رقم مرة واحدة.
`/api/points/award` أُحيل للتقاعد (410) — كان يثق بالسبب بلا أي تحقق من
وقوع الحدث، وبلا أي مستدعٍ.

**أدلة حية**: إكمال درس حقيقي `10 → 20`؛ أربع محاولات `PATCH` مباشرة
مرفوضة **403/42501** والقيم لم تتغيّر بقراءة مستقلة؛ إعادة استدعاء الدالة
لدرس مدفوع أرجعت `false` بلا تغيير؛ اختبار hybrid لم يدفع تلقائياً؛
ومسار المقيّم ما زال يدفع (حساب ثانٍ `0 → 20` على محاولة ناجحة فعلاً).

**🔴 ثغرة حرجة مفتوحة اكتُشفت أثناء هذا الاختبار**: مفتاح إجابات
الاختبارات (`quiz_questions.question->correct_index`) **مقروء لأي طالب
مسجَّل عبر PostgREST**. المسار يجرّده قبل الإرسال للمتصفح، لكن الطريق
المباشر يتجاوزه. أُثبتت عملياً: حساب اختباري قرأ الـ18 مفتاحاً وحصل على
**100%** واعتمدها مقيّم حقيقي. المراجعة البشرية ليست حاجزاً — المقيّم يرى
الدرجة فقط. **TECH_DEBT #25، مانع إطلاق لمنصة تُصدر شهادات.**

**إغلاق ثغرة مفتاح الإجابات ✅ (2026-07-27, migration 028).**
`correct_index` انتقل إلى `quiz_answer_keys` (RLS مفعّلة و**صفر سياسات**)
و**حُذف فعلياً** من `question` jsonb — فالعبارة «correct_index لا يُرسل
للعميل» صارت **خاصية بيانات لا خاصية مسار**. التصحيح انتقل إلى
`submit_quiz_attempt()` التي تقارن داخلياً وتُرجع الدرجة الإجمالية فقط
(لا تفصيل لكل سؤال، وإلا أمكن استنتاج المفتاح بمقارنة المحاولات)،
وتنقل التحقق من التسجيل وقاعدة المحاولة الواحدة إلى نفس معاملة الإدراج.

**أدلة حية**: قراءة مباشرة لـ`quiz_answer_keys` → `[]`؛ الأسئلة الـ18
تعرض `options,text` فقط؛ الالتفاف عبر join مضمَّن → `null`؛ إجابات صحيحة
عبر المسار الحقيقي → **100**؛ إجابات خاطئة → **0.00**؛ ومسار المقيّم
hybrid ما زال يدفع (حساب جديد `0 → 20` بعد الاعتماد، بينما بقي صاحب
الـ0% على صفر).

**إغلاق مانعَي إطلاق Beta ✅ (2026-07-29, migration 029 + مفتاح تعطيل).**

- **سقف دائم لمحادثة تحديد المستوى (#15)**: `placement_usage` عدّاد لكل
  مستخدم بسقف 40 رسالة عبر كل الجلسات وإعادات التشغيل. الفحص والزيادة في
  **عبارة SQL واحدة ذرية** (قراءة ثم كتابة كانت ستسمح لطلبين متزامنين
  بتجاوز السقف معاً)، و**السقف ثابت داخل الدالة لا معامل** لأن PostgREST
  يعرّض كل دالة عامة. الجدول بسياسة قراءة فقط وبلا سياسة كتابة — لا أحد
  يصفّر عدّاد تكلفته.
- **تعطيل الشراء المحاكى**: `/api/wallet/purchase` يرفض ما لم يكن
  `WALLET_SIMULATION_ENABLED === "true"`. **يفشل مغلقاً**، والفحص قبل
  قراءة الجلسة، والرد 503 لا 403.

**أدلة حية**: الرسالة الحقيقية رفعت العدّاد إلى 1 وأعادت رداً فعلياً (لا
انحدار)؛ الاستدعاء 41 أرجع `allowed:false` والعدّاد مثبَّت على **40 لا
41**؛ الطلب الحقيقي أرجع **429** مع `placement_quota_exhausted` وبلا
`placement_reply_sent`، **وبزمن ثابت 1.4 ثانية** عبر ثلاث محاولات دافئة —
أي رحلة Supabase وحدها، وهو دليل إيجابي على عدم استدعاء النموذج لا مجرد
غياب سجل؛ **وبعد إعادة تشغيل الخادم كاملاً** بقي العدّاد 40 والمسار يرفض.
وللشراء: بلا المتغير **503** والرصيد بقي 10 بلا أي صف؛ ومعه **200**
والرصيد `10 → 310` بصف `+300 simulated_purchase`.

**أساس الاختبارات الآلية + CI ✅ (2026-07-29) — بداية #6/#7 لا إغلاقهما.**

- **48 اختبار وحدة** (كان 4). المخططات مكتوبة حول ما **ترفضه** لا ما
  تقبله: سقوف التاريخ، رفض المعرّفات الفاسدة، **وتجريد الحقول المدسوسة**
  (`amount`, `coinCost`, `score`, `cap`) — لأن zod يُسقط المفاتيح المجهولة
  بدل رفضها، فالخاصية الأمنية هي غياب الحقل من الناتج لا فشل التحليل.
- **اختبار يقرأ `027` ويقارن ثوابته بـ`REASON_POINTS`** — يحوّل تعليق
  «حافظ على تزامنهما يدوياً» إلى فشل CI بدل دفع مبلغ خاطئ بصمت.
- **`clip` صار مغطى** — كانت TECH_DEBT #19 تسجّل أن سقوف الاقتطاع لم
  تُشغَّل قط على بيانات حقيقية.
- **CI عبر GitHub Actions**: `npm ci` → `tsc` → `lint` → `test` → `build`
  على كل push لـ`main` وكل PR إليه. `npm ci` لا `install` كي يفشل
  اللوكفايل غير المتطابق بصوت مسموع.

**🔴 الفجوة موثَّقة صراحةً ولم تُغطَّ**: RLS ودوال `security definer` —
أي بالضبط فئة الثغرات الأربع التي أُغلقت في 025-029 — **خارج تغطية CI
كلياً**، لأن لا مشروع Supabase اختباري منفصل عن الإنتاج. نجاح CI ليس
تغطية أمنية، وتبقى تلك الطبقة تحت قاعدة «أعد تشغيل الهجوم» اليدوية.

**شاشة الأساتذة — ربط ثنائي الاتجاه ✅ (2026-08-06, migration 040 — اختبار حي كامل).**

`instructor_profiles` (سعر بالكوينز + توفر) و`instructor_assignments`
(طلب من المتعلم أو دعوة من المدرّب، نفس شكل الصف، `price_coins` لقطة من
سعر المدرّب وقت الطلب). **هذه الجولة مخطط فقط — لا دفع فعلي ولا رسائل**:
لا `spend_coins()` مربوط بأي مكان هنا، ولا جدول رسائل موجود؛ الشاشة
الحالية (`InstructorsContent`) للقراءة فقط (تعرض الروابط القائمة، بلا
أزرار طلب/قبول فعلية بعد).

**أدلة حية (ثلاثة حسابات تجريبية: متعلم، مدرّب — مزروع صف
`instructor_profiles` له يدويًا عبر SQL editor، ومهاجم):**
- المتعلم يقرأ سعر المدرّب الحقيقي (20 كوينز) عبر سياسة "signed-in read" ✅.
- طلب المتعلم بالسعر الحقيقي → **201** ✅؛ نفس الطلب بسعر مزوَّر (1 بدل
  20) → **403/42501** ✅ (فحص `exists` ضد `instructor_profiles` الحي).
- المهاجم يحاول انتحال `learner_id` متعلم آخر في INSERT → **403/42501**
  ✅ (`learner_id = auth.uid()` في سياسة الإدراج).
- دعوة المدرّب للمتعلم (الاتجاه المعاكس) → **201** ✅.
- المهاجم يقرأ `instructor_assignments` وهو ليس طرفًا في أي صف →
  **مصفوفة فارغة** ✅ (سياسة "participants read").
- المدرّب يقبل طلب المتعلم (تغيير `status` فقط) → **200**، و`responded_at`
  انضبط تلقائيًا بالمشغّل ✅.
- **اختبار العبث الحاسم**: المدرّب يحاول قبول دعوته الخاصة **مع** تغيير
  `price_coins` إلى 999 في نفس الطلب → **403/42501**، الرسالة "Only
  status may change when responding to an assignment" ✅ — قراءة لاحقة
  أكّدت أن `price_coins` بقي 20 و`status` بقي `pending` (المشغّل رفض
  الصف كاملاً، لا تحديثًا جزئيًا).
- المتعلم يرفض دعوة المدرّب (تغيير `status` فقط) → **200** ✅.
- المهاجم يحاول الرد (قبول/رفض) على طلب المتعلم المقبول أصلاً وهو ليس
  طرفًا فيه → **مصفوفة فارغة، صفر صفوف تأثرت** ✅ (سياسة UPDATE's USING
  تستبعده تمامًا، لا حتى خطأ صريح)؛ قراءة لاحقة أكّدت أن الصف بقي
  `accepted` بلا أي تغيير.
- المهاجم يحاول انتحال هوية المدرّب (`instructor_id` حقيقي لكن
  `auth.uid()` هو المهاجم) في دعوة instructor-initiated → **403/42501** ✅.

**الفجوة المسجَّلة صراحة (ليست عطلاً، لم تُبنَ بعد):** لا مسار دفع فعلي
(`price_coins` قابل للقراءة/الاقتباس فقط)، ولا نظام رسائل بين الطرفين
بعد القبول. ينتظران قرار تصميم منفصل قبل البناء — غير مطروحين هنا.

**تراجع متعمد عن قفل الألعاب (النسخة العامة) ✅ (2026-08-06, migration 042).**

038 (ولاحقاً 039/040 أثناء اختبارها) بنى واختبر قفلاً صارماً في
`play_game()`: النسخة العامة (`variant='generic'`) من ألعاب المستوى
الأول كانت تُرفض بـ`'reason': 'quiz_not_passed'` ما لم يكن للمستخدم
محاولة اختبار ناجحة على اختبار المستوى 1 الختامي (`pmp_level=1 and
lesson_id is null`). كان القفل يعمل تماماً كما صُمِّم — **هذا ليس إصلاح
عطل ولا رجوعاً عن خطأ سابق**.

القرار تغيّر صراحة من المالك (Monzer) في جلسة 2026-08-06 ضمن دفعة إعادة
هيكلة التنقّل: الألعاب (النسخة العامة) تُفتح الآن **بلا أي شرط اجتياز
اختبار على الإطلاق**. التغيير الوحيد في `play_game()` (042) هو حذف كتلة
فحص `v_quiz_passed`/`quiz_not_passed` من فرع النسخة العامة — كل شيء آخر
(فحص ملكية المشروع لنسخة `project`، اختيار السيناريو، التسعير، خصم
المحفظة) منسوخ حرفياً من 038. الواجهة تبعت نفس القرار: `GamesHub.tsx`
و`ProjectGamesPanel.tsx` لم يعودا يستقبلان أو يفحصان `unlocked`/
`gamesUnlocked` — قسم الألعاب العامة يُعرض دائماً بلا شرط. `hasPassedLevel1FinalQuiz()`
(`features/games/services/game.service.ts`) بقيت موجودة (استعلام عام قد
يفيد شاشة مستقبلية) لكنها لم تعد مستدعاة من أي مكان.

**إذا وجدت جلسة مستقبلية الألعاب العامة مفتوحة بلا شرط اختبار وافترضت أن
قفل 038-040 انكسر بالخطأ: لم ينكسر. حُذف عمداً، هنا، بطلب صريح من
المالك. لا "تُصلح" هذا القفل دون قرار جديد وصريح من المالك.**

## Sprint 3.5 — المستوى 2 (Project Planning & Control) — بدأ (2026-08-06)

قرار معماري كامل موثَّق في `ARCHITECTURE_levels2-4_strategy.md`:
Knowledge-Base-first (قواعد قرار حتمية، بلا LLM حي) عبر المستويات 2-4،
مع بنية تحتية مشتركة تُبنى مرة واحدة وتتوسع لاحقًا (تفصيل §1 هناك).

**منجز حتى الآن:**
- `migration 043`: `career_score_types` (سجل مرجعي يحل محل CHECK ثابت
  على `career_scores.score_type` — إضافة طبقة DNA مستقبلية = INSERT
  بيانات لا migration؛ راجع DOMAIN_CONTRACTS.md §2d) + `project_wbs_items`
  (WBS هرمي حقيقي عبر `parent_id` ذاتي المرجعية، بمشغّل يمنع أب من مشروع
  مختلف أو تعيين الصف أبًا لنفسه). **مكتوب، لم يُشغَّل على Supabase
  المالك بعد.**

**لم يُبنَ بعد (الباقي من §1-§4 في البريف الأصلي):** محرك قواعد المعرفة
(`kb_scoring_rules` + دالة تصحيح security definer بلا سياسات، بنفس نمط
`quiz_answer_keys` من 028)، محرك السيناريوهات القابل لإعادة الاستخدام،
خدمة القوالب السردية (Project Story)، محتوى الوحدات الدراسية 0-7 +
Final Boss، لعبتا Resource Optimizer وEVM Simulator (تصميم أولي قيد
المراجعة مع Monzer قبل البناء الكامل)، مفاتيح تسعير جديدة في
`pricing_units`.

## Sprint 3.6 — لوحتا إدارة المحتوى (PMP + English) — Draft→Publish (2026-08-09)

بريف منفصل من Monzer بعد اكتمال المستوى 2 (migrations 037-061 مُختبَرة
حيًا بالكامل، Final Boss شاملًا). بحث أولي قبل أي كود كشف تصحيحين
جوهريين على فرضيات البريف الأصلي، اعتمدهما Monzer:

1. **لا يوجد دومين محتوى إنجليزي منفصل فعليًا** — `grammar_point` و
   `language_task` مفاتيح داخل `lessons.content` jsonb لنفس دروس PMP
   (migrations 019/023)، لا جدول قائم بذاته. اللوحتان
   (`/admin/content/pmp`, `/admin/content/english`) مسارا واجهة فقط
   فوق نفس البيانات ونفس الدور (`content_manager`) — لا صلاحية منفصلة
   ولا فصل حقول.
2. **`pricing_units` استُبعِد بالكامل** من نطاق اللوحة الجديدة —
   `RBAC.md:66-73` كان بالفعل رفض `content.manage` لتعديل الأسعار
   عمدًا (يفتح تحكّمًا ماليًا لدور مُصمَّم أضيق من كده). التسعير يبقى
   حصريًا على `/admin/pricing` الموجودة (`finance.edit_rates`، migration
   024) — مفيش مسار كتابة ثانٍ مكرِّر.

**منجز (migrations 062-063، مُشغَّلة فعليًا على Supabase المالك — تحقّق مباشر
عبر تدقيق 2026-08-15: `information_schema.tables`/`pg_proc` تؤكدان وجود
الكائنات، والمشروع تجاوزهما بـ11 migration كاملة إلى 074):**
- `content_drafts` + `publish_content_draft()`: مسودة/نشر عام لـ
  `kb_scenarios`/`kb_scoring_rules`/`badges` فقط (الجداول التلاتة اللي
  مفيهاش أي آلية مراجعة حالية) — يدعم إنشاء/تعديل/حذف، RLS مقفولة على
  `content.manage`، `published` status لا يُكتَب إلا عبر الدالة (062).
- سياسة قراءة جديدة ضيّقة على `kb_scoring_rules` لـ`content.manage` —
  كانت صفر سياسات عمدًا (046) لحماية مفتاح الإجابات من اللاعبين، لكن
  content_manager محتاج يشوف الدرجات/الملاحظات عشان يعدّلها.
- **فجوة أمنية حقيقية اتصلحت أثناء البناء**: `lessons` كان أصلاً عنده
  UPDATE مباشر غير مقيّد لـ`content_manager` (015b) — إعادة استخدام
  `review_status` وحدها ما كانتش هتمنع اختفاء درس حي وقت التعديل.
  الحل المعتمد من Monzer: عمود `draft_content jsonb` جديد + دالتا
  `save_lesson_draft()`/`publish_lesson_draft()` — تعديل درس منشور
  بالفعل يُكتَب في `draft_content` فقط، الدرس الحي يفضل زي ما هو لحد
  نشر صريح؛ درس جديد لسه مالوش نسخة منشورة يستخدم `review_status='draft'`
  البسيطة (مفيش حاجة حية تختفي أصلًا).
- **تسريب عمود مكتشَف ومُغلَق أثناء البناء**: RLS صفّي فقط — درس
  `approved` ظاهر للطالب أصلًا، فطلب REST مباشر لعمود `draft_content`
  كان هيرجّعه حتى لو كود الواجهة نفسه ما بيطلبوش أبدًا. الإصلاح:
  `revoke select (draft_content) on lessons from authenticated, anon`
  + دالتا `list_lessons_for_admin()`/`get_lesson_for_admin()` كمسار
  وحيد للقراءة (نفس نمط عزل `kb_scoring_rules`، لكن على مستوى عمود لا
  جدول كامل).
- واجهة: `/admin/content/pmp` (شجرة كورس→وحدة→درس + محرري
  kb_scenarios/kb_scoring_rules/badges) و`/admin/content/english` (نفس
  الشجرة، محرر مركّز على `grammar_point`/`language_task` فقط) — نفس
  نمط `/admin/roles` بالضبط (فحص `content.manage` سيرفري قبل أي بيانات،
  الحد الحقيقي في RLS/الدوال). محررات نصية بسيطة (JSON خام في textarea)
  حسب نطاق البريف §7 — بلا محرر غني.
- `npx tsc --noEmit` وE `npm run lint` وE `npm run build` كلهم عدّوا بلا
  أخطاء بعد البناء.

**لم يُنفَّذ بعد:** التحقق الحي الكامل (هجوم RLS على `content_drafts`
بحساب متعلم عادي، تدفق مسودة→نشر فعلي لسيناريو Final Boss أثناء محاولة
لعب حقيقية جارية — البند الصريح في §6 من البريف الأصلي).

## Sprint 3.7 — المستوى 3: التسليم والقيادة الرشيقة (Project Delivery &
## Agile Leadership) (2026-08-12)

بريف منفصل من Monzer بعد اكتمال لوحتي إدارة المحتوى (Sprint 3.6). بحث
أولي قبل أي كود كشف ثلاثة تصحيحات على فرضيات البريف الأصلي (خدمة
القوالب السردية كانت مؤجَّلة فعليًا من مستوى 2، لا مبنية كما افتُرض؛
`dna_layer` موجود على `career_score_types` فقط لا `career_scores` نفسه؛
ميثاق الشفافية T1-T9 لا ينطبق تلقائيًا على كيان غير فردي) — اعتمد
Monzer الحلول الثلاثة (نطاق أضيق للقوالب السردية، توحيد Organizational
DNA مع تصميم Team Memory، إعفاء T1-T9 مع الإبقاء على RLS العادية) قبل
أي بناء.

**منجز ومُختبَر حيًا بالكامل (تحقّق مباشر عبر تدقيق 2026-08-15:
`information_schema.tables`/`pg_proc` + استعلامات مباشرة على صفوف
`modules`):**
- **نظام Entity Memory (064)**: أول حالة عبر-الدروس/عبر-الجلسات دائمة
  في المنصة — `entity_memory_states`/`entity_memory_events` +
  `apply_entity_memory_event()` (كيان `character`/`organization`/`board`،
  تصفير عند 0-100، قيمة محايدة 50 افتراضيًا). RLS: المالك أو
  `audit.read` يقرأ فقط؛ صفر سياسة كتابة — الدالة وحدها الكاتب.
- **محرك القوالب السردية (065)**: `narrative_templates` +
  `render_narrative_text()`/`render_narrative_document()` — موصول فعليًا
  بأول قالبين فقط (نطاق المرحلة 1 المعتمد): Decision Log وEvidence
  Report، مبني على بيانات حقيقية من `decision_log`/`skill_evidence`.
- **ثماني وحدات عادية كاملة (0-7)، migrations 066-073**: Delivery
  Kickoff · Agile Mindset & Scrum Leadership · Sprint Planning &
  Execution · Team Leadership & EI · Stakeholder Communication · Hybrid
  Project Delivery · Monitoring & Continuous Improvement · Project
  Recovery & Crisis Leadership. كل وحدة: محتوى ثنائي اللغة كامل +
  سيناريوهي قرار Entity Memory على الأقل، مُختبَرة حيًا (RPC مباشر
  بحسابات اختبار جديدة + نقر فعلي عبر الموقع المنشور) قبل اعتبار كل
  وحدة منتهية، بلا استثناء.
- **جسر `decision_log` (070)**: علامة `log_decision: true` اختيارية لكل
  سيناريو — عند تفعيلها، `submit_lesson_entity_decision()` تكتب صفًا
  حقيقيًا في `decision_log` (نفس آلية استرجاع `project_id` المتّبعة في
  `render_narrative_document`، غير معطِّلة لو المتعلم بلا مشروع بعد).
  مفعَّلة على الوحدتين 2 و4 رجعيًا زي ما قرر Monzer، ثم 5-7 عند البناء
  — قرارات مشروع حقيقية فقط، لا سيناريوهات علاقات/ذكاء عاطفي.
- **شخصيات وكيان تنظيمي متسقان عبر كل الوحدات**: Sarah (قائدة الفريق)،
  Ahmed (مطوّر Backend، ظهر أول مرة الوحدة 3)، المجلس التنفيذي الخمسة
  (CEO/CFO/CTO/Sponsor/Ops Director)، وكيان `organization/org` بمقياس
  `org_planning_maturity` — التراكم عبر الوحدات (لا إعادة تصفير) تأكد
  حيًا بأرقام مطابقة تمامًا في كل وحدة.

**فجوة صريحة — آخر ما ينقص المستوى:** **Final Boss (Mega Delivery
Simulation) لم يبدأ إطلاقًا.** لا migration، لا محرك سيناريوهات، لا صف
module بعنوان يحتوي "Final Boss" أو "Mega Delivery" مربوط بدورة
المستوى 3 — تأكّد بالفحص المباشر (استعلام مباشر على `modules`، صفر
نتيجة) وقت تدقيق 2026-08-15، لا بالتخمين.

**تسليم الأستاذ — الطبقة الخلفية فقط (migration 040 + 074)**: **القاعدة
امتدت، لا الشاشة.** migration 074 بنى وطبَّق على الإنتاج ثلاث دوال
كاملة: `accept_instructor_assignment()` (دالة جديدة ضيّقة النطاق تُضمِّن
منطق `spend_coins()` الداخلي دون لمسها أو مناداتها بـ`p_user` مختلف عن
`auth.uid()`، لأن كل مواقع نداء `spend_coins()` السبعة الحالية — وفحصها
الداخلي نفسه — تفترض أن المنادي هو الدافع دائمًا، وهو غير صحيح هنا:
الأستاذ يقبل، الطالب يدفع)، `send_instructor_message()` على
`instructor_messages`، و`rate_instructor()` على `instructor_ratings`
(نفس نمط `agent_messages`: صفر سياسة INSERT، دالة واحدة فقط تكتب لكل
جدول).

**الواجهة لم تُبنَ إطلاقًا.** تحقّق مستقل بعد دفع 074 (`git grep
accept_instructor_assignment -- "*.ts" "*.tsx"`، وكذلك
`send_instructor_message` وE`rate_instructor`) رجّع **صفر نتيجة** في
الثلاثة — لا استدعاء واحد لأي من الدوال الثلاث في أي ملف `.ts`/`.tsx`
بالمستودع. شاشة `/instructors`
(`features/instructors/components/InstructorsContent.tsx`) تستدعي
`getMyInstructorLinks` فقط وتعرض الروابط القائمة — بلا زر قبول، بلا
مراسلة، بلا تقييم. الأستاذ والمتعلّم لا يستطيعان اليوم القبول أو
المراسلة أو التقييم من المنصة؛ القدرة في القاعدة، ولا باب لها في
الواجهة.

**الاختبار الحي غير ممكن حاليًا، لا مؤجَّل بل محجوب** — لا توجد أزرار
تستدعي الدوال الثلاث ليُختبَر مسارها عبر واجهة حقيقية. البناء التالي
المطلوب: شاشة قبول/رفض تستدعي `accept_instructor_assignment()` مع
عرض السعر وتحذير الخصم قبل التأكيد، محادثة تستدعي
`send_instructor_message()` بنمط `AgentChat.tsx`، وتقييم يستدعي
`rate_instructor()` بعد اكتمال التسليم — ثم اختبار حي بحسابين حقيقيين
منفصلين (أستاذ + متعلّم) قبل اعتبار البند مغلقًا.

**ثغرة تجاوز دفع حرجة اكتُشفت وأُغلقت قبل بناء الواجهة (migration 075،
2026-08-15)**: أثناء قراءة 074 استعدادًا لبناء الواجهة، تبيّن أن سياسة
UPDATE من 040 كانت لسه تسمح لأي طرف بـ`PATCH` مباشر يحوّل `status` إلى
`'accepted'` **بلا أي خصم** — مسار موازٍ يتجاوز
`accept_instructor_assignment()` بالكامل. 040 كانت صحيحة وقتها (مفيش
مسار دفع أصلًا)، و074 أضافت الدالة لكن نسيت تضييق السياسة. **غياب
الواجهة نفسه هو ما أخفى الثغرة** — مفيش استدعاء واحد لأي من الدوال
الثلاث، فلا المسار الصحيح ولا التجاوز اتنفّذ من أي مستخدم. 075 ضيّقت
`WITH CHECK` إلى `'declined'` فقط، فبقيت الدالة الباب الوحيد لـ
`'accepted'`. **تحقّق بإعادة تشغيل الهجوم الأصلي بحسابين حقيقيين
منفصلين**: قبل 075 رجّع الهجوم **200** والحالة صارت `accepted` والرصيد
30 بلا تغيير وصفر `coin_transactions`؛ بعد 075 رجّع **403/42501**
والحالة بقيت `pending`. الانحدارات الأربعة سليمة (الرفض المباشر،
الخصم الصحيح عبر الدالة 20→10 بصف مطابق، رفض الطرف الثالث بالمسارين).
التفاصيل الكاملة في `SECURITY.md` وE`TECH_DEBT #35`.

**القرار المتَّخذ (migration 076، 2026-08-15): اتجاه واحد فقط — الدارس
يدعو الأستاذ، والأستاذ لا يدعو.** القرار المفتوح الذي خلّفه 075 حُسم
صراحةً من المالك بالخيار (2): إلغاء اتجاه الدعوة من الأستاذ، **وعدم**
بناء `learner_accept_instructor_invite()`.

> **إن وجدت جلسة مستقبلية أن `initiated_by='instructor'` مدعوم في
> الـschema وبلا مسار قبول — فهذه ليست فجوة ولا انحدارًا ولا عطلًا.**
> الاتجاه **نموذج خاطئ أُبطل عمدًا** في migration 076 بقرار صريح من
> المالك: **الأستاذ لا يدعو، الأستاذ يُدعى.** الدارس هو من يطلب شرحًا
> لجزء يحتاج فيه عمقًا أكبر. **لا "تُصلح" هذا بإضافة مسار قبول للدارس،
> ولا بإحياء سياسة الدعوة، دون قرار جديد وصريح من المالك.** العقد
> الملزم في `DOMAIN_CONTRACTS.md §14`.

**كيف نُفِّذ (076):** إسقاط سياسة INSERT `"Instructor assignments:
instructor invites"` + قيد `check (initiated_by = 'learner') not valid`.
**السياسة كانت قائمة فعلًا وأُسقطت فعلًا** — الدليل الوثائقي: `040:117`
تنشئها صراحةً، وفحص 040 الذاتي (`040:186`) يشترط **بالضبط 4** سياسات
ونجح، وفحص 075 (`075:81`) يشترط **بالضبط 4** ونجح قبل 076 مباشرة،
والعدد الآن **3**. (ملاحظة منهجية: سياسات RLS لنفس الأمر تُدمَج بـ**OR
لا AND** — فوجود `initiated_by='learner'` داخل `WITH CHECK` لسياسة
"learner requests" ما كان يمنع الاتجاه المعاكس طالما سياسة الدعوة قائمة
بجواره تسمح به استقلالًا.)

**قيد الـCHECK هو الحاجز الحقيقي، لا الاحتياطي** — `relforcerowsecurity`
= `false` على الجدول، أي أن مالك الجدول وأي دالة `SECURITY DEFINER`
يتجاوزان RLS بالكامل (نفس فئة الكاتب التي أنتجت ثغرة 075). **مُثبَت
حيًا**: إدراج بصلاحيات المالك (RLS لا يُطبَّق عليه) رُفض بـ**`23514`
check_violation** باسم `instructor_assignments_learner_initiated_only`
صراحةً — وهذا الاختبار وحده هو الدليل المنسوب لـ076 حصرًا، لأن رفض
مسار العميل (42501) لا يمكن نسبته لـ076 بعد تطبيقه (حالة "قبل" اختفت،
والدليل عليها وثائقي كما أعلاه لا تجريبي).

**تعايش قيدين على العمود — مقصود:** `..._initiated_by_check`
(`IN ('instructor','learner')`، VALID، من 040) و`..._learner_initiated_only`
(`= 'learner'`، NOT VALID، من 076). كلاهما يجب أن يمرّ والأضيق يحكم؛
مذكور صراحةً حتى لا يرى قارئ الأول وحده فيستنتج أن الاتجاه مسموح.

**صف قديم واحد مُبقًى عمدًا:** `e7119ffc-...`، `declined` (نهائية)،
بصفر معاملات/رسائل/تقييمات، من جولة اختبار 040 نفسها. لم يُحذف — نفس
قرار #22/#28 بعدم تشغيل migrations مدمّرة على بيانات حية. وهو سبب
`NOT VALID`. (تبعة مقبولة: الفحص الذاتي في 076 يشترط وجود صف واحد
بالضبط، فسيفشل لو حُذف لاحقًا — مقبول لأن الـmigration تُشغَّل مرة واحدة.)

**انحدارات مُختبَرة حيًا بعد 076:** طلب الدارس العادي **201**
(`initiated_by=learner`) · `accept_instructor_assignment()` تخصم صحيحًا
(الرصيد **10 → 0**، وصف `coin_transactions` بـ`ref_id` مطابق للطلب) ·
الرفض المباشر يعمل (`declined`) · **وإصلاح 075 ما زال صامدًا** (PATCH
مباشر إلى `accepted` مرفوض **403/42501**، الحالة تبقى `pending`).

**ملاحظة تشغيلية بنيوية (اكتُشفت أثناء تدقيق 2026-08-15، يحتاجها كل من
يأتي بعدك):** هذا المشروع **لا يملك جدول تتبّع ترحيلات مُفعَّلًا** —
كل migration من الأول نُفِّذ يدويًا بلصق SQL في محرر Supabase مباشرة،
لا عبر `supabase db push` أو أي آلية مُتتبَّعة. `list_migrations` على
مشروع Supabase الفعلي يرجّع قائمة فاضية دائمًا، بصرف النظر عن عدد
الملفات الحقيقي في `supabase/migrations/`. **الطريقة الوحيدة الموثوقة
لمعرفة آخر migration مُطبَّق فعليًا هي فحص الكائنات مباشرة** —
`information_schema.tables`/`information_schema.columns` للجداول،
`pg_proc`/`pg_get_functiondef()` للدوال، واستعلام مباشر على الصفوف
الفعلية لمحتوى مثل وحدات المناهج — لا الاعتماد على رقم آخر ملف موجود
في المستودع ولا على أي جدول تتبّع.

## Sprint 4 — Jobs
## Sprint 5 — Employer Portal
## Sprint 6 — Gamification (expand beyond current points/level/badges)
## Sprint 7 — Subscriptions
## Sprint 8 — Analytics
## Sprint 9 — Security & Performance hardening
- Security headers, admin RLS policies actually applied, CSP.
- Caching pass, `loading.tsx` everywhere, bundle audit.

## Sprint 10 — Testing & Documentation
- Introduce testing (unit + integration + at least smoke e2e) —
  currently zero test coverage by design, tracked as TECH_DEBT #6.

---

**Immediate ask:** approve Sprint 2 scope above (LMS + the feature-based
restructuring as its first task) before implementation starts.

---

## رؤية استراتيجية كبرى — Grand Strategic Vision

**Documentation only — no sprint number, no committed order, no code.**
These are long-term product directions the owner wanted captured while
still fresh, kept deliberately separate from the committed Sprint N plan
above. Nothing here changes the current sprint order; nothing here is a
promise of when (or whether) it gets built. Each one is written as "why
this matters and how it would connect to what already exists," not as an
implementation plan — that design pass happens if and when one of these
is actually prioritized.

### 0. WoW Research Lab — وحدة أبحاث السوق وذكاء العملاء

**موثَّق بالكامل في ملف مستقل: [`RESEARCH_LAB_STRATEGY.md`](RESEARCH_LAB_STRATEGY.md)**
— اقرأه هناك بدل إعادة شرح السياق في أي جلسة قادمة.

الخلاصة: وحدة أبحاث تعمل قبل الإطلاق وبعده وتصبح لاحقاً أساس CRM
وCustomer Success. **القرار المتَّخذ ليس بناءها الآن**: الحملات الأربع
الأولى تُنفَّذ عبر أدوات جاهزة **خارج المنصة بصفر كود** (المرحلة صفر)،
ولا يُبنى أي جدول داخل المنصة قبل أن تُظهر بيانات حقيقية حاجة متكررة له
(المرحلة 1، نسخة مصغَّرة)، وتبقى طبقة الذكاء الاصطناعي وNPS/CSAT/CES
والمقابلات وCustomer 360 للمرحلة 2 — تباعاً وبإثبات حاجة لكل طبقة.

يحمل أيضاً **قراراً سياسياً معلَّقاً**: إخطار المشاركين الضيوف بأن
بياناتهم قد تُربَط لاحقاً بحساب يُنشئونه — ينضم لقائمة القرارات غير
الهندسية المعلَّقة (القاصرين، الشريك المرخّص، الاستشارة القانونية).

**لا عمل برمجي مجدول.**

### 1. الشبكة الاجتماعية المهنية — Professional Social Network

WOW already has the core building blocks for this — a per-user Career
DNA, `entity_skills`/`skill_evidence`, active capabilities, an agent that
reads full DNA context — but all of it is single-player today: a user
only ever sees their own `/profile` page. A social layer would let a
user's Career DNA become *discoverable to others* (colleagues,
instructors, classmates, potential employers), always opt-in and scoped
through the existing per-org consent model (DOMAIN_CONTRACTS.md T3/T7)
— never automatic, never a blanket "public profile" toggle. Concretely,
this could mean: consent-gated public/semi-public profile pages; a real
achievements feed (course completions, certificates, live-session
participation) peers can see; connecting with instructors or classmates
met through a shared course (the new invite-code personal courses and
live sessions are natural on-ramps for this); and endorsements tied to
real `skill_evidence` rather than the generic, credibility-free
"recommendations" that devalued this feature on other platforms. This is
the highest-leverage of the three visions below because it compounds —
every course, badge, and live session the platform already produces
becomes distribution fuel for the platform itself, instead of a dead end
at a profile page only its owner ever opens. It also carries the
platform's highest privacy stakes, so any real design pass must start
from the Transparency & Privacy Charter (T1–T9) already binding in
DOMAIN_CONTRACTS.md, not have consent bolted on afterward.

**Peer-to-peer communication — talking to a fellow learner (added
2026-08-02).** Everything sketched above is one-directional: it makes a
learner *visible* to others but gives them no way to actually talk. The
missing layer is communication — messaging, and eventually calling, a
classmate or colleague met through a shared course. Two on-ramps already
exist: invite-code personal courses (3.2) and live sessions already put
real people in the same room, and 036 shipped a working browser-to-browser
WebRTC stack, so the *transport* problem for learner-to-learner calls is
substantially solved in a way it was not when this section was first
written. What is emphatically **not** solved is everything that matters
more — who may contact whom and how that is revoked, blocking and
reporting, and the content-moderation duty that arrives the instant users
can send each other free text. Those are the same T1–T9 prerequisites
this section already flags, except messaging raises them harder than a
public profile does: a profile leaks information, a message channel
invites harassment, and the platform owns the consequences of both.
**Sequencing note:** this belongs after Phase 3 (follow) below, not
alongside it — "who is allowed to message me" is answered most naturally
by an existing connection, rather than by inventing a second permission
model just for messages.

## خطة التدرج المعتمدة (4 مراحل، كل واحدة بوابة قبول مستقلة)

القرار المعتمد: تدرج في كل المراحل — النشر والتفاعل والإعلانات. لا
انتقال لمرحلة إلا بعد اختبار Beta ناجح للمرحلة السابقة لها (نفس معايير
TESTING_POLICY.md).

### المرحلة 1 (فورية): الهوية البصرية فقط ✅ منفَّذة
مصدر التصميم: wow-reimagined-sparkle.lovable.app (نموذج Lovable
اعتمده المالك جزئياً). يُطبَّق: الألوان، الطباعة، أسلوب "Editorial"
التحريري، صياغة النصوص التسويقية. لا وظائف اجتماعية، لا جداول جديدة،
لا تغيير على أي منطق تطبيقي قائم.

**نُفِّذت على `/` فقط** (الصفحة العامة قبل تسجيل الدخول) — لا تغيير على
أي مسار خلف تسجيل الدخول: عنوان Hero وفقرته أُعيدا صياغتهما بلمسة
تحريرية أكثر ثقة (شريط الفئات السبع كما هو، بلا تغيير وظيفي)، وقسم
إحصائية جديد وصادق — "قيد القياس" بدل رقم وهمي، حتى تتوفر بيانات Beta
حقيقية. النظام اللوني الأساسي لـWOW (كحلي `#0B1E4D` + برتقالي
`#F2841C`) لم يتغيّر، فقط أسلوب العرض. اختُبر بصريًا محليًا + فحص
انحدار على `/dashboard` (بلا تأثر).

### المرحلة 2 (بعد اختبار المرحلة 1): تفاعل بسيط
زر "إعجاب" (like) على محتوى موجود أصلاً في النظام فقط (شهادة، مهارة
موثّقة، إنجاز مستوى) — ليس منشورات حرة ولا خلاصة أخبار. جدول واحد:
content_likes(user_id, target_type, target_id). يحتاج قرار خصوصية
صغير: هل الإعجاب مرئي للجميع أم للمستخدم فقط؟

### المرحلة 3 (متوسطة المدى): متابعة بسيطة
"متابعة" مستخدم آخر — بلا خلاصة أخبار تلقائية بعد، فقط قائمة
"من أتابع" في البروفايل. يتطلب حسم صغير من T3/T4: هل المتابعة تكشف
الاسم فقط أم بيانات مهنية إضافية؟

### المرحلة 4 (بعيدة المدى): Feed كامل + إعلانات حقيقية
هذه هي الرؤية الكاملة الموثقة أعلاه بأنظمتها الستة (منشورات، شبكة،
خلاصة، إشعارات، إشراف، خصوصية اجتماعية) + المحتوى الممول/الإعلانات.
تُبنى فقط بعد نضج قاعدة مستخدمين حقيقية كافية (لتجنب "خلاصة فارغة").

قاعدة ملزمة: لا ننتقل لمرحلة إلا بعد اختبار Beta ناجح للمرحلة السابقة
لها (نفس معايير TESTING_POLICY.md).

### 2. بيئة الفريلانس الوسيطة — Freelance Intermediary Environment

The `freelancer` and `client` capabilities already exist in
`user_capability` (003), and the workforce-outsourcing domain (Sprint
2.2 — `workforce_contracts`, `placements`, `guarantee_terms`) already
proves out the "platform as trusted intermediary" legal/product pattern
for full-time placements guaranteed by a licensed `workforce_partner`
org. A freelance intermediary environment would apply that same
trust-intermediary thesis to project-based work instead: a client posts
a scoped project, freelancers — whose Career DNA and skill evidence are
already verifiable through the LMS/assessor pipeline — bid or get
matched, the platform mediates through delivery (and potentially escrow,
once real payment-gateway work happens — currently deferred to Sprint
7), and the resulting review feeds back into the freelancer's Trust
Score the same way `placement_reviews` already does for outsourcing.
Worth treating as its own domain design rather than a sub-item of Sprint
4's Jobs line: full-time matching and freelance project mediation have
materially different trust/dispute/payment shapes — a job match ends in
an employment contract that exists outside the platform, while a
freelance project needs the platform itself to mediate delivery,
payment, and disputes for the entire lifecycle. When this is
prioritized, the right starting point is reusing the outsourcing
domain's legal/guarantee patterns, not inventing new ones from scratch.

### 3. تطبيق الموبايل — Mobile App

Everything shipped so far is a responsive Next.js web app with no native
mobile presence. This starts to matter most once two things are true:
(a) live sessions are actually seeing regular use — joining a live class
from a laptop is real friction both instructors and students hit
immediately — and (b) the agent and platform notifications need to reach
a user outside an open browser tab (an assessor's quiz approval, a live
session starting in 10 minutes, a new course invite). There are two
architecturally distinct paths worth deciding between when this is
prioritized, and this section exists mainly to name that fork so it
doesn't have to be rediscovered from scratch later:
- **A thin wrapper** (e.g. Capacitor, or a PWA install path) reusing the
  existing Next.js app almost entirely — fastest to ship, weakest at
  real push notifications and true offline lesson access.
- **A genuinely native/React Native client** sharing only the Supabase
  backend and existing API routes — slower to build, but the only real
  path to reliable push notifications for live-session reminders and
  true offline course content, which is a real value proposition for the
  platform's underlying "reach people wherever they're learning" thesis.

No decision is made here — this section only records that the question
exists.

### 4. تجربة التغذية الراجعة لتقييم النطق — Pronunciation Feedback UX

Two improvements to the paid pronunciation evaluation (021), both
surfaced by *using* the feature rather than reviewing it — the owner hit
them while live-testing after the microphone fix (TECH_DEBT #29) made
that path reachable for the first time.

- **(a) Structure the correction instead of narrating it.** The agent's
  word-accuracy feedback currently returns as one dense paragraph —
  observed live, a five-point correction list buried in prose. A
  per-word or per-phrase list would let a learner see at a glance which
  words they missed, which is the entire point of the purchase.
- **(b) Stop it being a dead end.** Today the feedback is a message the
  learner reads and cannot reply to. Letting them continue the
  conversation about that specific evaluation — an "ask your agent about
  this" affordance that opens the existing chat seeded with the
  evaluation context — turns a one-shot verdict into coaching.

How it connects to what exists: (b) is mostly plumbing, not a new
mechanism — `PronunciationPractice` already routes through `/api/agent`,
so the work is carrying the evaluation into `agent_messages` as context
rather than discarding it. (a) needs the model to return something
parseable alongside its prose, and the ` ```rec ` fenced-block pattern
in `features/agent/prompt.ts` is the existing precedent for exactly that,
including the "strip it before display" handling.

One constraint any design must respect, already documented in 021 and
SECURITY.md: **the agent receives a transcript, never audio.** So a
structured result may describe word accuracy only — never accent, never
pronunciation quality — and presenting it as anything more would collide
with DOMAIN_CONTRACTS §10's rule against implying a language assessment
we cannot actually make.

### 5. جلسات مدرّبين بشريين مباشرة عبر Zoom — Live Human Trainer Sessions

A paid offering where a learner books a real-time video call with an
available human trainer — English coaching, or PM/management coaching —
charged in coins like every other paid action on the platform.

This is the first entry in this document that needs a **real human
staffing model** behind it, not only software: trainer recruitment,
vetting, availability, and payout are the substance, and the scheduling
UI is the easy part. The workforce-outsourcing domain (Sprint 2.2 —
`workforce_contracts`, `placements`, payout and guarantee patterns) is
the closest existing precedent and is probably the right thing to reuse
rather than inventing a parallel model for trainers.

What already exists to build on: `live_sessions` /
`live_session_attendance` (014) already model a scheduled session with a
meeting link and an attendance record; `pricing_units` (024) would take
one new entry; and the wallet path (`spend_coins`, 007b) is unchanged.

**The hard problem is billing, and 036 just taught the exact lesson that
applies.** Voice calls could not be metered by the platform because the
platform was not on the media path — OpenAI exposes no post-call usage
lookup and no call-ended webhook, so the design had to become "charge a
bounded block up front, refund the unused remainder from the server's own
clock, and disclose the cap as unenforceable." A Zoom session has the
identical shape: WOW is not inside the call and cannot independently
verify that it happened, how long it ran, or whether the trainer showed
up. This also **raises an existing accepted caveat into a real problem**
— DOMAIN_CONTRACTS §8 already records that live-session attendance is
self-reported and verified by no meeting provider, which is tolerable
while sessions are free and becomes untenable the moment coins change
hands for them. Any design pass must answer, before writing a schema:
what can actually be verified (Zoom's own APIs do report participant
join/leave, unlike the Realtime API — that is the key difference worth
checking first), what must be disclosed as unenforceable, and who
absorbs a no-show on either side.

Also unresolved and worth naming now: the Zoom integration shape (Meeting
SDK embedded in the app vs. simply generating a scheduling link — a
build-vs-link decision with very different costs), cancellation and
refund policy (036 built the codebase's only refund path, so there is now
a pattern to follow rather than invent), and whether trainers are
platform staff, contractors, or a third category the RBAC model does not
yet have.

### 6. سوق كوتشات حقيقيين — `#coach-marketplace`

Raised while sizing the Living Project foundation (037): the owner wants
a trainee able to pay coins for a **real human coach** to follow them on
their own project specifically — not a generic booked session, ongoing
mentorship tied to one project's lifecycle. Explicitly out of scope for
037 and recorded here as its own named backlog item per the owner's own
instruction, not folded into §5 above even though the two overlap
substantially: both need a coach/trainer identity in RBAC, a matching
mechanism, and a real-time or async communication channel. §5 is
general-purpose paid coaching sessions (English, PM/management, booked
ad hoc); this is coaching **scoped to a specific Living Project** — closer
in shape to how `placement_reviews`/`workforce_contracts` (Sprint 2.2)
already track a real relationship over time than to a one-off booking.
When this is prioritized, a real sizing pass needs at minimum: a `coach`
capability/role addition to the existing RBAC model (RBAC.md), a
trainee↔coach matching mechanism, some scheduling/session-tracking shape,
and a decision on whether coaching happens inside the project workspace
(seeing the charter, business case, decision log directly) or through a
separate channel — the former is far more valuable given everything 037
just built for a coach to actually look at, but also raises a real access-
control question (a coach reading a trainee's project is not the trainee's
own RLS-scoped read, so it needs its own policy, not an extension of the
owner-only ones 037 shipped). This deserves its own execution brief the
same way 037 got one, not an extension bolted onto either 037 or the
Level-1 games task.

### 7. تسعير ديناميكي بالذكاء الاصطناعي — `#dynamic-ai-pricing`

Raised while resolving the Level-1 games pricing decision (10
`pricing_units` keys, one per game × variant, all editable from
`/admin/pricing`): the owner wants a future mechanism where those coin
prices (and other `pricing_units` rows — `new_project`, `pronunciation_practice`,
etc.) adjust themselves via an AI/model-driven process instead of a human
manually editing the admin table — e.g. reacting to demand, completion
rates, or some other signal not yet defined. Explicitly out of scope for
the games task or any current migration; no schema, cron job, or pricing
logic should be built for this now. `pricing_units` already being a
single central table with no hardcoded prices in code (024, extended by
036/037) means a dynamic-pricing job would have exactly one place to
write to when this is eventually prioritized — but the actual design
questions (what signal drives a price change, how often, bounded by what
floor/ceiling so a bad run can't price a feature out of reach, who
approves or reviews an automated change before it goes live) are entirely
unresolved and need their own brief, not a guess baked in here.
