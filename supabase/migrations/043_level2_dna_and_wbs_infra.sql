-- ============================================================
-- WOW - World of Work — Migration 043
-- Shared infrastructure for Level 2 (Project Planning & Control), reused
-- by Levels 3-4 later. Two independent pieces, per ARCHITECTURE_levels2-4
-- _strategy.md and the owner's own decisions (2026-08-06):
--
--   A) career_score_types — a reference table replacing career_scores'
--      hardcoded score_type CHECK. A future DNA layer (leadership,
--      executive) is added by INSERTing a row here, never by an ALTER
--      TABLE migration. dna_layer groups score types by which future
--      layer they belong to; today's three real types (employability,
--      promotion, trust — the last from 005) are all 'career'.
--
--   B) project_wbs_items — a real hierarchical Work Breakdown Structure
--      (self-referencing parent_id), because a flat list would defeat
--      the actual PMBOK teaching point. UI starts shallow (2-3 levels)
--      but the schema itself has no depth limit — a guard trigger only
--      blocks a parent belonging to a DIFFERENT project or a row
--      parenting itself, not depth.
--
-- SCOPE NOTE: this migration builds the reusable substrate only. It does
-- NOT seed any Level 2/3/4 content, does NOT add new career_score_types
-- rows beyond today's real three, and does NOT touch kb_scoring_rules,
-- the scenario engine, or the narrative template service — those are
-- separate, still-pending pieces of the Level 2 brief.
-- ============================================================

-- ------------------------------------------------------------
-- A. career_score_types
-- ------------------------------------------------------------
create table if not exists public.career_score_types (
  key text primary key,
  label_ar text not null,
  label_en text not null,
  dna_layer text not null check (dna_layer in ('career', 'leadership', 'executive')),
  created_at timestamptz not null default now()
);

alter table public.career_score_types enable row level security;

-- Reference data, not secret — same "signed-in read" treatment as
-- pricing_units and game_generic_scenarios. No insert/update/delete
-- policy: new score types are provisioned administratively (matches
-- instructor_profiles' own "provisioned administratively, no INSERT
-- policy" precedent from migration 040) — never a client write surface.
drop policy if exists "Career score types: signed-in read" on public.career_score_types;
create policy "Career score types: signed-in read" on public.career_score_types
  for select using (auth.uid() is not null);

-- Seeds today's real, already-live score types only (employability,
-- promotion from 004; trust from 005's widened CHECK) — retroactively
-- documenting current reality, not inventing new ones.
insert into public.career_score_types (key, label_ar, label_en, dna_layer) values
  ('employability', 'قابلية التوظيف', 'Employability', 'career'),
  ('promotion',      'الترقية',         'Promotion',      'career'),
  ('trust',          'الثقة',           'Trust',          'career')
on conflict (key) do nothing;

-- Replace the hardcoded CHECK (005's career_scores_score_type_check) with
-- a foreign key into the new reference table — this is the actual change
-- that makes a future score type a data INSERT, not a schema migration.
alter table public.career_scores drop constraint if exists career_scores_score_type_check;
alter table public.career_scores
  add constraint career_scores_score_type_fkey
  foreign key (score_type) references public.career_score_types(key);

-- ------------------------------------------------------------
-- B. project_wbs_items — real hierarchy, not a flat list
-- ------------------------------------------------------------
create table if not exists public.project_wbs_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.project_wbs_items(id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_wbs_items_project
  on public.project_wbs_items(project_id, parent_id, order_index);

drop trigger if exists trg_project_wbs_items_updated_at on public.project_wbs_items;
create trigger trg_project_wbs_items_updated_at before update on public.project_wbs_items
  for each row execute procedure public.set_updated_at();

-- Guard: a parent must belong to the SAME project (blocks a cross-project
-- parent_id, whether by bug or by a malicious client trying to graft its
-- own WBS item under another owner's tree) and must not be itself
-- (blocks the trivial one-row cycle). Deeper cycles are not possible
-- today since a row can only ever point to an ALREADY-EXISTING parent_id
-- at insert time, and parent_id is immutable in practice here (no UI
-- reparenting yet) — revisit if reparenting is ever added.
create or replace function public.guard_wbs_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A WBS item cannot be its own parent' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.project_wbs_items p
       where p.id = new.parent_id and p.project_id = new.project_id
    ) then
      raise exception 'WBS parent must belong to the same project' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_wbs_parent on public.project_wbs_items;
create trigger trg_guard_wbs_parent
  before insert or update on public.project_wbs_items
  for each row execute procedure public.guard_wbs_parent();

alter table public.project_wbs_items enable row level security;

drop policy if exists "WBS items: owner reads" on public.project_wbs_items;
create policy "WBS items: owner reads" on public.project_wbs_items
  for select using (
    exists (select 1 from public.projects p where p.id = project_wbs_items.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "WBS items: owner inserts" on public.project_wbs_items;
create policy "WBS items: owner inserts" on public.project_wbs_items
  for insert with check (
    exists (select 1 from public.projects p where p.id = project_wbs_items.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "WBS items: owner updates" on public.project_wbs_items;
create policy "WBS items: owner updates" on public.project_wbs_items
  for update using (
    exists (select 1 from public.projects p where p.id = project_wbs_items.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_wbs_items.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "WBS items: owner deletes" on public.project_wbs_items;
create policy "WBS items: owner deletes" on public.project_wbs_items
  for delete using (
    exists (select 1 from public.projects p where p.id = project_wbs_items.project_id and p.owner_id = auth.uid())
  );

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_score_types int;
  v_score_type_policies int;
  v_wbs_policies int;
  v_fk_exists int;
begin
  select count(*) into v_score_types from public.career_score_types;
  if v_score_types <> 3 then
    raise exception 'Expected exactly 3 seeded career_score_types, found %', v_score_types;
  end if;

  select count(*) into v_score_type_policies
    from pg_policies where schemaname = 'public' and tablename = 'career_score_types';
  if v_score_type_policies <> 1 then
    raise exception 'career_score_types must have exactly 1 policy (signed-in read), found %', v_score_type_policies;
  end if;

  select count(*) into v_fk_exists
    from pg_constraint where conname = 'career_scores_score_type_fkey';
  if v_fk_exists <> 1 then
    raise exception 'career_scores_score_type_fkey was not created';
  end if;

  select count(*) into v_wbs_policies
    from pg_policies where schemaname = 'public' and tablename = 'project_wbs_items';
  if v_wbs_policies <> 4 then
    raise exception 'project_wbs_items must have exactly 4 policies, found %', v_wbs_policies;
  end if;

  raise notice '043 OK: career_score_types (3 seeded, FK replacing CHECK) + project_wbs_items (hierarchical, guarded) created';
end $$;
