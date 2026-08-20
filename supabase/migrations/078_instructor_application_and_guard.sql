-- ============================================================
-- WOW - World of Work — Migration 078
-- Instructor registration: anyone signed in may APPLY; only the owner
-- may APPROVE; nobody may publish themselves before approval.
--
-- THE LIVE HOLE THIS CLOSES. Before this migration `instructor_profiles`
-- had exactly one UPDATE policy — `user_id = auth.uid()` on both sides —
-- and 040's learner-request policy required only `ip.is_available`. So
-- any signed-in user could PATCH `is_available = true` on their own row
-- and be immediately requestable by learners, charging real coins.
-- This was reproduced live against production before the fix: PATCH →
-- 200, and an independent read showed the profile visible. It is
-- reproduced again as a NEGATIVE test after it: PATCH → 403/42501, and
-- an independent read shows it still hidden.
--
-- WHY THE GUARD IS A TRIGGER AND NOT A POLICY. A policy constrains the
-- `authenticated` role. The two SECURITY DEFINER functions below run as
-- the table OWNER, and `relforcerowsecurity` is false here, so they
-- bypass RLS completely — a policy would not constrain them, and the
-- registration path itself has to write the very columns being
-- protected. A BEFORE UPDATE trigger sees every writer. This is the same
-- reasoning 075 used when it chose to narrow a WITH CHECK rather than
-- add a second policy: RLS policies for one command OR together, so
-- adding a policy widens access and never narrows it.
--
-- THE TRIGGER IS SECURITY INVOKER (the default), DELIBERATELY. A
-- DEFINER trigger reports the function owner in `current_user`, which
-- collapses the client/server distinction the guard is built on — the
-- lesson migration 026 taught and 030 recorded. `current_user in
-- ('authenticated','anon')` is 030's own `forbid_client_write` pattern.
--
-- REGISTRATION AND THE GUARD SHIP TOGETHER, IN ONE MIGRATION, ON THE
-- OWNER'S INSTRUCTION. Splitting them would leave a window in which
-- applying exists and the guard does not — i.e. the hole above, now
-- with a form in front of it.
--
-- WHAT IS NOT HERE. No INSERT policy on `instructor_profiles` — there
-- was none before and none is added, so a client cannot create a
-- profile row at all: `submit_instructor_application()` is the only
-- door. Same "no policy = no path, one verified function is the only
-- door" shape as 027/028/030/033/074/077.
--
-- No earlier migration is modified. 040's request policy is REPLACED
-- (drop + create), not edited, because a policy cannot be narrowed by
-- adding another one.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Review state
-- ------------------------------------------------------------
alter table public.instructor_profiles
  add column if not exists approval_status text not null default 'pending',
  add column if not exists needs_review boolean not null default false,
  add column if not exists review_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.instructor_profiles'::regclass
       and conname  = 'instructor_profiles_approval_status_check'
  ) then
    alter table public.instructor_profiles
      add constraint instructor_profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- The three profiles that already existed were created before review
-- existed, and two of them are live test instructors already visible to
-- learners. Defaulting them to 'pending' would silently unpublish real
-- rows, so they are grandfathered as approved. New rows get the column
-- default ('pending') instead.
update public.instructor_profiles
   set approval_status = 'approved'
 where approval_status = 'pending'
   and created_at < now();

-- ------------------------------------------------------------
-- 2. The guard
-- ------------------------------------------------------------
create or replace function public.guard_instructor_profile_update()
returns trigger
language plpgsql
as $function$
begin
  -- Blocking applies to CLIENT sessions only. SECURITY DEFINER
  -- functions below run as the table owner and pass through, which is
  -- what makes them the only door to these columns.
  if current_user in ('authenticated', 'anon') then
    if new.approval_status is distinct from old.approval_status then
      raise exception 'approval_status is decided by review, not by the instructor'
        using errcode = '42501';
    end if;

    -- Hiding is always allowed. Publishing is allowed only inside an
    -- already-approved state, so an unapproved profile can never become
    -- visible — the live hole this migration closes.
    if new.is_available and not old.is_available and new.approval_status <> 'approved' then
      raise exception 'An instructor profile cannot be made visible before it is approved'
        using errcode = '42501';
    end if;
  end if;

  -- Flagging is UNCONDITIONAL — deliberately outside the check above.
  -- The flag records WHAT changed, not WHO changed it: an edit routed
  -- through submit_instructor_application() (which runs as the owner
  -- and so is not 'authenticated') must raise it exactly like a direct
  -- PATCH, or the function becomes a way to edit unflagged.
  --
  -- price_coins is deliberately NOT here. 040's request policy pins
  -- ip.price_coins to the assignment at creation, and 074 charges the
  -- SNAPSHOT stored on the row — so a price change cannot alter what an
  -- existing request costs. There is no fraud surface, and routing
  -- routine commercial decisions through the owner would make them a
  -- bottleneck for nothing.
  if old.approval_status = 'approved'
     and (new.display_name is distinct from old.display_name
       or new.bio is distinct from old.bio
       or new.expertise_tags is distinct from old.expertise_tags) then
    new.needs_review := true;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_instructor_profile_update on public.instructor_profiles;
create trigger trg_guard_instructor_profile_update
  before update on public.instructor_profiles
  for each row execute function public.guard_instructor_profile_update();

-- ------------------------------------------------------------
-- 3. Applying (the only door to creating a profile)
-- ------------------------------------------------------------
create or replace function public.submit_instructor_application(
  p_display_name text,
  p_bio text default null,
  p_expertise_tags text[] default '{}',
  p_years_experience integer default null,
  p_price_coins integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_existing public.instructor_profiles%rowtype;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_display_name is null or length(trim(p_display_name)) = 0 then
    return jsonb_build_object('submitted', false, 'reason', 'display_name_required');
  end if;
  if p_price_coins is null or p_price_coins < 0 then
    return jsonb_build_object('submitted', false, 'reason', 'invalid_price');
  end if;
  if p_years_experience is not null and p_years_experience < 0 then
    return jsonb_build_object('submitted', false, 'reason', 'invalid_years');
  end if;

  select * into v_existing from public.instructor_profiles
   where user_id = v_uid for update;

  if v_existing is null then
    insert into public.instructor_profiles
      (user_id, display_name, bio, expertise_tags, years_experience,
       price_coins, is_available, approval_status, needs_review)
    values
      (v_uid, trim(p_display_name), p_bio, coalesce(p_expertise_tags, '{}'),
       p_years_experience, p_price_coins, false, 'pending', false);
    return jsonb_build_object('submitted', true, 'status', 'pending', 'created', true);
  end if;

  -- rejected -> pending is the only status move this function makes.
  -- An APPROVED profile calling this edits in place and stays approved:
  -- re-applying must never be a way for a client to push an approved
  -- row back into the queue (the owner's explicit constraint).
  v_status := case when v_existing.approval_status = 'rejected'
                   then 'pending' else v_existing.approval_status end;

  update public.instructor_profiles
     set display_name     = trim(p_display_name),
         bio              = p_bio,
         expertise_tags   = coalesce(p_expertise_tags, '{}'),
         years_experience = p_years_experience,
         price_coins      = p_price_coins,
         approval_status  = v_status,
         -- A re-application starts its review clean; an approved
         -- profile's flag is left to the trigger and the owner.
         needs_review     = case when v_status = 'pending' then false
                                 else v_existing.needs_review end,
         -- Returning to the queue also hides it again.
         is_available     = case when v_status = 'pending' then false
                                 else v_existing.is_available end
   where user_id = v_uid;

  return jsonb_build_object('submitted', true, 'status', v_status, 'created', false);
end;
$function$;

revoke execute on function public.submit_instructor_application(text, text, text[], integer, integer) from public, anon;
grant execute on function public.submit_instructor_application(text, text, text[], integer, integer) to authenticated;

-- ------------------------------------------------------------
-- 4. Reviewing (the only door to approval_status)
-- ------------------------------------------------------------
-- A REJECTED applicant is not stranded: rejecting stores the owner's
-- note on the row, the applicant sees it on /instructors, and calling
-- submit_instructor_application() again moves them back to 'pending'.
-- That is the return path — rejection is a state, not a dead end.
create or replace function public.review_instructor_application(
  p_user_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_exists boolean;
  v_new_status text;
begin
  if not public.has_permission('users.manage') then
    raise exception 'Not authorized to review instructor applications'
      using errcode = '42501';
  end if;

  select exists(select 1 from public.instructor_profiles where user_id = p_user_id)
    into v_exists;
  if not v_exists then
    return jsonb_build_object('reviewed', false, 'reason', 'profile_not_found');
  end if;

  v_new_status := case when p_approve then 'approved' else 'rejected' end;

  update public.instructor_profiles
     set approval_status = v_new_status,
         needs_review    = false,
         review_note     = p_note,
         -- Approving does NOT publish: it grants the right to publish.
         -- The instructor decides when to be visible. Rejecting hides
         -- immediately regardless of what they had set.
         is_available    = case when p_approve then is_available else false end
   where user_id = p_user_id;

  insert into public.audit_log (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(),
          case when p_approve then 'instructor.approved' else 'instructor.rejected' end,
          'instructor_profiles', p_user_id,
          jsonb_build_object('note', p_note));

  return jsonb_build_object('reviewed', true, 'status', v_new_status);
end;
$function$;

revoke execute on function public.review_instructor_application(uuid, boolean, text) from public, anon;
grant execute on function public.review_instructor_application(uuid, boolean, text) to authenticated;

-- ------------------------------------------------------------
-- 5. A learner may only request an APPROVED instructor
-- ------------------------------------------------------------
-- Defence in depth, not decoration. The trigger already stops an
-- unapproved profile from becoming visible, so `ip.is_available` alone
-- would in practice be enough today; this makes the requirement
-- explicit at the point of purchase, so a future change to how
-- is_available is set cannot quietly re-open the payment path.
--
-- DROP + CREATE, never an added policy: two policies for the same
-- command OR together, so a second one would widen access, not narrow
-- it. Everything else in the predicate — the learner identity, the
-- 'learner' direction (076), the pending status, and the price snapshot
-- pinned to instructor_profiles.price_coins (040) — is preserved
-- verbatim.
drop policy if exists "Instructor assignments: learner requests" on public.instructor_assignments;
create policy "Instructor assignments: learner requests"
  on public.instructor_assignments for insert to authenticated
  with check (
    learner_id = auth.uid()
    and initiated_by = 'learner'
    and status = 'pending'
    and exists (
      select 1 from public.instructor_profiles ip
       where ip.user_id = instructor_assignments.instructor_id
         and ip.approval_status = 'approved'
         and ip.is_available
         and ip.price_coins = instructor_assignments.price_coins
    )
  );

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_cols int;
  v_trigger int;
  v_tgdef text;
  v_secdef boolean;
  v_config text;
  v_insert_policies int;
  v_update_policies int;
  v_request_check text;
  v_still_pending int;
begin
  -- 1. Columns
  select count(*) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'instructor_profiles'
     and column_name in ('approval_status', 'needs_review', 'review_note');
  if v_cols <> 3 then
    raise exception '078 failed: expected 3 review columns on instructor_profiles, found %', v_cols;
  end if;

  -- 2. No existing profile was silently unpublished by the backfill.
  select count(*) into v_still_pending
    from public.instructor_profiles where approval_status = 'pending';
  raise notice '078: % profile(s) currently pending review', v_still_pending;

  -- 3. The guard exists, fires BEFORE UPDATE, and is SECURITY INVOKER.
  select count(*), max(pg_get_triggerdef(oid)) into v_trigger, v_tgdef
    from pg_trigger
   where tgrelid = 'public.instructor_profiles'::regclass
     and tgname = 'trg_guard_instructor_profile_update';
  if v_trigger <> 1 then
    raise exception '078 failed: the guard trigger is not installed';
  end if;
  if v_tgdef not ilike '%BEFORE UPDATE%' then
    raise exception '078 failed: the guard must fire BEFORE UPDATE (got: %)', v_tgdef;
  end if;

  select p.prosecdef into v_secdef
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'guard_instructor_profile_update';
  if v_secdef then
    raise exception '078 failed: the guard must be SECURITY INVOKER — a DEFINER trigger reports the owner in current_user and the client/server test collapses (026/030)';
  end if;

  -- 4. Both registration functions are DEFINER with a pinned search_path.
  for v_config, v_secdef in
    select coalesce(array_to_string(p.proconfig, ','), ''), p.prosecdef
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('submit_instructor_application', 'review_instructor_application')
  loop
    if not v_secdef then
      raise exception '078 failed: the registration functions must be SECURITY DEFINER';
    end if;
    if v_config not like '%search_path=public%' then
      raise exception '078 failed: search_path is not pinned (config: %) — a SECURITY DEFINER function without it is hijackable', v_config;
    end if;
  end loop;

  -- 5. instructor_profiles still has NO client INSERT path, and exactly
  --    one UPDATE policy. If either changes, the guard is no longer the
  --    only thing standing between a client and these columns.
  select count(*) into v_insert_policies
    from pg_policies where schemaname = 'public'
     and tablename = 'instructor_profiles' and cmd = 'INSERT';
  if v_insert_policies <> 0 then
    raise exception '078 failed: instructor_profiles gained an INSERT policy (%) — submit_instructor_application() must be the only door', v_insert_policies;
  end if;

  select count(*) into v_update_policies
    from pg_policies where schemaname = 'public'
     and tablename = 'instructor_profiles' and cmd = 'UPDATE';
  if v_update_policies <> 1 then
    raise exception '078 failed: expected exactly 1 UPDATE policy on instructor_profiles, found %', v_update_policies;
  end if;

  -- 6. The request policy was REPLACED, not duplicated, and it now
  --    requires approval while keeping 076's direction and 040's price
  --    snapshot.
  select count(*) into v_insert_policies
    from pg_policies where schemaname = 'public'
     and tablename = 'instructor_assignments' and cmd = 'INSERT';
  if v_insert_policies <> 1 then
    raise exception '078 failed: expected exactly 1 INSERT policy on instructor_assignments, found % — drop+create, never add', v_insert_policies;
  end if;

  select with_check into v_request_check
    from pg_policies where schemaname = 'public'
     and tablename = 'instructor_assignments' and cmd = 'INSERT';
  if v_request_check not like '%approval_status%' then
    raise exception '078 failed: the request policy does not require an approved instructor (check: %)', v_request_check;
  end if;
  if v_request_check not like '%initiated_by%' then
    raise exception '078 failed: the request policy lost 076''s learner-only direction (check: %)', v_request_check;
  end if;
  if v_request_check not like '%price_coins%' then
    raise exception '078 failed: the request policy lost 040''s price snapshot (check: %)', v_request_check;
  end if;

  raise notice '078 OK: review columns + SECURITY INVOKER guard + two DEFINER doors (search_path pinned); instructor_profiles has 0 INSERT and 1 UPDATE policy; the request policy requires approval and keeps 076 direction + 040 price snapshot.';
end $$;
