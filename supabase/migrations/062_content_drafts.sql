-- ============================================================
-- WOW - World of Work — Migration 062
-- Content-management CMS, part 1: a generic Draft -> Publish table for
-- content that currently has NO review/staging mechanism at all —
-- kb_scenarios, kb_scoring_rules, badges. Confirmed by direct research
-- before writing this: none of these three tables has any existing
-- draft/review concept, unlike `lessons` (which already has
-- review_status + content_review_votes + content_contributions,
-- 008/015b/015c — deliberately NOT duplicated here; the lessons editor
-- reuses that existing system instead).
--
-- pricing_units is DELIBERATELY EXCLUDED, despite being named in the
-- original brief's scope — RBAC.md:66-73 already documents that
-- `content.manage` "was considered and rejected" for pricing_units
-- specifically, because it would silently hand price control to
-- content_manager (015a), a role deliberately kept narrower than that.
-- Pricing already has its own live, working admin screen
-- (/admin/pricing, migration 024) gated on `finance.edit_rates` with
-- immediate per-row writes via update_pricing_unit() — building a
-- second content.manage-gated path to the same table here would both
-- reopen an already-settled RBAC decision and duplicate working
-- infrastructure. Flagged to the owner; not built.
--
-- One generic table + one SECURITY DEFINER publish function, per the
-- owner's explicit decision: a single central publish point rather
-- than bespoke publish logic per content type.
--
-- Supports both edit (target_id set) and create (target_id null) via
-- upsert, and delete (action='delete', target_id required) — the
-- owner's brief explicitly asked for scenario deletion.
--
-- Access: gated entirely on has_permission('content.manage') — the
-- existing narrow role (015a/015b), reused as-is per the owner's
-- decision not to split PMP/English into separate roles for now.
-- ============================================================

create table if not exists public.content_drafts (
  id uuid primary key default uuid_generate_v4(),
  target_table text not null check (target_table in ('kb_scenarios', 'kb_scoring_rules', 'badges')),
  target_id text,
  action text not null default 'upsert' check (action in ('upsert', 'delete')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'discarded')),
  created_by uuid not null references public.profiles(id),
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_drafts_delete_needs_target check (action = 'upsert' or target_id is not null)
);

create index if not exists idx_content_drafts_target on public.content_drafts(target_table, status);
create index if not exists idx_content_drafts_created_by on public.content_drafts(created_by);

drop trigger if exists trg_content_drafts_updated_at on public.content_drafts;
create trigger trg_content_drafts_updated_at
  before update on public.content_drafts
  for each row execute function public.set_updated_at();

alter table public.content_drafts enable row level security;

-- Only content.manage holders may see drafts at all — same isolation
-- posture as kb_scoring_rules (046): a normal authenticated user gets
-- zero rows, not an error, matching this project's established RLS-
-- attack-test convention.
drop policy if exists "Content drafts: content-manage reads" on public.content_drafts;
create policy "Content drafts: content-manage reads"
  on public.content_drafts for select
  using (public.has_permission('content.manage'));

drop policy if exists "Content drafts: content-manage creates" on public.content_drafts;
create policy "Content drafts: content-manage creates"
  on public.content_drafts for insert
  with check (
    public.has_permission('content.manage')
    and created_by = auth.uid()
    and status = 'draft'
  );

-- WITH CHECK deliberately allows only 'draft' or 'discarded' as the
-- client-writable statuses — 'published' can only ever be set by
-- publish_content_draft() below (a SECURITY DEFINER function, which
-- bypasses RLS entirely). This stops a compromised/malicious client
-- from "faking" a publish by flipping content_drafts.status directly
-- without ever writing the real target table — the same
-- never-trust-client-state discipline used throughout this project
-- for scores/prices/completion.
drop policy if exists "Content drafts: content-manage edits own draft" on public.content_drafts;
create policy "Content drafts: content-manage edits own draft"
  on public.content_drafts for update
  using (public.has_permission('content.manage') and status = 'draft')
  with check (status in ('draft', 'discarded'));

-- No DELETE policy for anyone — a draft's history is kept (discarded
-- instead of removed), same "no policy = no path" pattern used
-- elsewhere in this project.

-- ------------------------------------------------------------
-- publish_content_draft: the single central publish point. Branches
-- per target_table with explicit column lists (never dynamic SQL
-- built from client-controlled column names) to avoid any injection
-- surface.
-- ------------------------------------------------------------
create or replace function public.publish_content_draft(p_draft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft record;
  v_id uuid;
begin
  if not public.has_permission('content.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_draft from public.content_drafts where id = p_draft_id;
  if v_draft is null then
    return jsonb_build_object('published', false, 'reason', 'draft_not_found');
  end if;
  if v_draft.status <> 'draft' then
    return jsonb_build_object('published', false, 'reason', 'not_a_pending_draft');
  end if;

  if v_draft.action = 'delete' then
    if v_draft.target_table = 'kb_scenarios' then
      delete from public.kb_scenarios where id = v_draft.target_id::uuid;
    elsif v_draft.target_table = 'kb_scoring_rules' then
      delete from public.kb_scoring_rules where id = v_draft.target_id::uuid;
    elsif v_draft.target_table = 'badges' then
      delete from public.badges where id = v_draft.target_id::uuid;
    end if;

    update public.content_drafts
       set status = 'published', published_by = auth.uid(), published_at = now()
     where id = p_draft_id;

    return jsonb_build_object('published', true, 'action', 'delete', 'targetTable', v_draft.target_table, 'targetId', v_draft.target_id);
  end if;

  if v_draft.target_table = 'kb_scenarios' then
    v_id := coalesce(v_draft.target_id::uuid, uuid_generate_v4());
    insert into public.kb_scenarios (id, rule_scope, scenario_key, title_ar, title_en, body, is_active)
    values (
      v_id,
      v_draft.payload ->> 'rule_scope',
      v_draft.payload ->> 'scenario_key',
      v_draft.payload ->> 'title_ar',
      v_draft.payload ->> 'title_en',
      coalesce(v_draft.payload -> 'body', '{}'::jsonb),
      coalesce((v_draft.payload ->> 'is_active')::boolean, true)
    )
    on conflict (id) do update set
      rule_scope = excluded.rule_scope,
      scenario_key = excluded.scenario_key,
      title_ar = excluded.title_ar,
      title_en = excluded.title_en,
      body = excluded.body,
      is_active = excluded.is_active;

  elsif v_draft.target_table = 'kb_scoring_rules' then
    v_id := coalesce(v_draft.target_id::uuid, uuid_generate_v4());
    insert into public.kb_scoring_rules (id, rule_scope, scenario_key, decision_key, score, feedback_ar, feedback_en)
    values (
      v_id,
      v_draft.payload ->> 'rule_scope',
      v_draft.payload ->> 'scenario_key',
      v_draft.payload ->> 'decision_key',
      (v_draft.payload ->> 'score')::numeric,
      v_draft.payload ->> 'feedback_ar',
      v_draft.payload ->> 'feedback_en'
    )
    on conflict (id) do update set
      rule_scope = excluded.rule_scope,
      scenario_key = excluded.scenario_key,
      decision_key = excluded.decision_key,
      score = excluded.score,
      feedback_ar = excluded.feedback_ar,
      feedback_en = excluded.feedback_en;

  elsif v_draft.target_table = 'badges' then
    v_id := coalesce(v_draft.target_id::uuid, uuid_generate_v4());
    insert into public.badges (id, name, description, icon, points_value)
    values (
      v_id,
      v_draft.payload ->> 'name',
      v_draft.payload ->> 'description',
      v_draft.payload ->> 'icon',
      coalesce((v_draft.payload ->> 'points_value')::int, 0)
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      points_value = excluded.points_value;

  else
    raise exception 'Unknown target_table: %', v_draft.target_table;
  end if;

  update public.content_drafts
     set status = 'published', published_by = auth.uid(), published_at = now()
   where id = p_draft_id;

  return jsonb_build_object(
    'published', true,
    'action', 'upsert',
    'targetTable', v_draft.target_table,
    'targetId', v_id::text
  );
end;
$$;

revoke execute on function public.publish_content_draft(uuid) from public, anon;
grant execute on function public.publish_content_draft(uuid) to authenticated;

-- ------------------------------------------------------------
-- kb_scoring_rules is deliberately zero-policy (046) so players can
-- never read the answer key — but a content_manager editing this CMS
-- needs to actually SEE current scores/feedback to edit them. Adding
-- one narrow, explicit SELECT policy scoped to content.manage only,
-- the same precedent already used for `lessons` (015c exempts
-- content.manage from its restrictive gate). This does not weaken the
-- anti-cheat protection: it is not open to `authenticated` broadly,
-- only to the same narrow, admin-assigned permission already trusted
-- with direct UPDATE on lessons.
-- ------------------------------------------------------------
drop policy if exists "KB scoring rules: content-manage reads" on public.kb_scoring_rules;
create policy "KB scoring rules: content-manage reads"
  on public.kb_scoring_rules for select
  using (public.has_permission('content.manage'));

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_cols int;
  v_fn int;
begin
  select count(*) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'content_drafts'
     and column_name in ('target_table', 'target_id', 'action', 'payload', 'status', 'created_by', 'published_by', 'published_at');
  if v_cols <> 8 then
    raise exception '062 failed: expected 8 known columns on content_drafts, found %', v_cols;
  end if;

  select count(*) into v_fn
    from pg_proc where proname = 'publish_content_draft';
  if v_fn <> 1 then
    raise exception '062 failed: publish_content_draft() not found';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'kb_scoring_rules'
       and policyname = 'KB scoring rules: content-manage reads'
  ) then
    raise exception '062 failed: kb_scoring_rules content-manage read policy missing';
  end if;

  raise notice '062 OK: content_drafts + publish_content_draft() installed.';
end $$;
