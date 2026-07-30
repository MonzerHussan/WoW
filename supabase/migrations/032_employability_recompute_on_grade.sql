-- ============================================================
-- WOW - World of Work — Migration 032
-- Closes TECH_DEBT #9: career_scores(employability) was not recomputed
-- when an assessor confirmed a human/hybrid quiz attempt for someone
-- else. DOMAIN_CONTRACTS.md §6 already named the fix: "needs the same
-- security-definer-function treatment as award_quiz_points()".
--
-- WHY THE EXISTING TS FUNCTION (features/lms/services/dna.service.ts's
-- recomputeEmployabilityScore) CANNOT SIMPLY BE CALLED FROM THE GRADE
-- ROUTE: career_scores has an owner-only INSERT policy (013,
-- `auth.uid() = user_id`) — the assessor's session can never satisfy it
-- for a different user's row. Running the TS function's three counting
-- queries under the assessor's OWN session isn't viable either, checked
-- against the real RLS policies before writing this:
--   * quiz_attempts   — assessor SELECT is broad (any row, any user)
--   * entity_skills   — assessor read is scoped to source='assessment'
--                        only (not employer_verified/certification_verified)
--   * lesson_progress — NO assessor read policy exists at all
-- Opening a broad new read policy on lesson_progress just to support one
-- recompute path would be the same "broad RLS grant for staff" shape
-- CLAUDE.md rule #4 and migration 013 already rejected once for points
-- and skills. A SECURITY DEFINER function sidesteps this cleanly: it
-- reads all three tables as its owner, bypassing RLS entirely, so no new
-- read policy is needed anywhere.
--
-- This function does NOT replace the TS auto-path function — that path
-- (student's own passing attempt on an auto-graded quiz) already works
-- today because auth.uid() there is the student, matching the owner-only
-- INSERT policy. Two parallel, narrow paths for two different callers,
-- same shape the project already uses for award_lesson_points vs
-- award_quiz_points.
--
-- VERIFICATION IS COPIED, NOT SHARED, FROM award_quiz_points (027)'s
-- assessor branch: `graded_by = auth.uid()` (the caller is the exact
-- assessor who graded THIS attempt) AND the caller currently holds the
-- assessor capability. Deliberately re-checked here rather than factored
-- into a shared helper — no two SECURITY DEFINER functions in this
-- codebase share a verification helper (award_lesson_points and
-- award_quiz_points each independently re-verify their own event), so
-- there is no single trust boundary whose future edit could silently
-- weaken both functions at once.
-- ============================================================

create or replace function public.recompute_employability_score(p_attempt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_graded_by uuid;
  v_passed boolean;
  v_verified_skills int;
  v_passed_quizzes int;
  v_completed_lessons int;
  v_factor_skills numeric(5,2);
  v_factor_quizzes numeric(5,2);
  v_factor_lessons numeric(5,2);
  v_score numeric(5,2);
  v_nova_id uuid;
  v_explanation jsonb;
begin
  select qa.user_id, qa.graded_by, qa.passed
    into v_user_id, v_graded_by, v_passed
    from public.quiz_attempts qa
   where qa.id = p_attempt_id;

  if v_user_id is null or v_passed is not true then
    return false;
  end if;

  -- Same predicate as award_quiz_points (027)'s branch A. Must run AFTER
  -- the route's own UPDATE has set graded_by = auth.uid() — exactly the
  -- ordering award_quiz_points itself already depends on.
  if not (
    v_graded_by is not distinct from auth.uid()
    and exists (
      select 1 from public.user_capabilities uc
       where uc.user_id = auth.uid() and uc.capability = 'assessor'
    )
  ) then
    raise exception 'Not authorized to recompute this score'
      using errcode = '42501';
  end if;

  -- The same three counts recomputeEmployabilityScore() (TS) computes,
  -- ported verbatim. No shared source of truth between TS and SQL for
  -- this formula — same hand-sync caveat 013/027 already documented for
  -- REASON_POINTS.
  select count(*) into v_verified_skills
    from public.entity_skills
   where entity_type = 'user' and entity_id = v_user_id
     and source in ('assessment', 'employer_verified', 'certification_verified');

  select count(*) into v_passed_quizzes
    from public.quiz_attempts
   where user_id = v_user_id and passed = true;

  select count(*) into v_completed_lessons
    from public.lesson_progress
   where user_id = v_user_id and completed = true;

  v_factor_skills  := least(100, v_verified_skills * 10);
  v_factor_quizzes := least(100, v_passed_quizzes * 15);
  v_factor_lessons := least(100, v_completed_lessons * 5);

  v_score := round((v_factor_skills * 0.5 + v_factor_quizzes * 0.3 + v_factor_lessons * 0.2)::numeric, 2);

  select id into v_nova_id from public.system_actors where name = 'nova';
  if v_nova_id is null then
    raise exception 'system_actors row "nova" is missing — cannot attribute the score';
  end if;

  -- Same shape as the TS version's ScoreFactor[] (DOMAIN_CONTRACTS.md
  -- §6 transparency rule: explanation is mandatory, {factors:[...]}).
  v_explanation := jsonb_build_object('factors', jsonb_build_array(
    jsonb_build_object(
      'name', 'المهارات الموثّقة', 'weight', 0.5, 'value', v_factor_skills,
      'tip', 'أنجز المزيد من الاختبارات المعتمدة لتوثيق مهارات إضافية.'
    ),
    jsonb_build_object(
      'name', 'الاختبارات المجتازة', 'weight', 0.3, 'value', v_factor_quizzes,
      'tip', 'اجتز اختبارات جديدة لرفع هذا العامل.'
    ),
    jsonb_build_object(
      'name', 'الدروس المكتملة', 'weight', 0.2, 'value', v_factor_lessons,
      'tip', 'أكمل المزيد من الدروس في مسارك الحالي.'
    )
  ));

  -- Always a NEW row (career_scores is a time series, never updated in
  -- place — 004's own comment, restated in DOMAIN_CONTRACTS.md §6). No
  -- history is touched or reinterpreted.
  insert into public.career_scores (user_id, score_type, score, explanation, computed_by)
  values (v_user_id, 'employability', v_score, v_explanation, v_nova_id);

  return true;
end;
$$;

-- Same defense-in-depth as every other definer function here: the
-- assessor check already rejects an anonymous caller, but revoking
-- EXECUTE means that rejection never has to run.
revoke execute on function public.recompute_employability_score(uuid) from public, anon;
grant execute on function public.recompute_employability_score(uuid) to authenticated;

-- Self-check, same discipline as every migration in this file's family.
do $$
declare
  v_fn int;
begin
  select count(*) into v_fn from pg_proc where proname = 'recompute_employability_score';
  if v_fn = 0 then
    raise exception 'recompute_employability_score() was not created';
  end if;

  raise notice '032 OK: recompute_employability_score() installed';
end $$;
