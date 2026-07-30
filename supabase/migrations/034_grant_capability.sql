-- ============================================================
-- WOW - World of Work — Migration 034
-- Closes TECH_DEBT #13: instructor/mentor/assessor were self-grantable
-- with zero verification, via the same broad "Own capabilities: manage"
-- policy meant for learner/job_seeker/freelancer/client.
--
-- CONFIRMED BEFORE WRITING THIS: no legitimate alternative grant path
-- existed anywhere — earner_profiles.verification_status and
-- assessor_calibration_results (008) are pure dead schema, read/written
-- by NOTHING in app/ or features/; every real authority check in this
-- codebase (award_quiz_points, recompute_employability_score,
-- quiz_attempts/entity_skills policies) only ever checks
-- user_capabilities membership. Closing self-service here without a
-- replacement would have left literally no way, not even for an admin,
-- to ever grant assessor/instructor/mentor again. This migration
-- therefore does both halves together: close the hole, open a real
-- door.
--
-- SELF-SERVICE STAYS for learner/job_seeker/freelancer/client — these
-- only ever grant authority over the caller's OWN data (enroll
-- yourself, apply for jobs as yourself, post your own projects). No
-- change in risk from letting a user pick these freely, same as today.
--
-- instructor/mentor/assessor now require grant_capability(), the exact
-- same shape as assign_role (031): SECURITY DEFINER, checks
-- has_permission('users.manage') — the existing permission, held by
-- exactly admin/super_admin (confirmed against role_permissions before
-- choosing it, same discipline as 031's roles.assign choice) — raises
-- 42501 loudly rather than returning false, writes audit_log
-- unconditionally. No new permission introduced.
-- ============================================================

drop policy "Own capabilities: manage" on public.user_capabilities;

-- INSERT only ever succeeds for the four capabilities that grant
-- authority over nothing but the caller's own data. A client attempt to
-- insert 'instructor'/'mentor'/'assessor' fails this WITH CHECK and
-- Postgres raises a real 403/42501 directly — no extra trigger needed,
-- unlike pricing_units/placement_usage (030): those had NO write policy
-- at all, which silently zeroes out UPDATE/DELETE row-matching before
-- any trigger runs. Here there IS a policy, so a failing INSERT is
-- already loud by construction.
create policy "Own capabilities: self-service insert" on public.user_capabilities
  for insert
  with check (
    auth.uid() = user_id
    and capability in ('learner', 'job_seeker', 'freelancer', 'client')
  );

-- Revoking any capability from yourself (including a staff-granted one)
-- is always safe — it only ever gives up authority, never gains it.
create policy "Own capabilities: self revoke" on public.user_capabilities
  for delete
  using (auth.uid() = user_id);

-- users.manage holders can see everyone's capabilities — needed for the
-- /admin/roles capability-grant screen to show current state at all
-- (the pre-existing "Own capabilities: read" policy is owner-only and
-- stays exactly as it was; this ORs an additional, narrowly-scoped read
-- on top of it).
create policy "Capabilities: users.manage holders read all" on public.user_capabilities
  for select using (public.has_permission('users.manage'));

create or replace function public.grant_capability(p_user uuid, p_capability user_capability)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Not authorized to grant capabilities'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user) then
    return false;
  end if;

  insert into public.user_capabilities (user_id, capability)
  values (p_user, p_capability)
  on conflict (user_id, capability) do nothing;

  -- Written unconditionally, including a no-op re-grant of an already-
  -- held capability: the trail records who authorized it and when, same
  -- reasoning as update_pricing_unit (024) and assign_role (031).
  insert into public.audit_log (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'capability.granted', 'profile', p_user, jsonb_build_object('capability', p_capability));

  return true;
end $$;

revoke execute on function public.grant_capability(uuid, user_capability) from anon;
grant execute on function public.grant_capability(uuid, user_capability) to authenticated;

-- Widen 031's profiles read policy to also cover users.manage holders,
-- not just roles.assign. Moot with today's exact seed (admin/super_admin
-- hold both), but the /admin/roles page's new capability-grant section
-- is gated on users.manage specifically — a future role holding
-- users.manage without roles.assign must still be able to list users to
-- grant a capability to, or this feature would be silently broken for
-- them despite passing its own permission check.
drop policy "Profiles: roles.assign holders can read all" on public.profiles;
create policy "Profiles: staff can read all for role/capability management" on public.profiles
  for select using (
    public.has_permission('roles.assign') or public.has_permission('users.manage')
  );

-- Self-check, same discipline as the rest of this migration family.
do $$
declare
  v_fn int;
  v_old_policy int;
  v_insert_policy int;
  v_delete_policy int;
  v_read_policy int;
  v_perm int;
begin
  select count(*) into v_fn from pg_proc where proname = 'grant_capability';
  if v_fn = 0 then
    raise exception 'grant_capability() was not created';
  end if;

  select count(*) into v_old_policy from pg_policies
   where schemaname = 'public' and tablename = 'user_capabilities'
     and policyname = 'Own capabilities: manage';
  if v_old_policy <> 0 then
    raise exception 'The old broad self-service policy still exists';
  end if;

  select count(*) into v_insert_policy from pg_policies
   where schemaname = 'public' and tablename = 'user_capabilities' and cmd = 'INSERT';
  if v_insert_policy <> 1 then
    raise exception 'Expected exactly 1 INSERT policy on user_capabilities, found %', v_insert_policy;
  end if;

  select count(*) into v_delete_policy from pg_policies
   where schemaname = 'public' and tablename = 'user_capabilities' and cmd = 'DELETE';
  if v_delete_policy <> 1 then
    raise exception 'Expected exactly 1 DELETE policy on user_capabilities, found %', v_delete_policy;
  end if;

  if (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'user_capabilities'
         and policyname = 'Capabilities: users.manage holders read all') <> 1 then
    raise exception 'Expected the staff-wide capabilities read policy to exist exactly once';
  end if;

  select count(*) into v_read_policy from pg_policies
   where schemaname = 'public' and tablename = 'profiles'
     and policyname = 'Profiles: staff can read all for role/capability management';
  if v_read_policy <> 1 then
    raise exception 'Expected the widened profiles read policy to exist exactly once, found %', v_read_policy;
  end if;

  select count(*) into v_perm from public.role_permissions where permission_key = 'users.manage';
  if v_perm = 0 then
    raise exception 'users.manage is not granted to any role — grant_capability would be uncallable by anyone';
  end if;

  raise notice '034 OK: grant_capability() installed, self-service scoped to 4 safe capabilities, granted to % role(s)', v_perm;
end $$;
