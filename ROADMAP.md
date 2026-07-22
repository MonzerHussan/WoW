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

**Explicitly a separate, still-pending task:** the shared-curriculum
contribution path (`content_review_votes` governance, migration 008 —
owner + peer_assessor + nova_check voting gate) is **not** part of this
delivery and has not been built. This sprint only covers an individual
instructor's own, ungoverned personal courses.

Building the first real owner-driven course UI surfaced a pre-existing,
never-until-now-exercised RLS gap: `modules`/`lessons` had no
owner-manage policy at all (every course shipped before this was seeded
directly via the SQL Editor, bypassing RLS). Closed via 10 new,
narrowly-scoped RLS policies across 5 tables — see SECURITY.md. Tested
end-to-end with two real, separately-signed-up accounts (instructor +
student) per TESTING_POLICY.md, plus a regression check confirming the
existing published-catalog flow is unaffected.

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
