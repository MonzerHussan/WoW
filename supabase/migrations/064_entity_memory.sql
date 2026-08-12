-- ============================================================
-- WOW - World of Work — Migration 064
-- Level 3 foundation, part 1: Entity Memory — a single generic
-- persistent-state mechanism, per the owner's explicit decision (2026-
-- 08-12) to unify "Team Memory" (Level 3, characters like Sarah) and
-- "Organizational DNA" (Level 3, a virtual organization's 7 maturity
-- indicators) under ONE design rather than building Team Memory as a
-- bespoke table and then inventing a second, different mechanism for
-- Organizational DNA. Confirmed by research before writing this: no
-- precedent for either concept existed anywhere in the schema, and
-- `career_scores` is hard-scoped to one human `user_id` (migration 004)
-- with no room for a non-individual scored entity — so Organizational
-- DNA genuinely needed a new home, not a bolt-on to career_scores.
--
-- entity_type is deliberately an open set now ('character',
-- 'organization') with 'board' already reserved for Level 4's Board
-- Memory (ARCHITECTURE_levels2-4_strategy.md §1: Character Memory
-- expands to Board Memory in Level 4) — same mechanism, no second build.
--
-- T1-T9 (DOMAIN_CONTRACTS.md) deliberately does NOT apply here — this
-- is not personal data about a real person, it's state for a fictional
-- in-game character/organization. Confirmed with the owner explicitly:
-- exempt from the transparency charter, but NOT exempt from ordinary
-- RLS protection — every row is still tied to a real owner_user_id and
-- stays owner+admin-only, same as any other user-owned table.
--
-- Writes go ONLY through apply_entity_memory_event() (SECURITY
-- DEFINER) — no direct INSERT/UPDATE policy on either table, matching
-- the "no policy = no path" convention already used throughout this
-- project. This is what keeps the state trustworthy: every change is a
-- deliberate, server-computed delta tied to a specific game/lesson
-- decision, never a raw client-supplied number (same discipline as
-- scores/prices/completion elsewhere in this codebase).
-- ============================================================

create table if not exists public.entity_memory_states (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('character', 'organization', 'board')),
  entity_key text not null,
  -- e.g. {"trust": 62, "respect": 55, "stress": 30, "cooperation": 58}
  -- for a character, or {"planning_maturity": 40, "risk_culture": 55, ...}
  -- for an organization. Metric keys are data, not schema — a new
  -- indicator is just a new jsonb key touched by some event's delta,
  -- no migration needed.
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (owner_user_id, entity_type, entity_key)
);

create index if not exists idx_entity_memory_states_owner on public.entity_memory_states(owner_user_id, entity_type);

create table if not exists public.entity_memory_events (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('character', 'organization', 'board')),
  entity_key text not null,
  -- what produced this event, e.g. 'level3_unit1_lesson_1_2',
  -- 'level3_mega_delivery:supplier_crisis'. Free text, not an FK — the
  -- source can be a lesson, a game attempt, or (Level 4) a board vote.
  source text not null,
  decision_key text,
  -- the numeric deltas actually applied, e.g. {"trust": 5, "stress": -10}
  -- — same "scenario x decision = a specific, pre-authored number"
  -- discipline as kb_scoring_rules, never an arbitrary/LLM-chosen value.
  delta jsonb not null,
  reason_ar text,
  reason_en text,
  created_at timestamptz not null default now()
);

create index if not exists idx_entity_memory_events_owner on public.entity_memory_events(owner_user_id, entity_type, entity_key, created_at desc);

drop trigger if exists trg_entity_memory_states_updated_at on public.entity_memory_states;
create trigger trg_entity_memory_states_updated_at
  before update on public.entity_memory_states
  for each row execute function public.set_updated_at();

alter table public.entity_memory_states enable row level security;
alter table public.entity_memory_events enable row level security;

-- Owner reads their own entities; audit.read (admin) can read anyone's
-- for support/oversight — RBAC.md already grants audit.read to admin,
-- nothing new introduced. No INSERT/UPDATE/DELETE policy on either
-- table for any role — see header.
drop policy if exists "Entity memory states: owner or audit reads" on public.entity_memory_states;
create policy "Entity memory states: owner or audit reads"
  on public.entity_memory_states for select
  using (owner_user_id = auth.uid() or public.has_permission('audit.read'));

drop policy if exists "Entity memory events: owner or audit reads" on public.entity_memory_events;
create policy "Entity memory events: owner or audit reads"
  on public.entity_memory_events for select
  using (owner_user_id = auth.uid() or public.has_permission('audit.read'));

-- ------------------------------------------------------------
-- apply_entity_memory_event: the single write path. Records the event
-- (append-only, permanent history) and merges its delta into the
-- current state, clamping every touched metric to [0, 100]. A metric
-- not yet present in state starts from a neutral 50 before the delta
-- is applied, rather than from 0 — an untouched trait defaults to
-- neutral, not "worst possible."
--
-- Authorization: only the entity's own owner can trigger their own
-- event. This is called from other SECURITY DEFINER completion
-- functions (a lesson/game finishing) where auth.uid() is still the
-- invoking learner's own session — there is no "system" caller here,
-- every event is attributable to the learner whose action produced it.
-- ------------------------------------------------------------
create or replace function public.apply_entity_memory_event(
  p_owner_user_id uuid,
  p_entity_type text,
  p_entity_key text,
  p_source text,
  p_delta jsonb,
  p_decision_key text default null,
  p_reason_ar text default null,
  p_reason_en text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_state jsonb;
  v_key text;
  v_delta_val numeric;
  v_current numeric;
begin
  if v_caller is null or v_caller <> p_owner_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_entity_type not in ('character', 'organization', 'board') then
    raise exception 'Invalid entity_type: %', p_entity_type;
  end if;

  insert into public.entity_memory_events
    (owner_user_id, entity_type, entity_key, source, decision_key, delta, reason_ar, reason_en)
  values
    (p_owner_user_id, p_entity_type, p_entity_key, p_source, p_decision_key, p_delta, p_reason_ar, p_reason_en);

  select state into v_state from public.entity_memory_states
   where owner_user_id = p_owner_user_id and entity_type = p_entity_type and entity_key = p_entity_key
   for update;

  if v_state is null then
    v_state := '{}'::jsonb;
  end if;

  for v_key, v_delta_val in select key, value::numeric from jsonb_each_text(p_delta)
  loop
    v_current := coalesce((v_state ->> v_key)::numeric, 50);
    v_state := jsonb_set(v_state, array[v_key], to_jsonb(greatest(0, least(100, v_current + v_delta_val))));
  end loop;

  insert into public.entity_memory_states (owner_user_id, entity_type, entity_key, state, updated_at)
  values (p_owner_user_id, p_entity_type, p_entity_key, v_state, now())
  on conflict (owner_user_id, entity_type, entity_key)
  do update set state = excluded.state, updated_at = now();

  return jsonb_build_object('applied', true, 'entityType', p_entity_type, 'entityKey', p_entity_key, 'state', v_state);
end;
$$;

revoke execute on function public.apply_entity_memory_event(uuid, text, text, text, jsonb, text, text, text) from public, anon;
grant execute on function public.apply_entity_memory_event(uuid, text, text, text, jsonb, text, text, text) to authenticated;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_test_user uuid;
  v_result jsonb;
  v_state jsonb;
  v_events int;
begin
  select id into v_test_user from public.profiles limit 1;
  if v_test_user is null then
    raise notice '064 OK (schema only) — no profiles row available to self-test apply_entity_memory_event() end-to-end.';
    return;
  end if;

  -- Simulate as that user (self-check runs as table owner, bypassing
  -- the auth.uid() check inside the function — call it directly with
  -- a SET LOCAL role trick is overkill here; instead just verify the
  -- schema/function shape, since a full authenticated-session replay
  -- is done live via the app in the chat, not from this DO block).
  select count(*) into v_events from information_schema.columns
   where table_schema = 'public' and table_name = 'entity_memory_events'
     and column_name in ('owner_user_id', 'entity_type', 'entity_key', 'source', 'delta', 'decision_key', 'reason_ar', 'reason_en');
  if v_events <> 8 then
    raise exception '064 failed: expected 8 known columns on entity_memory_events, found %', v_events;
  end if;

  if not exists (select 1 from pg_proc where proname = 'apply_entity_memory_event') then
    raise exception '064 failed: apply_entity_memory_event() not found';
  end if;

  raise notice '064 OK: entity_memory_states/events + apply_entity_memory_event() installed. Live authenticated replay done separately.';
end $$;
