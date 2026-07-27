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

**Task 3 / floating agent part 4 (deferred to its own future session,
by explicit product decision)**: real-time voice chat via the OpenAI
Realtime API, on the same DNA+catalog grounding as Task 1, with
per-minute `spend_coins()` billing and a documented prompt-caching cost
warning. The investigation confirmed why it stays separate: no WebRTC/
WebSocket dependency exists in the project, there is no metered
"charge while running" billing anywhere (every current cost is a single
per-event `spend_coins()` call), and a browser-side Realtime session
needs a server-minted ephemeral credential so `OPENAI_API_KEY` never
reaches the client. It also needs its own migration(s) and its own
due-diligence pass before any code.

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
