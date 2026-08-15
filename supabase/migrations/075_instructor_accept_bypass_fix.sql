-- ============================================================
-- WOW - World of Work — Migration 075
-- SECURITY FIX: a direct client PATCH could set
-- instructor_assignments.status = 'accepted' without ever calling
-- accept_instructor_assignment() — i.e. without paying.
--
-- THE HOLE. 040 shipped this UPDATE policy (schema-only round, before
-- any payment path existed, so it was correct at the time):
--
--   using       ((instructor_id = auth.uid() or learner_id = auth.uid())
--                and status = 'pending')
--   with check  (status = any (array['accepted','declined']))
--
-- 074 then added accept_instructor_assignment() (which charges the
-- learner) but never narrowed that policy — so from 074 onward the
-- platform had TWO ways to reach 'accepted': the function (charges) and
-- a plain PostgREST PATCH (charges nothing). Same end state, no money
-- moved, no coin_transactions row. 074's own header even says "No
-- forbid_client_write trigger is needed yet either, since there is no
-- payment path here yet to protect — added in the follow-up migration
-- alongside the accept-and-charge function" (040's words) — the
-- follow-up added the function but forgot the protection half.
--
-- WHY IT WAS NEVER NOTICED: no UI calls any of 074's three functions
-- (verified: `git grep accept_instructor_assignment -- "*.ts" "*.tsx"`
-- returns zero, likewise send_instructor_message/rate_instructor). The
-- accept flow has no user-facing path at all yet, so nothing exercised
-- either route — the missing UI is precisely what hid the hole.
--
-- THE FIX. Narrow the policy's WITH CHECK from
-- `status in ('accepted','declined')` to `status = 'declined'`:
--   * declining stays a plain client write — it moves no money, so
--     there is nothing to protect, and forcing it through a function
--     would add a definer function for no security gain.
--   * 'accepted' becomes unreachable from any client session, leaving
--     accept_instructor_assignment() (SECURITY DEFINER, charges inside
--     the same transaction as the status flip) as the only door — the
--     same "no policy = no path, one verified function is the only
--     writer" shape as 027/028/030/033/074's own message+rating tables.
--
-- KNOWN CONSEQUENCE, DELIBERATE, FLAGGED TO THE OWNER: 040's schema
-- supports both directions (`initiated_by` 'learner' | 'instructor'),
-- but accept_instructor_assignment() only lets the INSTRUCTOR accept
-- (`auth.uid() = instructor_id`). So for an instructor-initiated
-- invite, the party who would logically accept is the learner — and
-- after this migration they have no path to do so (the function
-- refuses them; the direct PATCH is now blocked). That direction is
-- therefore decline-only until a decision is made. This is NOT a
-- regression introduced here: the only way a learner could accept an
-- invite before this migration was the very PATCH that skipped
-- payment, so that path was never legitimate — it was the hole. The
-- open product decision (build learner_accept_instructor_invite(),
-- where caller == payer so spend_coins() applies directly, or drop the
-- instructor-invites direction) is recorded in ROADMAP.md and
-- TECH_DEBT.md rather than silently resolved here.
--
-- 074 is NOT modified by this migration (nor is any earlier one) —
-- this is a separate, additive policy replacement.
-- ============================================================

drop policy if exists "Instructor assignments: participants respond" on public.instructor_assignments;

create policy "Instructor assignments: participants respond" on public.instructor_assignments
  for update using (
    (instructor_id = auth.uid() or learner_id = auth.uid()) and status = 'pending'
  ) with check (
    status = 'declined'
  );

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_with_check text;
  v_policy_count int;
  v_fn_def text;
begin
  select count(*) into v_policy_count
    from pg_policies where schemaname = 'public' and tablename = 'instructor_assignments';
  if v_policy_count <> 4 then
    raise exception '075 failed: instructor_assignments must still have exactly 4 policies, found %', v_policy_count;
  end if;

  select with_check into v_with_check
    from pg_policies
   where schemaname = 'public' and tablename = 'instructor_assignments'
     and policyname = 'Instructor assignments: participants respond';

  if v_with_check is null then
    raise exception '075 failed: the respond policy is missing after replacement';
  end if;
  if v_with_check ilike '%accepted%' then
    raise exception '075 failed: the respond policy still permits status=accepted from a client session (with_check: %)', v_with_check;
  end if;
  if v_with_check not ilike '%declined%' then
    raise exception '075 failed: the respond policy no longer permits declining (with_check: %)', v_with_check;
  end if;

  -- The function must still exist and still be the charging path.
  select pg_get_functiondef(oid) into v_fn_def from pg_proc where proname = 'accept_instructor_assignment';
  if v_fn_def is null then
    raise exception '075 failed: accept_instructor_assignment() is missing — the only remaining path to accepted';
  end if;
  if v_fn_def not ilike '%coin_transactions%' then
    raise exception '075 failed: accept_instructor_assignment() no longer writes coin_transactions';
  end if;

  raise notice '075 OK: client sessions can only set declined; accepted is reachable exclusively via accept_instructor_assignment().';
end $$;
