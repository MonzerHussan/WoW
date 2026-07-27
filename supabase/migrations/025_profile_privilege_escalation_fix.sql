-- ============================================================
-- WOW - World of Work — Migration 025
-- CRITICAL SECURITY FIX — privilege escalation via self-UPDATE on profiles.
--
-- FOUND WHILE BUILDING 024, NOT THEORETICAL. Reproduced live against the
-- real project with an ordinary test account (role='user'), one request:
--
--   PATCH /rest/v1/profiles?id=eq.<own id>   {"role":"content_manager"}
--   -> 200, role is now content_manager
--   POST  /rest/v1/rpc/has_permission        {"perm":"content.manage"}
--   -> true
--   PATCH ... {"role":"admin"}               -> 204, role is now admin
--
-- Only `super_admin` was refused, by the 003 trigger
-- (guard_super_admin_promotion), which guards exactly one value and
-- nothing else. `admin` carries users.manage, content.manage,
-- content.moderate, roles.assign and audit.read — so any signed-up user
-- could grant themselves the entire staff permission set and then assign
-- roles to others.
--
-- ROOT CAUSE: schema.sql's policy
--     on public.profiles for update using (auth.uid() = id)
-- is column-blind. It correctly stops you editing SOMEONE ELSE's row,
-- but places no restriction on WHICH of your own columns you may write,
-- and `role` lives in that same row.
--
-- WHY THIS MATTERS FOR 024 SPECIFICALLY: update_pricing_unit and
-- update_coin_package_price gate on has_permission('content.manage').
-- Without this fix that gate is decorative — any user could self-grant
-- the permission and then legitimately pass it. The same applies
-- retroactively to the curriculum-review governance from 015b/015c,
-- which has gated the owner's decisive vote on content.manage since it
-- shipped.
--
-- APPROACH: a BEFORE UPDATE trigger rather than rewriting the RLS
-- policy. RLS WITH CHECK cannot compare against OLD, so a column-level
-- rule has to live in a trigger — which is also the pattern 003 already
-- established with guard_super_admin_promotion. The existing trigger is
-- left untouched; the two coexist.
--
-- SCOPE — deliberately narrow, verified against every client-session
-- writer of `profiles` in the codebase before choosing it:
--   * onboarding.service.ts writes account_type, onboarding_goal,
--     pmp_level_interest, age, gender, onboarding_completed — none
--     privileged, all still allowed.
--   * points.service.ts `awardPoints` writes points and level THROUGH
--     THE USER'S OWN SESSION. So points/level are NOT locked here: doing
--     so would break lesson completion and quiz rewards outright. That
--     is a real, separate hole (a user can PATCH their own
--     points/level directly — verified: points=999999, level=99
--     succeeded, and was reverted) and it is exactly the class of bug
--     CLAUDE.md rule #4 says must never return. Fixing it properly
--     requires moving awardPoints into a security-definer function like
--     award_quiz_points (013) already is — a bigger change than this
--     migration, tracked in SECURITY.md and TECH_DEBT.md.
-- ============================================================

create or replace function public.guard_profile_privileged_columns()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- Constrain ordinary client sessions only. PostgREST executes those as
  -- the `authenticated` (or `anon`) role, while service_role and
  -- SECURITY DEFINER functions run as their owner — which is precisely
  -- how a legitimate privileged write is supposed to reach these
  -- columns. Guarding on current_user, not auth.uid(), because auth.uid()
  -- stays set to the calling user even inside a definer function.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

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

  return new;
end $$;

drop trigger if exists trg_profiles_guard_privileged on public.profiles;
create trigger trg_profiles_guard_privileged
  before update on public.profiles
  for each row execute procedure public.guard_profile_privileged_columns();

-- How to legitimately grant a role from now on: run it as the project
-- owner in the SQL editor (service role / postgres), e.g.
--   update public.profiles set role = 'content_manager' where email = '...';
-- which bypasses this trigger by design. There is still NO in-app path
-- for an admin to assign roles to other users — RLS restricts profile
-- updates to your own row, so `roles.assign` has no write path at all.
-- Pre-existing gap, unchanged here, recorded in TECH_DEBT.
