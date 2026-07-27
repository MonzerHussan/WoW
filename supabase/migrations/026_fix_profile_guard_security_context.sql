-- ============================================================
-- WOW - World of Work — Migration 026
-- Fixes a defect in 025: the guard was installed correctly but never
-- enforced anything. Found by re-running the exact escalation test
-- after 025 was applied — all four PATCHes still returned 204 and the
-- columns really changed (role → admin, status → suspended,
-- identity_verified_at → set), then were reverted.
--
-- ROOT CAUSE — my error in 025, not a bad run:
-- `guard_profile_privileged_columns()` was declared SECURITY DEFINER.
-- Inside a SECURITY DEFINER function, `current_user` is the FUNCTION
-- OWNER (postgres), never the calling session role — that substitution
-- is the entire point of SECURITY DEFINER. So the early-out
--
--     if current_user not in ('authenticated', 'anon') then return new;
--
-- evaluated to TRUE on every single call, including ordinary PostgREST
-- requests, and the function returned before reaching any of its
-- checks. The guard was inert in exactly the case it existed for.
--
-- THE FIX: this trigger function must be SECURITY INVOKER (the default
-- — no `security definer` clause), so `current_user` reports the real
-- effective role of whoever is writing:
--   * PostgREST end-user request  -> 'authenticated' (or 'anon')  -> ENFORCED
--   * service_role key            -> 'service_role'               -> allowed
--   * Supabase SQL editor         -> 'postgres'                   -> allowed
--   * inside a SECURITY DEFINER fn owned by postgres
--     (award_quiz_points, spend_coins, update_pricing_unit ...)
--                                 -> 'postgres'                   -> allowed
-- which is precisely the distinction 025 intended and failed to make.
--
-- A trigger function does not need elevated privileges here: it only
-- compares OLD/NEW and raises. Nothing it does requires the owner's
-- rights, so SECURITY INVOKER costs nothing.
--
-- The logic is also restated positively (enforce for known client
-- roles) rather than as a negated early-out, so a future role name we
-- do not recognise fails OPEN for privileged/system contexts and never
-- silently disables the guard for end users the way the original did.
--
-- Scope is unchanged from 025: role, status, identity_verified_at.
-- points/level are still deliberately NOT guarded — `awardPoints`
-- (shared/services/points.service.ts) writes them through the user's
-- own session, so locking them would break lesson and quiz rewards.
-- That remains an open CRITICAL item (TECH_DEBT #20).
-- ============================================================

-- Dropped rather than replaced: changing the security attribute of a
-- live function is exactly the kind of thing worth doing explicitly.
drop trigger if exists trg_profiles_guard_privileged on public.profiles;
drop function if exists public.guard_profile_privileged_columns();

create function public.guard_profile_privileged_columns()
returns trigger language plpgsql
-- NO `security definer` here, deliberately. See the header: it is what
-- made 025 inert. Do not add it back.
set search_path = public
as $$
begin
  -- Enforce only for the roles PostgREST hands an end-user request to.
  -- Every other context (service_role, postgres, a SECURITY DEFINER
  -- function's owner) is a trusted server-side path and passes through.
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

  end if;

  return new;
end $$;

create trigger trg_profiles_guard_privileged
  before update on public.profiles
  for each row execute procedure public.guard_profile_privileged_columns();

-- Self-check: assert the function is NOT security definer, since that
-- single attribute is the whole bug this migration exists to fix.
do $$
declare
  v_secdef boolean;
  v_trigger int;
begin
  select prosecdef into v_secdef
    from pg_proc where proname = 'guard_profile_privileged_columns';
  if v_secdef is null then
    raise exception 'guard_profile_privileged_columns() was not created';
  end if;
  if v_secdef then
    raise exception 'guard_profile_privileged_columns() is SECURITY DEFINER — the 025 bug is still present';
  end if;

  select count(*) into v_trigger
    from pg_trigger
   where tgrelid = 'public.profiles'::regclass
     and tgname = 'trg_profiles_guard_privileged'
     and not tgisinternal;
  if v_trigger <> 1 then
    raise exception 'trg_profiles_guard_privileged is not installed on public.profiles';
  end if;

  raise notice '026 OK: guard is SECURITY INVOKER and the trigger is installed';
end $$;
