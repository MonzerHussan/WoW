-- ============================================================
-- WOW - World of Work — Migration 002
-- Sprint 1: Database + RBAC foundation
-- Purely additive. Does not alter existing data or break
-- existing queries from schema.sql (001).
-- ============================================================

-- ------------------------------------------------------------
-- 1. RBAC FOUNDATION
-- ------------------------------------------------------------
-- `account_type` (student/job_seeker/freelancer/employee/company) is a
-- BUSINESS persona, not a permission level. Introduce a separate `app_role`
-- for actual authorization (admin panels, moderation, support tooling),
-- decoupled from the user's business category.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('user', 'moderator', 'admin');
  end if;
end $$;

alter table public.profiles
  add column if not exists role app_role not null default 'user';

-- Helper used inside RLS policies to check the caller's role without
-- re-querying profiles in every policy definition.
create or replace function public.current_user_role()
returns app_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Example of how future admin-only policies should be written
-- (not applied to any table yet — added in the sprint that needs it):
--
-- create policy "Admins can view all profiles"
--   on public.profiles for select
--   using (public.current_user_role() = 'admin');

-- ------------------------------------------------------------
-- 2. MISSING INDEXES ON FOREIGN KEYS
-- ------------------------------------------------------------
-- Postgres auto-indexes primary keys but NOT foreign key columns.
-- Every FK used in a WHERE/JOIN in application code should be indexed.
create index if not exists idx_enrollments_user_id on public.enrollments(user_id);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_pmp_levels_course_id on public.pmp_levels(course_id);
create index if not exists idx_user_badges_user_id on public.user_badges(user_id);
create index if not exists idx_user_badges_badge_id on public.user_badges(badge_id);
create index if not exists idx_horizon_progress_user_id on public.horizon_progress(user_id);
create index if not exists idx_ai_conversations_user_id_created_at
  on public.ai_conversations(user_id, created_at desc);
create index if not exists idx_profiles_account_type on public.profiles(account_type);
create index if not exists idx_profiles_role on public.profiles(role);

-- ------------------------------------------------------------
-- 3. updated_at AUTO-MAINTENANCE
-- ------------------------------------------------------------
-- `profiles.updated_at` had a default of now() but was never bumped on
-- UPDATE. Add a trigger so it actually reflects "last modified".
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 4. NAMING / CASCADE AUDIT NOTES (no schema change required)
-- ------------------------------------------------------------
-- - All tables use snake_case consistently. ✅
-- - All PKs use uuid_generate_v4(). ✅
-- - All FKs to profiles/auth.users use `on delete cascade`, which is
--   correct for user-owned rows (enrollments, badges, conversations,
--   horizon progress) — deleting a user cleans up their data. ✅
-- - `courses.id` referenced by `pmp_levels`/`enrollments` has no explicit
--   ON DELETE rule → defaults to NO ACTION. This is intentional: we do not
--   want deleting a course to silently cascade-delete user enrollment
--   history. Revisit if/when a "soft delete" pattern is introduced for
--   courses instead of hard deletes.
