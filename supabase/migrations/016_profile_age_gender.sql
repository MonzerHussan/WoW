-- ============================================================
-- WOW - World of Work — Migration 016
-- Adds precise age + gender to profiles, per an explicit, deliberately
-- deferred owner decision (RBAC.md "تحديث حرج على سياسة القاصرين",
-- 2026-07-23): collect exact age at signup now, with no under-18 block
-- and no guardian consent yet — that policy call is still open and
-- tracked as a launch blocker.
--
-- Both columns are nullable at the DB level even though the onboarding
-- UI treats age as mandatory going forward: `handle_new_user()` (007)
-- inserts the profiles row at signup time, before onboarding ever runs,
-- so there is no value to write yet at INSERT time. Existing profiles
-- (pre-dating this migration) also have no value and are not
-- backfilled — there is nothing to backfill from.
--
-- Security note: `profiles` SELECT is already owner-only ("Profiles are
-- viewable by owner", schema.sql) — no organization-facing policy
-- exists on this table at all, unlike career_profiles/career_scores
-- which are gated per-org through career_consents.scope. Today, that
-- means age/gender reach no org-facing query. Whether `age` specifically
-- should ever be foldable into a future career_consents.scope is an
-- open policy question tied to the still-pending minors-policy decision
-- in RBAC.md — see DOMAIN_CONTRACTS.md §11. Not the same guarantee as
-- T4 (personality data), which is a closed, permanent exclusion by
-- schema design. `gender` has no documented sensitivity decision at all.
-- ============================================================

alter table public.profiles
  add column if not exists age int,
  add column if not exists gender text;

alter table public.profiles
  drop constraint if exists profiles_age_check;
alter table public.profiles
  add constraint profiles_age_check check (age is null or age between 5 and 120);

alter table public.profiles
  drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check check (gender is null or gender in ('male', 'female', 'prefer_not_to_say'));
