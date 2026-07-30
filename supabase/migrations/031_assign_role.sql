-- ============================================================
-- WOW - World of Work — Migration 031
-- Closes TECH_DEBT #21: `roles.assign` had no write path at all.
--
-- 025/026 correctly block `profiles.role` from any client-session UPDATE
-- — that fix stays untouched. The gap it left behind: an admin holding
-- `roles.assign` had no in-app way to actually assign a role to anyone;
-- roles could only be granted out-of-band in the SQL editor.
--
-- PERMISSION: the EXISTING `roles.assign` (003), already held by exactly
-- `admin` and `super_admin` — not a new permission. TECH_DEBT #21's own
-- fix note prescribes reusing it, and it is the precise permission this
-- feature is named after; inventing a parallel one would just be two
-- keys that must always be granted together.
--
-- READ SIDE: the admin/roles screen needs to list users to assign roles
-- to them, but `profiles` has only ever had an owner-only SELECT policy
-- (schema.sql) — there is no staff-wide read path at all yet (002's own
-- comment left it as a placeholder). This migration adds one, scoped to
-- the same `roles.assign` permission, so nothing widens beyond what this
-- feature itself needs. Permissive policies OR together, so the existing
-- owner policy is untouched and unaffected.
--
-- WRITE SIDE: `assign_role`, a SECURITY DEFINER function following the
-- exact shape of `update_pricing_unit` (024) — checks the permission
-- itself and raises 42501 (loud, not a silent false) on refusal,
-- verifies the target row exists, writes an audit_log row on every
-- successful change including a no-op (old = new), same as 024.
--
-- SUPER_ADMIN PROMOTION STAYS GATED BY roles.assign_super. The existing
-- `trg_guard_super_admin` (003) trigger already enforces this on ANY
-- update of `profiles.role` — including one issued from inside this
-- SECURITY DEFINER function, since that trigger reads auth.uid() (the
-- real calling user, unaffected by SECURITY DEFINER — 026's own finding)
-- rather than current_user. `assign_role` also checks it explicitly up
-- front so a denial is a clear, immediate error rather than surfacing
-- from a second, less obvious trigger.
--
-- WHY THE UPDATE ITSELF IS NOT BLOCKED BY 026's GUARD: that trigger
-- (`trg_profiles_guard_privileged`) only enforces for `current_user in
-- ('authenticated','anon')`. Inside this SECURITY DEFINER function,
-- current_user reports the function owner (postgres) — precisely the
-- "legitimate privileged write" path 025's own trailing comment already
-- described as the intended future fix for this exact gap.
-- ============================================================

-- Staff-wide read, scoped to the same permission as the write. Does not
-- replace or narrow "Profiles are viewable by owner" — permissive
-- policies OR together, so an ordinary user's own-row visibility is
-- unchanged.
drop policy if exists "Profiles: roles.assign holders can read all" on public.profiles;
create policy "Profiles: roles.assign holders can read all" on public.profiles
  for select using (public.has_permission('roles.assign'));

create or replace function public.assign_role(p_user uuid, p_role app_role)
returns boolean language plpgsql security definer
set search_path = public
as $$
declare
  v_old app_role;
begin
  if not public.has_permission('roles.assign') then
    raise exception 'Not authorized to assign roles'
      using errcode = '42501';
  end if;

  -- Defense in depth, mirroring guard_super_admin_promotion (003), which
  -- also enforces this below on the UPDATE itself. Checked here first so
  -- a denial is immediate and unambiguous rather than surfacing from a
  -- second trigger.
  if p_role = 'super_admin' and not public.has_permission('roles.assign_super') then
    raise exception 'Only a super_admin can assign super_admin'
      using errcode = '42501';
  end if;

  select role into v_old from public.profiles where id = p_user for update;
  if not found then
    return false;
  end if;

  update public.profiles set role = p_role where id = p_user;

  -- Written unconditionally, including a no-op (old = new): the trail
  -- records who touched the role and when, same as update_pricing_unit.
  insert into public.audit_log (actor_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'role.assigned',
    'profile',
    p_user,
    jsonb_build_object('old_role', v_old, 'new_role', p_role)
  );

  return true;
end $$;

-- Same defense-in-depth as 024/029: has_permission already rejects an
-- anonymous caller (auth.uid() is null -> no profile row -> false), but
-- revoking EXECUTE means that rejection never has to run.
revoke execute on function public.assign_role(uuid, app_role) from anon;
grant execute on function public.assign_role(uuid, app_role) to authenticated;

-- Self-check, same discipline as 024/029.
do $$
declare
  v_fn int;
  v_policy int;
  v_perm int;
begin
  select count(*) into v_fn from pg_proc where proname = 'assign_role';
  if v_fn = 0 then
    raise exception 'assign_role() was not created';
  end if;

  select count(*) into v_policy from pg_policies
   where schemaname = 'public' and tablename = 'profiles'
     and policyname = 'Profiles: roles.assign holders can read all';
  if v_policy <> 1 then
    raise exception 'Expected the new profiles read policy to exist exactly once, found %', v_policy;
  end if;

  select count(*) into v_perm from public.role_permissions where permission_key = 'roles.assign';
  if v_perm = 0 then
    raise exception 'roles.assign is not granted to any role — assign_role would be uncallable by anyone';
  end if;

  raise notice '031 OK: assign_role() installed, profiles read policy added, roles.assign granted to % role(s)', v_perm;
end $$;
