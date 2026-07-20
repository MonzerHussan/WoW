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
| 9 | Nova's conversation `history` trusted from client with only a TS type, no runtime check | Medium | `app/api/nova/route.ts` | TS types disappear at runtime; a malformed/hostile payload is only caught by luck. | Small — add a zod schema (ties into #3). |
| 10 | Points-awarding endpoint has no caller yet that verifies the underlying event actually happened | Low today, High once wired up | `app/api/points/award` | The endpoint itself is now safe (fixed amounts), but whoever calls it in Sprint 2 (LMS) must prove completion server-side, not just fire on a client click. | Tracked as a Sprint 2 requirement, not current debt. |

## Already resolved this sprint (for the record, not open debt anymore)
- Missing `tsconfig.json` / `next.config.js` / `next-env.d.ts` / `.eslintrc.json` — project would not have built. **Fixed.**
- Client-controlled point amount (critical security hole). **Fixed.**
- No FK indexes on `enrollments`, `user_badges`, `ai_conversations`, `horizon_progress`. **Fixed (migration 002).**
- `profiles.updated_at` never actually updated. **Fixed (migration 002 trigger).**
- No `app/error.tsx` / `app/not-found.tsx`. **Fixed.**
