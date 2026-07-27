-- ============================================================
-- WOW - World of Work — Migration 027
-- Closes TECH_DEBT #20: profiles.points / profiles.level were writable
-- directly from any client session. Verified live before this migration:
--   PATCH /rest/v1/profiles?id=eq.<own id> {"points":999999,"level":99}
--   -> 200, values really changed (reverted immediately).
-- Same column-blind self-update policy that allowed the role escalation
-- closed in 025+026 — and the exact bug class CLAUDE.md rule #4 says must
-- never come back ("النقاط لا تُقبل من العميل أبدًا ... لا تُعِدها").
-- The API route was hardened in Sprint 1; the direct PostgREST path
-- bypassed the route entirely.
--
-- WHY 025/026 COULD NOT SIMPLY COVER THESE TWO COLUMNS TOO:
-- `awardPoints` (shared/services/points.service.ts) wrote points/level
-- through the USER'S OWN SESSION. Locking the columns without first
-- moving that write server-side would have broken lesson completion and
-- quiz rewards outright. So this migration does both halves at once:
-- create the verified write paths, then close the column.
--
-- WHY NOT ONE GENERIC award_points(p_reason):
-- a generic function callable by `authenticated` is a WORSE hole than
-- the one being closed. Today a user can set their points once to an
-- arbitrary number; a generic reason-based RPC would let them mint
-- PMP_LEVEL_COMPLETE (100 points) on repeat, forever, and it would look
-- like legitimate traffic. 013's award_quiz_points already established
-- the right shape and is followed here: ONE FUNCTION PER REAL EVENT,
-- each verifying the event actually happened and each idempotent via a
-- persisted `points_awarded` flag taken under a row lock.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Idempotency marker for lesson points — the same role
--    quiz_attempts.points_awarded (013) plays for quizzes.
--    Without it, a user could call the function repeatedly for one
--    already-completed lesson and farm 10 points per call.
-- ------------------------------------------------------------
alter table public.lesson_progress
  add column if not exists points_awarded boolean not null default false;

-- Existing completed lessons predate this column. They are marked as
-- already-awarded so this migration cannot retroactively hand out points
-- for work done before it existed — and, more importantly, so nobody can
-- claim points a second time for a lesson they already earned them for.
update public.lesson_progress
   set points_awarded = true
 where completed = true and points_awarded = false;

-- ------------------------------------------------------------
-- 2. Lesson-completion points, tied to a real recorded completion
-- ------------------------------------------------------------
create or replace function public.award_lesson_points(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed boolean;
  v_awarded boolean;
  -- Must match REASON_POINTS.LESSON_COMPLETE in shared/constants/points.ts.
  -- Same hand-sync caveat 013 documented: there is no shared source of
  -- truth across TS and SQL for this number.
  v_points_amount constant int := 10;
  v_new_points int;
begin
  -- Row lock makes the check-then-set atomic against a second concurrent
  -- call for the same (user, lesson).
  select completed, points_awarded
    into v_completed, v_awarded
    from public.lesson_progress
   where user_id = auth.uid() and lesson_id = p_lesson_id
   for update;

  -- No row = this user never completed this lesson. Note the whole
  -- lookup is already scoped to auth.uid(), so there is no p_user
  -- parameter to spoof: a caller can only ever award themselves, and
  -- only for a completion that genuinely exists.
  if v_completed is not true or v_awarded then
    return false;
  end if;

  update public.lesson_progress
     set points_awarded = true
   where user_id = auth.uid() and lesson_id = p_lesson_id;

  select points + v_points_amount into v_new_points
    from public.profiles where id = auth.uid();

  update public.profiles
     set points = v_new_points,
         level = floor(v_new_points / 100) + 1
   where id = auth.uid();

  return true;
end;
$$;

revoke execute on function public.award_lesson_points(uuid) from public, anon;
grant execute on function public.award_lesson_points(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. award_quiz_points: same signature as 013, extended — not forked
--
--    013 only covered the ASSESSOR path (an assessor confirming someone
--    else's attempt). The auto-graded path awarded its points from
--    TypeScript via the student's own session, which step 4 below makes
--    impossible. So the auto path is added here as a second accepted
--    branch of the same function, rather than a near-duplicate function.
--
--    Both branches keep 013's `points_awarded` flag, so an attempt can
--    still only ever pay out once regardless of which branch fires.
-- ------------------------------------------------------------
create or replace function public.award_quiz_points(p_attempt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_passed boolean;
  v_graded_by uuid;
  v_points_awarded boolean;
  v_quiz_id uuid;
  v_mode assessment_mode;
  -- Must match REASON_POINTS.QUIZ_COMPLETE in shared/constants/points.ts.
  v_points_amount constant int := 20;
  v_new_points int;
  v_is_assessor boolean;
  v_is_auto_self boolean;
begin
  select qa.user_id, qa.passed, qa.graded_by, qa.points_awarded, qa.quiz_id, q.assessment_mode
    into v_user_id, v_passed, v_graded_by, v_points_awarded, v_quiz_id, v_mode
    from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
   where qa.id = p_attempt_id
   for update of qa;

  if v_user_id is null or v_passed is not true or v_points_awarded then
    return false;
  end if;

  -- Branch A (013, unchanged): an assessor confirming this attempt.
  v_is_assessor :=
    v_graded_by is not distinct from auth.uid()
    and exists (
      select 1 from public.user_capabilities uc
       where uc.user_id = auth.uid() and uc.capability = 'assessor'
    );

  -- Branch B (new): the auto-graded path. The student is claiming their
  -- own pass on a quiz that is genuinely auto-assessed and was never
  -- routed to a human (graded_by is null). A hybrid/human quiz can NOT
  -- pay out through this branch — it still needs branch A.
  v_is_auto_self :=
    v_user_id = auth.uid()
    and v_mode = 'auto'
    and v_graded_by is null;

  if not (v_is_assessor or v_is_auto_self) then
    return false;
  end if;

  update public.quiz_attempts set points_awarded = true where id = p_attempt_id;

  select points + v_points_amount into v_new_points
    from public.profiles where id = v_user_id;

  update public.profiles
     set points = v_new_points,
         level = floor(v_new_points / 100) + 1
   where id = v_user_id;

  return true;
end;
$$;

revoke execute on function public.award_quiz_points(uuid) from public, anon;
grant execute on function public.award_quiz_points(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Extend the 026 guard to points and level.
--
--    Built ON 026, not over it: the function stays SECURITY INVOKER.
--    That single attribute is what made 025 inert — inside a SECURITY
--    DEFINER function `current_user` is the function owner, so the
--    early-out fired on every call and nothing was ever checked. Do not
--    add `security definer` here.
--
--    The definer functions above are unaffected: they run as their owner,
--    so current_user is 'postgres' there, not 'authenticated'.
-- ------------------------------------------------------------
drop trigger if exists trg_profiles_guard_privileged on public.profiles;
drop function if exists public.guard_profile_privileged_columns();

create function public.guard_profile_privileged_columns()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then

    if new.role is distinct from old.role then
      raise exception 'Role cannot be changed from a client session'
        using errcode = '42501';
    end if;

    if new.status is distinct from old.status then
      raise exception 'Account status cannot be changed from a client session'
        using errcode = '42501';
    end if;

    if new.identity_verified_at is distinct from old.identity_verified_at then
      raise exception 'Identity verification cannot be self-assigned'
        using errcode = '42501';
    end if;

    -- New in 027. Points and level are earned through the verified
    -- award_* functions above, never written directly.
    if new.points is distinct from old.points then
      raise exception 'Points cannot be changed from a client session'
        using errcode = '42501';
    end if;

    if new.level is distinct from old.level then
      raise exception 'Level cannot be changed from a client session'
        using errcode = '42501';
    end if;

  end if;

  return new;
end $$;

create trigger trg_profiles_guard_privileged
  before update on public.profiles
  for each row execute procedure public.guard_profile_privileged_columns();

-- ------------------------------------------------------------
-- Self-check: the guard must exist, must NOT be security definer (the
-- 025 bug), and both award functions must be present. Fail loudly —
-- a half-applied version of this migration would either leave points
-- writable or break lesson rewards.
-- ------------------------------------------------------------
do $$
declare
  v_secdef boolean;
  v_trigger int;
  v_fns int;
begin
  select prosecdef into v_secdef
    from pg_proc where proname = 'guard_profile_privileged_columns';
  if v_secdef is null then
    raise exception 'guard_profile_privileged_columns() was not created';
  end if;
  if v_secdef then
    raise exception 'guard is SECURITY DEFINER — the 025 bug has been reintroduced';
  end if;

  select count(*) into v_trigger
    from pg_trigger
   where tgrelid = 'public.profiles'::regclass
     and tgname = 'trg_profiles_guard_privileged'
     and not tgisinternal;
  if v_trigger <> 1 then
    raise exception 'trg_profiles_guard_privileged is not installed';
  end if;

  select count(*) into v_fns from pg_proc
   where proname in ('award_lesson_points', 'award_quiz_points');
  if v_fns < 2 then
    raise exception 'Expected both award functions, found %', v_fns;
  end if;

  raise notice '027 OK: guard is SECURITY INVOKER and covers points/level; both award functions present';
end $$;
