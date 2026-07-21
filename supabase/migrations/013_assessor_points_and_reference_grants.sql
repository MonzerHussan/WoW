-- ============================================================
-- WOW - World of Work — Migration 013
-- Closes the remaining write gaps found while verifying the assessor
-- approval path end-to-end (Sprint 3 acceptance testing), per the
-- owner's explicit decisions for each:
--
-- 1. POINTS: deliberately NOT a broad RLS policy letting an assessor
--    UPDATE any profiles row — that reopens the exact class of bug
--    CLAUDE.md rule #4 already had to fix once ("النقاط لا تُقبل من
--    العميل أبدًا... لا تُعِدها"). Instead, a security definer function
--    that only pays out when the target attempt is real, actually
--    passed, graded by the calling assessor, and hasn't been paid out
--    before (points_awarded guard + row lock — closes a direct-RPC
--    replay angle: nothing stopped a caller from invoking this function
--    repeatedly for the same attempt otherwise). Mirrors the
--    spend_coins() pattern from 007b: no service_role, no broad RLS,
--    just an in-function-verified payout tied to a real event.
--
-- 2. career_scores: owner-only INSERT policy — unblocks the AUTO quiz
--    path (a user computing their own employability score) since that
--    already had ZERO insert policy at all (004's own comment promised
--    "system only" inserts but no policy ever implemented it — a
--    pre-existing gap, not introduced by Sprint 3). The assessor/
--    hybrid-confirmed recompute is explicitly deferred — features/lms
--    no longer calls recomputeEmployabilityScore from the grade route
--    until a similarly-scoped safe function exists for it.
--
-- 3. system_actors: plain GRANT, not an RLS policy — this table has no
--    RLS enabled at all (unlike skills, which uses RLS + a public-read
--    policy), so the fix is the privilege it was actually missing.
--    Public, non-sensitive reference data (actor names 'nova',
--    'scheduler') — same trust level as skills/skill_categories.
--
-- 4. user_badges: owner-only INSERT policy — enables the existing
--    self-serve badge-award path in points.service.ts (was completely
--    broken before this — a pre-existing gap, not introduced by
--    Sprint 3). Third-party badge grants (e.g. an org awarding a badge)
--    are deferred to a future safe function, same reasoning as #1.
--
-- Run order: 001 → ... → 012 → 013. Additive only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Points payout, tied to a real graded attempt (security definer)
-- ------------------------------------------------------------
alter table public.quiz_attempts
  add column if not exists points_awarded boolean not null default false;

create or replace function public.award_quiz_points(p_attempt_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_passed boolean;
  v_graded_by uuid;
  v_points_awarded boolean;
  -- Must match REASON_POINTS.QUIZ_COMPLETE in shared/constants/points.ts —
  -- there is no shared source of truth across TS and SQL for this value,
  -- so keep the two in sync by hand if it ever changes.
  v_points_amount constant int := 20;
  v_new_points int;
begin
  if not exists (
    select 1 from public.user_capabilities uc
    where uc.user_id = auth.uid() and uc.capability = 'assessor'
  ) then
    return false;
  end if;

  -- Row lock: makes the points_awarded check-then-set atomic against a
  -- second concurrent call for the same attempt.
  select user_id, passed, graded_by, points_awarded
  into v_user_id, v_passed, v_graded_by, v_points_awarded
  from public.quiz_attempts
  where id = p_attempt_id
  for update;

  if v_user_id is null
     or v_passed is not true
     or v_graded_by is distinct from auth.uid()
     or v_points_awarded then
    return false;
  end if;

  update public.quiz_attempts set points_awarded = true where id = p_attempt_id;

  select points + v_points_amount into v_new_points
  from public.profiles where id = v_user_id;

  update public.profiles
  set points = v_new_points, level = floor(v_new_points / 100) + 1
  where id = v_user_id;

  return true;
end;
$$;

revoke execute on function public.award_quiz_points(uuid) from public, anon;
grant execute on function public.award_quiz_points(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2. career_scores: self-insert only (auto-quiz-pass path)
-- ------------------------------------------------------------
create policy "DNA scores: owner inserts own" on public.career_scores
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. system_actors: public reference data, plain grant (no RLS on this
--    table, so RLS policies would have no effect either way)
-- ------------------------------------------------------------
grant select on public.system_actors to anon, authenticated;

-- ------------------------------------------------------------
-- 4. user_badges: self-insert only
-- ------------------------------------------------------------
create policy "User badges: owner inserts own" on public.user_badges
  for insert with check (auth.uid() = user_id);
