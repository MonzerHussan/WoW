-- ============================================================
-- WOW - World of Work — Migration 044
-- FIXES A DISCOVERED PRODUCTION BUG, unrelated to 043 — found while
-- live-testing 043's career_scores FK (needed a real system_actors row
-- to insert a valid career_scores test row, and the query returned zero
-- rows on the real Supabase project).
--
-- `system_actors` (003) was seeded once with ('nova', ...) and
-- ('scheduler', ...), but the live project's table is EMPTY —
-- content-range came back `*/0` on a direct signed-in read (a table
-- with an active RLS policy and zero real rows shows `0-.../0`; this
-- came back with no range at all, and career_score_types' own read in
-- the same test correctly showed `0-2/3` for comparison). The seed
-- insert from 003 never landed on this project, or was later removed —
-- root cause not determinable from here, only the missing effect.
--
-- IMPACT (both silent no-ops, no error anywhere, exactly the failure
-- mode T6 warns against): every AI-generated career recommendation
-- (`career_recommendations`, written from app/api/agent/route.ts) has
-- been silently dropped — `if (novaActor) { insert... }` with
-- `novaActor` always null. Every Employability score recomputation
-- (`recomputeEmployabilityScore`, features/lms/services/dna.service.ts)
-- has been silently skipped the same way. Neither path logs or throws;
-- both simply do nothing. This has been happening since whenever the
-- row went missing, not since today.
--
-- FIX: content-only re-seed, `on conflict (name) do nothing` so this is
-- safe to run even if one of the two rows is actually present.
-- ============================================================

insert into public.system_actors (name, description) values
  ('nova', 'AI mentor agent'),
  ('scheduler', 'Background jobs: points, badge sweeps, digests')
on conflict (name) do nothing;

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.system_actors where name in ('nova', 'scheduler');
  if v_count <> 2 then
    raise exception '044 failed: expected both nova and scheduler rows, found %', v_count;
  end if;
  raise notice '044 OK: system_actors has both nova and scheduler rows';
end $$;
