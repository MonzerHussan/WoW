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

## Sprint 3 — LMS UI + DNA wiring (proposed next)
- Course catalog + course page + lesson player (features/lms/).
- Quiz taking (auto grading first), assessor grading queue (human/hybrid).
- The LMS→DNA feed contract (section 5 of DOMAIN_CONTRACTS.md): lesson
  completion → points + Learning DNA; quiz pass → assessed skills; first
  `career_scores` computation with explanations.
- middleware: treat non-`active` profiles.status as unauthenticated
  (carried task from 003).
- Rate limiter → shared store before Nova expansion (carried from 1.5).

## Sprint 3 — AI Agents
- Replace in-memory rate limiter with a shared store (Upstash Redis) —
  the one remaining High finding in SECURITY.md.
- Nova proactively referencing real enrollment/progress data,
  "Project Horizon" episode unlocking tied to real points.

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
