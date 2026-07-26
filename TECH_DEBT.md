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
| 11 | `profiles.age` is a static integer captured once at onboarding, not `date_of_birth` | Low (for now) | `profiles` (migration 016), onboarding wizard, agent context | The number freezes at whatever the user typed and never advances — a 27-year-old today is still "27" in the DB a year from now, silently drifting from reality everywhere it's read (agent context, any future age-based logic). Accepted as-is for this stage since exact age collection is itself a brand-new, deliberately provisional decision (RBAC.md "تحديث حرج على سياسة القاصرين"). | Small — swap the column for `date_of_birth date` and compute age at query time; straightforward migration since only onboarding writes it today. |
| 12 | `profiles.points` balance isn't shown anywhere on the lesson page itself | Low | `features/lms/components/LessonView.tsx` | The dashboard shows points, but a learner completing a lesson (and earning `LESSON_COMPLETE` points) has no in-page confirmation of their running total — only the one-off "+N points earned" toast from `LessonCompleteButton`. | Small — `LessonPage` already fetches the user; one more `profiles.points` select and a prop pass to `LessonView`. |
| 13 | `/profile` has no `LangToggle` of its own | Low | `app/profile/page.tsx`, `features/profile/components/ProfileView.tsx` | Now that `useLang` persists the choice (localStorage), `WalletPanel` *does* pick up an "en" set elsewhere, so `coin_packages.name_en` is no longer unreachable — this entry was rewritten from its original "unreachable branch" framing, which is now inaccurate. What remains: `ProfileView` receives a hardcoded `lang="ar"` prop from the server page, so the panels driven by that prop (DNA, scores, skills, certificates, capabilities, recommendations) stay Arabic regardless of the persisted choice, and a user can't switch language *while on* `/profile` at all. The page is therefore internally inconsistent: `WalletPanel` follows the persisted language, everything around it does not. | Small — same fix pattern already applied to the lesson player: thin server page + a client view owning `useLang()`/`LangToggle`, passing `lang` down instead of a hardcoded literal. |
| 14 | Two `features/lms` components import `sendAgentMessage` from `features/agent`, violating the import-direction rule | Low | `features/lms/components/LanguageTaskCard.tsx`, `features/lms/components/PronunciationPractice.tsx` | CLAUDE.md #1 forbids a feature importing from a sibling feature — shared composition is supposed to happen in `app/` pages. `LanguageTaskCard` introduced this first; `PronunciationPractice` followed the existing precedent rather than inventing a second, inconsistent pattern. Both work correctly today, so this is structural drift rather than a live defect: the rule exists to stop `features/` becoming an implicit dependency graph, and each new sibling import makes the eventual untangling larger. | Small — move `sendAgentMessage` (and its `AgentMsg` type) to `shared/services/` or `shared/lib/`, since it is just a typed `fetch` to `/api/agent` with no agent-feature-specific logic, then update both consumers. Deliberately out of scope for the batch that surfaced it. |
| 15 | Abandoned placement conversations are an unbounded real OpenAI cost, guarded only by the in-memory rate limiter | **High before real Beta traffic** | `app/api/agent/placement/route.ts` | The once-only guard (user_language_profiles PK) only fires after a *completed* placement. A user who starts the free conversation and abandons it before the agent emits its block can restart endlessly, and every message is a real OpenAI invocation with no coin cost. The only bound is `rateLimit()` — which is per-instance in-memory: it resets on every deploy/restart and multiplies by instance count on serverless. This is genuine money exposure, same class as the unlimited simulated purchase. | Before any Beta traffic beyond the closed test circle: a DB-stored attempt counter (e.g. a `placement_message_count` on the user, incremented server-side, hard daily cap) or an equivalent durable limit. See also the standing Upstash item for the limiter itself. |

## تحذير: محادثات تحديد المستوى المهجورة (migration 022, 2026-07-25)

محادثة تحديد المستوى مجانية وغير مكررة **بعد اكتمالها فقط** — حارس المرة الواحدة (المفتاح الأساسي في `user_language_profiles`) لا يمنع من يبدأ المحادثة ويهجرها قبل إنتاج الوكيل لكتلة التقييم من إعادة البدء بلا حد، وكل رسالة استدعاء OpenAI حقيقي بتكلفة حقيقية وبلا أي مقابل كوينز. الحارس الوحيد حالياً محدد معدل في الذاكرة (15 رسالة / 10 دقائق) **يسقط كلياً عند إعادة تشغيل الخادم ويتضاعف بعدد الـinstances على serverless**. يجب حل حقيقي (عدّاد محاولات مخزَّن في قاعدة البيانات أو حد يومي دائم) **قبل أي حركة مرور Beta حقيقية تتجاوز دائرة الاختبار المغلقة** — نفس درجة إلزامية تحذير الشراء المحاكى أعلاه.

## تحديث حرج على سياسة الشراء المحاكى للكوينز (migration 020, 2026-07-25)

المالك اتخذ قراراً واعياً ومؤجَّلاً عمداً: تفعيل شراء كوينز **محاكى محلياً بالكامل** (`credit_coins()`، مسار `/api/wallet/purchase`) لأغراض الاختبار، بلا بوابة دفع حقيقية وبلا أي حد لتكرار الشراء. تحقّق حي أثناء الاختبار: نفس الحساب اشترى نفس الباقة ثلاث مرات متتالية بنجاح (25 → 325 → 625 → 925 كوينز)، كل عملية سجّلت صفاً حقيقياً في `coin_transactions`.

**تحذير صريح**: **هذا الشراء المحاكى بلا حد تكرار — يجب تعطيله أو استبداله ببوابة دفع حقيقية قبل أي حركة مرور Beta حقيقية تتجاوز دائرة الاختبار المغلقة الحالية، وإلا فأي مستخدم يحصل على كوينز مجانية لا نهائية بضغط زر متكرر.** هذا خطر تشغيلي فعلي منذ لحظة تفعيل هذا المسار، لا نظري — نفس درجة الخطورة الملزمة الموثّقة في RBAC.md بخصوص سياسة القاصرين. يجب حسم هذا البند (تعطيل المسار كلياً، أو تقييده بحد أقصى صارم، أو استبداله ببوابة دفع فعلية) قبل أي إطلاق عام حقيقي.

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
