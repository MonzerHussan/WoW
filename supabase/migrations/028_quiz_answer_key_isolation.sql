-- ============================================================
-- WOW - World of Work — Migration 028
-- Closes TECH_DEBT #25: the full quiz answer key was readable by any
-- enrolled student straight from PostgREST.
--
-- FOUND AND DEMONSTRATED END TO END while testing 027, not reasoned
-- about: a fresh test account ran
--     GET /rest/v1/quiz_questions?select=question
-- read all 18 `correct_index` values out of the returned jsonb,
-- submitted them through the real route, scored 100%, and had the
-- attempt approved by a real assessor.
--
-- ROOT CAUSE: `quiz_questions.question` is ONE jsonb column holding
-- {text, options[], correct_index}. RLS grants or denies a whole row —
-- it cannot hide one key inside a column. The submit route stripped
-- `correct_index` before sending questions to the browser, and
-- ARCHITECTURE.md said "correct_index never sent to the client", but
-- that was a property of the ROUTE, not of the DATA. Any client with a
-- session could bypass the route entirely. Exactly the same shape as
-- the points hole (027) and the role hole (025/026).
--
-- Hybrid review was never a mitigation: the assessor sees a score, and
-- a perfectly cheated attempt presents as the strongest possible pass.
--
-- THE FIX MAKES IT A PROPERTY OF THE DATA:
--   1. the key moves to `quiz_answer_keys`, a table with RLS enabled
--      and ZERO policies — no client role can read it at all;
--   2. `correct_index` is physically REMOVED from the `question` jsonb,
--      so even an unrestricted `select *` on quiz_questions no longer
--      contains it;
--   3. scoring moves into a security-definer function that compares
--      answers against the key internally and NEVER returns it.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The key, isolated
-- ------------------------------------------------------------
create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_index int not null
);

alter table public.quiz_answer_keys enable row level security;

-- DELIBERATELY NO POLICIES OF ANY KIND. With RLS enabled and no policy,
-- every `authenticated`/`anon` read returns zero rows and every write is
-- refused. The security-definer function below runs as the table owner
-- and is therefore the only thing that can see it. This is the same
-- "no policy is the policy" pattern 024 used for pricing_units writes —
-- applied here to reads.

-- ------------------------------------------------------------
-- 2. Move the existing keys, then strip them from the visible jsonb
-- ------------------------------------------------------------
insert into public.quiz_answer_keys (question_id, correct_index)
select id, (question->>'correct_index')::int
  from public.quiz_questions
 where question ? 'correct_index'
   and jsonb_typeof(question->'correct_index') = 'number'
on conflict (question_id) do nothing;

-- The destructive half, and the point of the whole migration: after
-- this, the answer is not merely hidden behind a policy — it is not in
-- the row at all. Runs only after the insert above has preserved it.
update public.quiz_questions
   set question = question - 'correct_index'
 where question ? 'correct_index';

-- ------------------------------------------------------------
-- 3. Scoring, server-side, key never leaves the database
--
--    This also moves the entitlement and the one-attempt rule into SQL,
--    where they are atomic, instead of leaving them as two separate
--    round-trips in the route.
-- ------------------------------------------------------------
create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_mode assessment_mode;
  v_passing numeric;
  v_total numeric;
  v_earned numeric;
  v_score numeric;
  v_is_auto boolean;
  v_passed boolean;
  v_attempt_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- SECURITY DEFINER bypasses RLS, so the entitlement the "Quizzes:
  -- enrolled read" policy would normally enforce has to be restated
  -- here by hand — same rule, including the lesson-scoped quiz case.
  select q.assessment_mode,
         q.passing_score,
         coalesce(q.course_id,
                  (select m.course_id
                     from public.lessons l
                     join public.modules m on m.id = l.module_id
                    where l.id = q.lesson_id))
    into v_mode, v_passing, v_course_id
    from public.quizzes q
   where q.id = p_quiz_id;

  if v_course_id is null then
    raise exception 'Quiz not found' using errcode = '42704';
  end if;

  if not exists (
    select 1 from public.enrollments e
     where e.user_id = v_uid and e.course_id = v_course_id
  ) then
    raise exception 'Not enrolled in this course' using errcode = '42501';
  end if;

  -- One attempt per user per quiz, checked in the same transaction that
  -- inserts it — the route used to do this as a separate SELECT, which
  -- left a race between two concurrent submissions.
  if exists (
    select 1 from public.quiz_attempts
     where user_id = v_uid and quiz_id = p_quiz_id
  ) then
    return jsonb_build_object('already_attempted', true);
  end if;

  -- The comparison itself. A missing answer, or one that isn't a JSON
  -- number, simply scores zero for that question rather than erroring —
  -- a malformed payload must not be able to crash grading.
  select coalesce(sum(qq.points), 0),
         coalesce(sum(
           case
             when jsonb_typeof(p_answers -> qq.id::text) = 'number'
              and (p_answers ->> qq.id::text)::int = ak.correct_index
             then qq.points
             else 0
           end
         ), 0)
    into v_total, v_earned
    from public.quiz_questions qq
    left join public.quiz_answer_keys ak on ak.question_id = qq.id
   where qq.quiz_id = p_quiz_id;

  if v_total = 0 then
    v_total := 1;
  end if;

  v_score := round((v_earned / v_total) * 10000) / 100;
  v_is_auto := (v_mode = 'auto');
  v_passed := case when v_is_auto then v_score >= v_passing else null end;

  insert into public.quiz_attempts (quiz_id, user_id, answers, score, passed)
  values (p_quiz_id, v_uid, p_answers, v_score, v_passed)
  returning id into v_attempt_id;

  -- Note what is NOT in this payload: no correct_index, no per-question
  -- breakdown that would let a caller infer the key by diffing attempts.
  -- Only the aggregate score and the routing decision.
  return jsonb_build_object(
    'already_attempted', false,
    'attempt_id', v_attempt_id,
    'score', v_score,
    'pending_review', not v_is_auto,
    'passed', v_passed
  );
end;
$$;

revoke execute on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- Self-check: fail loudly rather than leave the key half-migrated —
-- a partial run could either strip answers without preserving them
-- (ungradeable quizzes) or preserve them without stripping (hole open).
-- ------------------------------------------------------------
do $$
declare
  v_keys int;
  v_leaked int;
  v_questions int;
  v_policies int;
begin
  select count(*) into v_questions from public.quiz_questions;
  select count(*) into v_keys from public.quiz_answer_keys;

  select count(*) into v_leaked
    from public.quiz_questions where question ? 'correct_index';
  if v_leaked > 0 then
    raise exception 'correct_index still present in % question row(s)', v_leaked;
  end if;

  if v_keys < v_questions then
    raise exception 'Only % answer keys for % questions — keys were lost', v_keys, v_questions;
  end if;

  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'quiz_answer_keys';
  if v_policies <> 0 then
    raise exception 'quiz_answer_keys must have ZERO policies, found %', v_policies;
  end if;

  raise notice '028 OK: % keys isolated, 0 leaked into question jsonb, 0 policies on quiz_answer_keys', v_keys;
end $$;
