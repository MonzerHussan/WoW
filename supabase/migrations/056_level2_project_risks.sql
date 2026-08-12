-- ============================================================
-- WOW - World of Work — Migration 056
-- Level 2 Unit 5's real deliverable: a genuine Risk Register per
-- project. Design approved by the owner (2026-08-07) — mirrors
-- project_wbs_items (043) exactly: owner-scoped RLS via projects.
-- owner_id, no RPC (no money/scoring involved, same simplicity
-- DecisionLogPanel/WbsBuilder already use), direct client writes.
--
-- risk_score is a STORED GENERATED column (probability × impact) —
-- computed by Postgres itself, never trusted from the client and never
-- capable of drifting from its two inputs (no application code has to
-- remember to keep it in sync).
-- ============================================================

create table if not exists public.project_risks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  description text not null,
  probability int not null check (probability between 1 and 5),
  impact int not null check (impact between 1 and 5),
  risk_score int generated always as (probability * impact) stored,
  response_strategy text not null check (response_strategy in ('avoid', 'mitigate', 'transfer', 'accept')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_risks_project on public.project_risks(project_id, risk_score desc);

drop trigger if exists trg_project_risks_updated_at on public.project_risks;
create trigger trg_project_risks_updated_at before update on public.project_risks
  for each row execute procedure public.set_updated_at();

alter table public.project_risks enable row level security;

drop policy if exists "Project risks: owner reads" on public.project_risks;
create policy "Project risks: owner reads" on public.project_risks
  for select using (
    exists (select 1 from public.projects p where p.id = project_risks.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "Project risks: owner inserts" on public.project_risks;
create policy "Project risks: owner inserts" on public.project_risks
  for insert with check (
    exists (select 1 from public.projects p where p.id = project_risks.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "Project risks: owner updates" on public.project_risks;
create policy "Project risks: owner updates" on public.project_risks
  for update using (
    exists (select 1 from public.projects p where p.id = project_risks.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_risks.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "Project risks: owner deletes" on public.project_risks;
create policy "Project risks: owner deletes" on public.project_risks
  for delete using (
    exists (select 1 from public.projects p where p.id = project_risks.project_id and p.owner_id = auth.uid())
  );

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_policies int;
  v_generated_ok boolean;
begin
  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'project_risks';
  if v_policies <> 4 then
    raise exception '056 failed: expected 4 policies on project_risks, found %', v_policies;
  end if;

  select is_generated = 'ALWAYS' into v_generated_ok
    from information_schema.columns
   where table_schema = 'public' and table_name = 'project_risks' and column_name = 'risk_score';
  if not coalesce(v_generated_ok, false) then
    raise exception '056 failed: risk_score is not a generated column';
  end if;

  raise notice '056 OK: project_risks created, 4 owner-scoped policies, risk_score generated';
end $$;
