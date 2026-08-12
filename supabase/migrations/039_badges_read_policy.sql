-- ============================================================
-- WOW - World of Work — Migration 039
-- Fixes a pre-existing gap found while live-testing 038: `public.badges`
-- has real, correctly-seeded rows (both the original schema.sql set and
-- 038's five new game badges — 038's own self-check confirmed the count
-- server-side) but is silently unreadable over PostgREST to EVERY client
-- role, signed in or not. Verified live: a real signed-in user's own JWT
-- reads `pricing_units` fine (3 rows) but gets `[]` from `badges` under
-- identical conditions.
--
-- No migration file touches `badges`' RLS at all (grepped every
-- migration + schema.sql — only `user_badges` has policies). The
-- symptom (200 OK, zero rows, no error) is the exact signature this
-- codebase already uses on purpose elsewhere for RLS-enabled-zero-
-- policies tables (quiz_answer_keys, game_spotter_answer_keys) — most
-- likely `badges` had RLS toggled on directly from the Supabase
-- dashboard's own security advisor (it nags about public tables without
-- RLS) without a matching policy ever being added, outside any tracked
-- migration. Whatever the exact history, the fix is the same either way:
-- badge definitions (name/description/icon) are not secret — they are
-- reference data the same way `pricing_units` and `game_generic_scenarios`
-- already are — so they get the identical "signed-in read" treatment.
-- ============================================================

alter table public.badges enable row level security;

-- Defensive: if the real root cause turns out to be a missing base
-- GRANT rather than RLS-without-a-policy, this ensures the fix holds
-- either way. Harmless no-op if the grant already existed.
grant select on public.badges to authenticated;

drop policy if exists "Badges: signed-in read" on public.badges;
create policy "Badges: signed-in read" on public.badges
  for select using (auth.uid() is not null);

-- ============================================================
-- SELF-CHECK
-- ============================================================

do $$
declare
  v_policies int;
  v_rows int;
begin
  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'badges';
  if v_policies <> 1 then
    raise exception 'badges must have exactly 1 policy (signed-in read), found %', v_policies;
  end if;

  select count(*) into v_rows from public.badges;
  raise notice '039 OK: badges RLS enabled with 1 read policy, % rows now visible to signed-in clients', v_rows;
end $$;
