-- ============================================================
-- WOW - World of Work — Migration 050
-- Fixes a real race condition FOUND LIVE while testing WbsBuilder.tsx:
-- this app runs with `reactStrictMode: true` (next.config.js), which
-- deliberately double-invokes effects on mount in dev — WbsBuilder's
-- `load()` (called from useEffect) ran twice concurrently, and its
-- "if no rows exist, create the root item" check-then-insert is not
-- atomic. Both invocations saw zero rows and both inserted a root,
-- producing two `parent_id is null` rows for the same project —
-- confirmed live via a direct query against the real database, not
-- theorized.
--
-- FIX AT THE DATA LAYER, not just the component: a partial unique index
-- makes "at most one root per project" an actual guarantee, the same
-- way this codebase enforces every other invariant that matters (never
-- trust only the client/component code to prevent a bad state). The
-- second concurrent insert now fails with 23505 (unique_violation)
-- instead of silently succeeding — WbsBuilder.tsx is updated alongside
-- this migration to catch that specific case and re-fetch instead of
-- surfacing an error, so the race is harmless once this lands: one
-- request wins, the other cleanly backs off.
-- ============================================================

-- Clean up the duplicate root already created live during testing
-- before adding the constraint (the constraint creation would otherwise
-- fail against existing duplicate data). NOT `min(id)` — first attempt
-- at this failed live with "42883: function min(uuid) does not exist"
-- (Postgres has no built-in min/max aggregate for uuid, unlike its `<`/
-- `>` operators). row_number() over created_at (id as a deterministic
-- tiebreaker) keeps the earliest-created root per project instead.
delete from public.project_wbs_items t
using (
  select id,
         row_number() over (partition by project_id order by created_at, id) as rn
    from public.project_wbs_items
   where parent_id is null
) ranked
where t.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists idx_project_wbs_items_one_root_per_project
  on public.project_wbs_items (project_id)
  where parent_id is null;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_dupes int;
  v_index_exists int;
begin
  select count(*) into v_dupes from (
    select project_id from public.project_wbs_items
     where parent_id is null
     group by project_id
    having count(*) > 1
  ) d;
  if v_dupes > 0 then
    raise exception '050 failed: % project(s) still have more than one root', v_dupes;
  end if;

  select count(*) into v_index_exists
    from pg_indexes where indexname = 'idx_project_wbs_items_one_root_per_project';
  if v_index_exists <> 1 then
    raise exception '050 failed: unique index not created';
  end if;

  raise notice '050 OK: no project has more than one root, unique index enforced going forward';
end $$;
