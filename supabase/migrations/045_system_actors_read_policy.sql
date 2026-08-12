-- ============================================================
-- WOW - World of Work — Migration 045
-- 044's reseed self-check passed (it runs as the table owner, which
-- bypasses RLS) but a real signed-in client's own JWT still reads
-- `system_actors` as `[]` afterward — the exact "200 OK, zero rows, no
-- error" signature TECH_DEBT #32 already diagnosed once for `badges`
-- (migration 039): RLS silently enabled with zero policies, most likely
-- via the Supabase dashboard's own security advisor nagging about public
-- tables without RLS, outside any tracked migration. No migration file
-- ever touched `system_actors`' RLS — 013's comment ("plain GRANT, not
-- an RLS policy — this table has no RLS") was true when written and is
-- exactly the assumption that silently broke.
--
-- 013 granted SELECT to both `anon` and `authenticated` (this is public
-- reference data — actor names like 'nova', not secret), so the fix
-- restores that same scope via `using (true)`, not narrowed to
-- signed-in-only the way 039 did for badges (badges didn't need anon
-- access; system_actors' original grant explicitly did).
-- ============================================================

alter table public.system_actors enable row level security;

-- Defensive, same reasoning as 039: harmless no-op if the grant already
-- held, restores it if that turns out to be part of the real cause too.
grant select on public.system_actors to anon, authenticated;

drop policy if exists "System actors: public read" on public.system_actors;
create policy "System actors: public read" on public.system_actors
  for select using (true);

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_policies int;
  v_rows int;
begin
  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'system_actors';
  if v_policies <> 1 then
    raise exception 'system_actors must have exactly 1 policy (public read), found %', v_policies;
  end if;

  select count(*) into v_rows from public.system_actors;
  raise notice '045 OK: system_actors RLS enabled with 1 public-read policy, % rows now visible to clients', v_rows;
end $$;
