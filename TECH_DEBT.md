# TECH_DEBT.md

| # | Item | Severity | Where | Why it matters | Fix effort |
|---|---|---|---|---|---|
| 1 | Bilingual `COPY` dictionary duplicated 3x | Medium | signup, login, onboarding pages | Every new UI string has to be added in 3 places by hand; they will drift. | Small — extract to `constants/i18n/*.ts`, shared per feature. |
| 2 | No shared UI primitives (`Button`, `Input`, `Select`) | Medium | every form page | Styling/behavior (disabled states, focus rings) is copy-pasted; a design tweak means editing N files. | Small-Medium — build `components/ui/{Button,Input}.tsx` once shadcn/ui is initialized, migrate forms one at a time. |
| 3 | No request validation library | Medium | all `app/api/*` routes | Validation is ad hoc per route; easy to miss a check on a new route. | Small — introduce zod, one shared `schemas/` folder. |
| 4 | No custom data hooks (`useUser`, `useProfile`) | Low-Medium | signup/login/dashboard | Supabase calls are inlined per-component instead of centralized, making it harder to test or swap data sources later. | Medium. |
| 5 | `profiles` conflates identity + gamification state | Low | `supabase/schema.sql` | Works fine now; will matter if gamification logic grows complex enough to want its own table/service boundary. | Defer — revisit only if Sprint 6 (Gamification) needs it. |
| 6 | No tests of any kind | High (by Sprint 10) | whole repo | Every refactor from here forward is a leap of faith without them. | Large — planned explicitly as Sprint 10, not a surprise. |
| 7 | No CI (lint/build/typecheck on push) | Medium | repo root | Broken builds/type errors currently only surface when someone runs `npm run build` locally. | Small — a single GitHub Actions workflow (`lint`, `tsc --noEmit`, `build`) pays for itself immediately. |
| 8 | Route-based folder structure will not scale past ~Sprint 3-4 | Medium | whole repo | Documented with a full migration plan in `PROJECT_STRUCTURE.md` — intentionally not executed yet. | Large — scheduled as first task of Sprint 2. |
| 9 | `career_scores(employability)` is not recomputed when an assessor confirms a human/hybrid quiz attempt for someone else | Medium | `app/api/lms/quizzes/grade/route.ts` | `recomputeEmployabilityScore` was removed from this route in Sprint 3 because `career_scores` only has an owner-insert RLS policy (013) — the assessor's session can't insert a score row for the student. The auto-pass path (`quizzes/submit`) works today since `auth.uid()` there is the student themselves. | Small-Medium — same pattern as `award_quiz_points` (013): a `security definer` function that verifies a real, passed, assessor-graded attempt before inserting the score row. |
| 10 | Third-party badge grants (an org/system awarding a badge the user didn't trigger themselves) have no write path | Low | `user_badges` | `013`'s "owner inserts own" policy only covers the self-serve case already used by `points.service.ts`. Nothing currently needs third-party grants, so this is a real but currently-unused gap. | Small — same `security definer` pattern, when a real caller (e.g. an org awarding a badge) exists. |

## Already resolved this sprint (for the record, not open debt anymore)
- Missing `tsconfig.json` / `next.config.js` / `next-env.d.ts` / `.eslintrc.json` — project would not have built. **Fixed.**
- Client-controlled point amount (critical security hole). **Fixed.**
- No FK indexes on `enrollments`, `user_badges`, `ai_conversations`, `horizon_progress`. **Fixed (migration 002).**
- `profiles.updated_at` never actually updated. **Fixed (migration 002 trigger).**
- No `app/error.tsx` / `app/not-found.tsx`. **Fixed.**

## Already resolved in Sprint 3
- Nova's conversation `history` trusted from client with only a TS type
  — resolved back in Sprint 1.5 (`agentRequestSchema`/`novaRequestSchema`
  zod validation) but never removed from this table until now.
- Points-awarding had no caller that verified the underlying event
  actually happened — `app/api/lms/lessons/complete` and
  `app/api/lms/quizzes/submit`/`grade` now all verify server-side
  (RLS-gated reads / a real graded attempt) before calling
  `awardPoints`/`award_quiz_points`. **Fixed.**
- Five real RLS write-permission gaps found via two-real-account
  acceptance testing (`entity_skills`, `skill_evidence`,
  `quiz_attempts` UPDATE, `system_actors` grant, ambiguous `profiles`
  embed) — see migrations 010, 012, 013 and ROADMAP.md Sprint 3.
  **Fixed.**
