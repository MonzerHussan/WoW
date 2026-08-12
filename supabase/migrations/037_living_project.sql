-- ============================================================
-- WOW - World of Work — Migration 037
-- "Living Project" foundation (TASK_level1_living_project.md), the
-- prerequisite the Level-1 games task explicitly depends on and does
-- NOT implement itself.
--
-- OWNER DECISIONS THIS MIGRATION IMPLEMENTS (not this session's defaults):
--  1. Multiple projects per trainee, coin-gated, no cap. Overturns this
--     session's own initial recommendation (unique(owner_id)) — the
--     owner decided against it explicitly, so there is deliberately NO
--     unique constraint on projects.owner_id below.
--  2. "Moment of birth" stays optional (a banner, never a lesson gate).
--     No middleware, no access check added anywhere by this migration.
--  3. Real human coaching is out of scope — tracked as a documentation-
--     only backlog item in ROADMAP.md, not touched here.
--
-- THE SECURITY MODEL THIS MIGRATION HAD TO ADD BEYOND THE ORIGINAL BRIEF:
-- The original design (before the coin decision) assumed plain owner-CRUD
-- RLS on `projects` — correct for a free action, wrong the moment
-- creation costs coins: a `for all using (owner)` INSERT policy would let
-- any client insert a project directly over PostgREST for free, bypassing
-- payment entirely. So `projects` and `project_charters` (auto-provisioned
-- 1:1 with a project, see below) both ship with NO insert policy at all —
-- the only door is `create_project()`, which charges first. UPDATE stays
-- owner-writable on both (editing your own project's fields, or filling
-- out the charter, costs nothing beyond the one-time creation charge —
-- that is the whole point of a one-time gate rather than a metered one).
--
-- Belt-and-suspenders: `forbid_client_write()` (030) is attached to INSERT
-- ONLY on both tables (not update/delete, unlike its other call sites —
-- legitimate owner edits must keep working). Plain RLS with no INSERT
-- policy already refuses a direct insert with a real error (unlike the
-- UPDATE/DELETE case 030 exists for, INSERT uses WITH CHECK, not row
-- pre-filtering, so there is no silent-zero-rows path here) — the trigger
-- is added anyway for the same explicit, named-reason refusal every other
-- money-adjacent table in this codebase gets, not because plain RLS is
-- insufficient.
--
-- `decision_log` is the one table here that keeps ordinary owner INSERT
-- (free-form entries cost nothing) but deliberately has NO update/delete
-- policy — append-only, same treatment `career_scores` and
-- `learner_notes` already get in this codebase: a log you can rewrite is
-- not a log.
-- ============================================================

-- ============================================================
-- A) PROJECTS — one row per paid creation, many per trainee
-- ============================================================

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  name text not null,
  sector text,
  country text,
  organization text,
  client text,
  value_statement text,
  started_at date,

  -- Mini business case
  problem_statement text,
  opportunity_statement text,
  value_case text,
  why_now text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberately NOT unique(owner_id) — owner decision, see header.
create index if not exists idx_projects_owner on public.projects(owner_id, created_at desc);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();

alter table public.projects enable row level security;

drop policy if exists "Projects: owner reads" on public.projects;
create policy "Projects: owner reads" on public.projects
  for select using (auth.uid() = owner_id);

drop policy if exists "Projects: owner updates own fields" on public.projects;
create policy "Projects: owner updates own fields" on public.projects
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- NO insert policy, deliberately — create_project() is the only door.
-- NO delete policy, deliberately — a paid asset with no legitimate
-- deletion use case today, same call already made for `lessons` ("no
-- DELETE policy for anyone, by design").
drop trigger if exists trg_projects_forbid_client_insert on public.projects;
create trigger trg_projects_forbid_client_insert
  before insert on public.projects
  for each statement execute procedure public.forbid_client_write();

-- ============================================================
-- B) PROJECT CHARTERS — 1:1 with a project, auto-provisioned
-- ============================================================

create table if not exists public.project_charters (
  project_id uuid primary key references public.projects(id) on delete cascade,
  vision text,
  objectives text,
  deliverables text,
  sponsor_name text,
  sponsor_authority text,
  -- [{name, role}, ...] — the "at least 3 people" rule from the design
  -- doc is a UI validation, not a DB constraint (the shape is free-form
  -- enough that enforcing a minimum count in SQL would fight normal
  -- draft-in-progress saves).
  core_team jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '[]'::jsonb,
  is_approved boolean not null default false,
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_project_charters_updated_at on public.project_charters;
create trigger trg_project_charters_updated_at before update on public.project_charters
  for each row execute procedure public.set_updated_at();

alter table public.project_charters enable row level security;

drop policy if exists "Charters: owner reads" on public.project_charters;
create policy "Charters: owner reads" on public.project_charters
  for select using (
    exists (select 1 from public.projects p where p.id = project_charters.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "Charters: owner updates" on public.project_charters;
create policy "Charters: owner updates" on public.project_charters
  for update using (
    exists (select 1 from public.projects p where p.id = project_charters.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_charters.project_id and p.owner_id = auth.uid())
  );

-- NO insert policy — create_project() inserts the empty charter row in
-- the same transaction as the project itself, so the client-side wizard
-- (features/projects/) only ever UPDATEs an existing row, never INSERTs
-- one. This removes an entire class of "duplicate/missing charter row"
-- edge case rather than guarding against it.
drop trigger if exists trg_project_charters_forbid_client_insert on public.project_charters;
create trigger trg_project_charters_forbid_client_insert
  before insert on public.project_charters
  for each statement execute procedure public.forbid_client_write();

-- ============================================================
-- C) DECISION LOG — append-only, seeded from the first moment
-- ============================================================

create table if not exists public.decision_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  situation text not null,
  decision text not null,
  reason text not null,
  -- Free text, no CHECK — the design doc's 'assumption'/'constraint'/
  -- 'risk' are examples for the later Assumptions & Constraints game to
  -- filter on, not an exhaustive enum. 'milestone' is used below for the
  -- one system-generated row this migration creates.
  category text,
  created_at timestamptz not null default now()
);

create index if not exists idx_decision_log_project on public.decision_log(project_id, created_at desc);

alter table public.decision_log enable row level security;

drop policy if exists "Decision log: owner reads" on public.decision_log;
create policy "Decision log: owner reads" on public.decision_log
  for select using (
    exists (select 1 from public.projects p where p.id = decision_log.project_id and p.owner_id = auth.uid())
  );

-- Ordinary owner INSERT stays open — free-form entries cost nothing and
-- there is no money/privilege at stake in this table. What is
-- deliberately absent is UPDATE and DELETE: append-only, matching the
-- treatment `career_scores` (time series, never updated in place) and
-- `learner_notes` (durable, append-only) already get in this codebase.
drop policy if exists "Decision log: owner adds entries" on public.decision_log;
create policy "Decision log: owner adds entries" on public.decision_log
  for insert with check (
    exists (select 1 from public.projects p where p.id = decision_log.project_id and p.owner_id = auth.uid())
  );

-- Charter approval logs itself automatically — enforced at the DB layer
-- rather than trusted to whichever client code happens to flip
-- is_approved, so it cannot be silently skipped by a future UI change.
-- category='milestone' with slug values in situation/decision/reason
-- (not prose): this row is system-generated, and the UI is expected to
-- recognize category='milestone' and render it through t() rather than
-- displaying these columns verbatim — the same "slug stored, client
-- translates" shape coin_transactions.reason already uses ('voice_call',
-- 'welcome_bonus', ...), not literal bilingual prose baked into SQL.
create or replace function public.log_charter_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_approved and not coalesce(old.is_approved, false) then
    insert into public.decision_log (project_id, situation, decision, reason, category)
    values (new.project_id, 'charter_approved', 'charter_approved', 'charter_approved', 'milestone');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_charter_approval on public.project_charters;
create trigger trg_log_charter_approval
  after update on public.project_charters
  for each row execute procedure public.log_charter_approval();

-- ============================================================
-- D) PRICING — one new pricing_units row, no code-side price
-- ============================================================

-- 10 coins is a PRE-LAUNCH ESTIMATE, not a researched figure — chosen so
-- the 30-coin welcome grant (007b) covers one project with coins left
-- over for a first language task or pronunciation attempt, while still
-- being a real gate matching the owner's "paid, no free cap" decision.
-- Adjustable from /admin/pricing without a code change or a migration,
-- same as every other pricing_units row.
insert into public.pricing_units (key, coin_cost, label_ar, label_en)
values ('new_project', 10, 'فتح مشروع حي جديد', 'Open a new Living Project')
on conflict (key) do nothing;

-- ============================================================
-- E) CREATE — the only door into `projects`/`project_charters`
-- ============================================================

/**
 * Charges for and creates one project + its empty charter row, atomically.
 *
 * Mirrors start_agent_call() (036)'s shape: an authoritative price read
 * (no fallback constant — refusing beats guessing a number nobody
 * configured), a graceful jsonb refusal for the ordinary "can't afford
 * it" case, and spend_coins() as the only debit path, never a direct
 * wallets update. If spend_coins() unexpectedly fails after the balance
 * was already verified (a race), the raised exception rolls back both
 * inserts — one transaction, no orphaned project row.
 */
create or replace function public.create_project(
  p_name text,
  p_sector text default null,
  p_country text default null,
  p_organization text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost int;
  v_balance int;
  v_project_id uuid;
  v_spent boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'name_required');
  end if;

  select coin_cost into v_cost from public.pricing_units where key = 'new_project';
  if v_cost is null or v_cost <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'price_unavailable');
  end if;

  select balance into v_balance from public.wallets where user_id = auth.uid();
  if coalesce(v_balance, 0) < v_cost then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'insufficient_balance',
      'balance', coalesce(v_balance, 0),
      'required', v_cost
    );
  end if;

  insert into public.projects (owner_id, name, sector, country, organization)
  values (auth.uid(), trim(p_name), p_sector, p_country, p_organization)
  returning id into v_project_id;

  insert into public.project_charters (project_id) values (v_project_id);

  select public.spend_coins(auth.uid(), v_cost, 'new_project', 'projects', v_project_id)
    into v_spent;

  if not v_spent then
    raise exception 'Failed to charge for new project' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'projectId', v_project_id,
    'coinsCharged', v_cost,
    'balanceAfter', v_balance - v_cost
  );
end;
$$;

revoke execute on function public.create_project(text, text, text, text) from public, anon;
grant execute on function public.create_project(text, text, text, text) to authenticated;

-- ============================================================
-- F) READINESS — a view, not a stored/recomputed column
-- ============================================================

-- First-pass heuristic from the design doc, not a validated formula —
-- change the weights freely, but document why in a comment when you do.
-- A view rather than a column: every input already lives in a row that
-- changes independently (projects, project_charters, decision_log count),
-- so a stored percentage would need triggers on three tables just to
-- stay correct, for a number that's cheap to compute on read.
create or replace view public.project_readiness as
select
  p.id as project_id,
  p.owner_id,
  (
    (case when p.name is not null and p.sector is not null
               and p.country is not null and p.organization is not null
          then 25 else 0 end)
    + (case when p.problem_statement is not null and p.opportunity_statement is not null
                 and p.value_case is not null and p.why_now is not null
            then 25 else 0 end)
    + (case when coalesce(pc.is_approved, false) then 30 else 0 end)
    + (case when (select count(*) from public.decision_log dl where dl.project_id = p.id) >= 5
            then 20 else 0 end)
  ) as readiness_percent
from public.projects p
left join public.project_charters pc on pc.project_id = p.id;

-- Views don't carry their own RLS — they inherit the querying role's
-- access to the underlying tables (`projects`/`project_charters`'s own
-- owner-only SELECT policies), so this is already scoped correctly with
-- no separate policy to write or forget.

-- ============================================================
-- G) SELF-CHECK
-- ============================================================

do $$
declare
  v_no_unique int;
  v_projects_policies int;
  v_charters_policies int;
  v_decision_policies int;
  v_fn int;
  v_price int;
  v_readiness_cols int;
begin
  -- The owner's explicit reversal of this session's original
  -- recommendation must actually hold — a stray unique constraint here
  -- would silently reinstate "one project per trainee".
  select count(*) into v_no_unique
    from pg_constraint
   where conrelid = 'public.projects'::regclass and contype = 'u';
  if v_no_unique <> 0 then
    raise exception 'projects must NOT have a unique constraint — multiple projects per trainee is the owner''s explicit decision';
  end if;

  select count(*) into v_projects_policies
    from pg_policies where schemaname = 'public' and tablename = 'projects';
  if v_projects_policies <> 2 then
    raise exception 'projects must have exactly 2 policies (owner select, owner update), found %', v_projects_policies;
  end if;

  select count(*) into v_charters_policies
    from pg_policies where schemaname = 'public' and tablename = 'project_charters';
  if v_charters_policies <> 2 then
    raise exception 'project_charters must have exactly 2 policies (owner select, owner update), found %', v_charters_policies;
  end if;

  select count(*) into v_decision_policies
    from pg_policies where schemaname = 'public' and tablename = 'decision_log';
  if v_decision_policies <> 2 then
    raise exception 'decision_log must have exactly 2 policies (owner select, owner insert — no update/delete), found %', v_decision_policies;
  end if;

  select count(*) into v_fn from pg_proc where proname = 'create_project';
  if v_fn = 0 then
    raise exception 'create_project() was not created';
  end if;

  select coin_cost into v_price from public.pricing_units where key = 'new_project';
  if v_price is null then
    raise exception 'new_project price row was not seeded';
  end if;

  select count(*) into v_readiness_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'project_readiness';
  if v_readiness_cols = 0 then
    raise exception 'project_readiness view was not created';
  end if;

  raise notice '037 OK: projects/project_charters/decision_log created (no unique on owner_id — multi-project confirmed), create_project() installed, new_project seeded at % coins, project_readiness view live', v_price;
end $$;
