-- ============================================================
-- WOW - World of Work — Migration 012
-- Fix: the LMS→DNA quiz-pass write path (features/lms/services/dna.service.ts,
-- recordQuizPassSkills) was silently failing for RLS reasons, confirmed
-- live via server logs during Sprint 3 acceptance testing:
--   "Cannot coerce the result to a single JSON object"
-- (postgrest-js .single() on zero rows — i.e. RLS rejected the write).
--
-- Root causes (three separate gaps — the third found by cross-checking
-- the "graded" row itself before this migration shipped: a fresh
-- unfiltered re-query of the just-"approved" attempt showed
-- graded_by/passed still null, i.e. the grade endpoint's own UPDATE had
-- silently affected zero rows):
--
-- 0. quiz_attempts has no UPDATE policy for an assessor grading someone
--    ELSE's attempt — only "Attempts: own" (auth.uid() = user_id) and a
--    SELECT-only "Attempts: assessors read pending". An UPDATE that
--    matches zero RLS-visible rows is not an error to Postgres/PostgREST
--    — app/api/lms/quizzes/grade/route.ts's update silently no-opped and
--    still returned {passed:true}, masked in earlier testing only
--    because that first attempt happened to be graded by the same
--    account that took it (auth.uid() = user_id was incidentally true).
--
-- 1. entity_skills' only write policy (004) is
--      "user manages own self-claims": entity_id = auth.uid() AND source = 'self'
--    Quiz-pass credit uses source = 'assessment' (a stronger, distinct
--    source per DOMAIN_CONTRACTS.md §2 weight order — deliberately NOT
--    'self') — no existing policy covers writing an 'assessment'-sourced
--    row at all, whether by the user themselves (auto-graded quiz, same
--    session) or by an assessor confirming someone else's hybrid/human
--    attempt.
--
-- 2. skill_evidence's insert policy (005) is submitted_by = auth.uid()
--    only. When an assessor approves ANOTHER user's attempt, the row is
--    written with submitted_by = that student (correct semantics — they
--    generated the evidence) while auth.uid() is the assessor — the
--    existing policy rejects this outright. 005's own comment already
--    anticipated this ("Verification writes happen server-side (assessor
--    queue / org flows)") but the policy enabling it was never added.
--
-- Both new policies are scoped as tightly as the write path actually
-- needs — evidence_type/source are pinned to the quiz-pass case, and the
-- assessor path requires the live 'assessor' capability, not just any
-- authenticated session.
-- Run order: 001 → ... → 011 → 012. Additive only.
-- ============================================================

-- (0) Let an assessor grade a PENDING attempt that isn't their own.
-- USING scopes which EXISTING rows are eligible (still ungraded, caller
-- is an assessor). WITH CHECK must be given explicitly and separately —
-- for UPDATE policies Postgres reuses USING as WITH CHECK when omitted,
-- which here would be self-defeating: the update's whole point is to set
-- graded_by away from null, so the resulting row would immediately fail
-- a reused "graded_by is null" check. WITH CHECK instead requires the
-- row to end up graded by the caller themselves (also blocks an assessor
-- from attributing the grade to someone else's id).
create policy "Attempts: assessors grade pending" on public.quiz_attempts
  for update
  using (
    graded_by is null
    and exists (
      select 1 from public.user_capabilities uc
      where uc.user_id = auth.uid() and uc.capability = 'assessor'
    )
  )
  with check (graded_by = auth.uid());

-- (1a) A user crediting themselves via an auto-graded quiz pass
-- (features/lms/services/dna.service.ts called from the submit route,
-- where auth.uid() = the student taking the quiz).
create policy "Entity skills: self assessment writes" on public.entity_skills
  for all using (
    entity_type = 'user' and entity_id = auth.uid() and source = 'assessment'
  );

-- (1b) An assessor crediting a DIFFERENT user after confirming a
-- human/hybrid attempt (app/api/lms/quizzes/grade/route.ts).
create policy "Entity skills: assessor writes for others" on public.entity_skills
  for all using (
    entity_type = 'user' and source = 'assessment'
    and exists (
      select 1 from public.user_capabilities uc
      where uc.user_id = auth.uid() and uc.capability = 'assessor'
    )
  );

-- (2) An assessor writing quiz_attempt evidence on behalf of the student
-- whose attempt they just confirmed. Tightly scoped: only quiz_attempt
-- evidence, and the row must self-identify the writer as the verifying
-- assessor (verified_by_id = auth.uid()) — it cannot be used to write
-- evidence of another type or claim a different verifier.
create policy "Evidence: assessor writes quiz evidence" on public.skill_evidence
  for insert with check (
    evidence_type = 'quiz_attempt'
    and verified_by_type = 'assessor'
    and verified_by_id = auth.uid()
    and exists (
      select 1 from public.user_capabilities uc
      where uc.user_id = auth.uid() and uc.capability = 'assessor'
    )
  );
