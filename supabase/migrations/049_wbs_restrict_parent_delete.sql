-- ============================================================
-- WOW - World of Work — Migration 049
-- Fixes a real mismatch found while designing the WBS-builder UI: 043's
-- `project_wbs_items.parent_id` FK was declared `on delete cascade` —
-- deleting a parent would silently delete its entire subtree. The owner's
-- own instruction for the builder's v1 is the opposite: deleting an item
-- with children must be BLOCKED outright ("delete the branches first"),
-- not silently cascaded and not left orphaned. `on delete restrict`
-- (Postgres's default FK behavior, made explicit here) does exactly
-- that at the DATA layer — a delete attempt on a parent with existing
-- children fails with 23503, foreign_key_violation, before any row is
-- touched. The UI catches that specific error and shows the message;
-- it is not the only thing preventing the cascade (never trust only the
-- client — same rule this codebase applies everywhere else).
-- ============================================================

alter table public.project_wbs_items drop constraint if exists project_wbs_items_parent_id_fkey;
alter table public.project_wbs_items
  add constraint project_wbs_items_parent_id_fkey
  foreign key (parent_id) references public.project_wbs_items(id) on delete restrict;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_delete_rule text;
begin
  select rc.delete_rule into v_delete_rule
    from information_schema.referential_constraints rc
   where rc.constraint_name = 'project_wbs_items_parent_id_fkey';

  if v_delete_rule is distinct from 'RESTRICT' then
    raise exception '049 failed: expected RESTRICT, found %', v_delete_rule;
  end if;

  raise notice '049 OK: project_wbs_items.parent_id now ON DELETE RESTRICT';
end $$;
