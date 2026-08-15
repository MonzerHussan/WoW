-- ============================================================
-- WOW - World of Work — Migration 076
-- MODELLING CORRECTION (owner decision, 2026-08-15): the
-- instructor-invites-learner direction is abolished. A learner invites
-- an instructor to explain something they need more depth on. There is
-- no reverse direction, and there should never have been one.
--
-- THIS IS NOT A DEFERRED FEATURE. `initiated_by='instructor'` was a
-- wrong model that entered the schema in 040 and contradicts the
-- product's own logic — not an unfinished half of a two-way design.
-- 075 had already left it accept-less (accept_instructor_assignment()
-- only ever permitted the instructor to accept, so an instructor's own
-- invite had nobody who could accept it); this migration removes the
-- direction outright rather than building the missing acceptance path.
-- `learner_accept_instructor_invite()` is explicitly NOT built.
--
-- THE LESSON WORTH RECORDING (this is why the wrong model survived
-- four months): 040's own acceptance-test round **tested this
-- direction and passed it** — "دعوة المدرّب للمتعلم (الاتجاه المعاكس)
-- → 201 ✅". The test was correct and the code was correct; the
-- *design* was wrong. An acceptance test verifies that the code does
-- what it was designed to do, never that the design itself is right.
-- No amount of testing that round could have caught this.
--
-- CONFIRMED UNUSED BEFORE REMOVAL (not assumed):
--   * `initiated_by` appears in exactly one application file,
--     `features/instructors/services/instructors.service.ts`, and only
--     as a read (it is mapped into MyInstructorLink.initiatedBy). No
--     UI, no API route, and no screen anywhere lets an instructor
--     browse learners — so there was never a door through which an
--     instructor could invite anyone.
--   * Live row census before writing this migration: exactly ONE row
--     with initiated_by='instructor' exists in production —
--     e7119ffc-608f-4147-b634-3cbe6540f857, status 'declined'
--     (terminal), context "Saw your project, want to help",
--     created 2026-08-06 during 040's own test round, with ZERO
--     related coin_transactions, ZERO messages, ZERO ratings. It is
--     completely inert.
--
-- THE ROW IS DELIBERATELY LEFT IN PLACE. This project does not run
-- destructive migrations over live data — the same call already made
-- for `lessons.content->...->coin_cost` (TECH_DEBT #22) and
-- `courses.description`/`language` (#28). The row is already
-- 'declined', so it can never transition anywhere, and no code reads
-- `initiated_by` for any decision.
--
-- `initiated_by` THE COLUMN is likewise kept, for the same reason. It
-- will simply always hold 'learner' from here on.
--
-- WHY BOTH A POLICY DROP AND A CHECK CONSTRAINT (belt and braces, and
-- they guard genuinely different things):
--   1. Dropping the "instructor invites" INSERT policy is the primary
--      gate and matches this codebase's dominant shape — "no policy =
--      no path" (quiz_answer_keys, game_spotter_answer_keys,
--      instructor_messages/instructor_ratings in 074 itself). An
--      INSERT with no permitting policy is refused loudly with 42501,
--      not silently — unlike the UPDATE-with-no-matching-USING case
--      that returns a zero-row 200 (TECH_DEBT #24 / migration 030).
--   2. An RLS policy does NOT constrain a SECURITY DEFINER function —
--      that is exactly the seam 075 just closed, where a definer
--      function was the only thing standing between a client and an
--      unpaid 'accepted'. A CHECK constraint holds against every
--      writer including definer functions and the table owner, so a
--      future function that inserts assignments cannot silently
--      reintroduce the direction. The constraint is the durable one;
--      the policy drop is the one that produces the clean error today.
--
-- The constraint is added NOT VALID **solely** because of the single
-- pre-existing declined test row described above — a plain ADD
-- CONSTRAINT would fail against it, and deleting live data to satisfy
-- a constraint is exactly what this project refuses to do. NOT VALID
-- enforces on every INSERT and UPDATE from now on; it only skips
-- re-validating rows that already exist. This is a deliberate,
-- documented tradeoff, not an oversight.
--
-- 040, 074 and 075 are NOT modified — this is a separate, additive
-- migration.
-- ============================================================

drop policy if exists "Instructor assignments: instructor invites" on public.instructor_assignments;

alter table public.instructor_assignments
  drop constraint if exists instructor_assignments_learner_initiated_only;

alter table public.instructor_assignments
  add constraint instructor_assignments_learner_initiated_only
  check (initiated_by = 'learner') not valid;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_policy_count int;
  v_invite_policy int;
  v_learner_policy int;
  v_constraint int;
  v_legacy_rows int;
begin
  -- The invite policy must be gone, the learner-request policy must remain.
  select count(*) into v_invite_policy from pg_policies
   where schemaname = 'public' and tablename = 'instructor_assignments'
     and policyname = 'Instructor assignments: instructor invites';
  if v_invite_policy <> 0 then
    raise exception '076 failed: the instructor-invites INSERT policy still exists';
  end if;

  select count(*) into v_learner_policy from pg_policies
   where schemaname = 'public' and tablename = 'instructor_assignments'
     and policyname = 'Instructor assignments: learner requests';
  if v_learner_policy <> 1 then
    raise exception '076 failed: the learner-requests INSERT policy is missing — the only remaining way to create an assignment';
  end if;

  -- 3 policies now (learner insert, participants read, participants respond).
  select count(*) into v_policy_count from pg_policies
   where schemaname = 'public' and tablename = 'instructor_assignments';
  if v_policy_count <> 3 then
    raise exception '076 failed: expected exactly 3 policies after dropping the invite policy, found %', v_policy_count;
  end if;

  select count(*) into v_constraint from pg_constraint
   where conrelid = 'public.instructor_assignments'::regclass
     and conname = 'instructor_assignments_learner_initiated_only';
  if v_constraint <> 1 then
    raise exception '076 failed: the learner-initiated-only CHECK constraint was not created';
  end if;

  -- The known legacy row is expected to survive untouched; assert it was
  -- neither deleted nor multiplied, so a future reader can trust the
  -- census recorded in this header.
  select count(*) into v_legacy_rows from public.instructor_assignments
   where initiated_by = 'instructor';
  if v_legacy_rows <> 1 then
    raise exception '076 unexpected: expected exactly 1 pre-existing instructor-initiated row (left in place by design), found %', v_legacy_rows;
  end if;

  raise notice '076 OK: instructor-invites direction abolished (policy dropped + CHECK constraint); 1 inert legacy declined row deliberately preserved.';
end $$;
