-- ============================================================
-- WOW - World of Work — Migration 065
-- Level 3 foundation, part 2: the narrative-template engine, per the
-- owner's explicit decision (2026-08-12) to build the GENERIC engine
-- now but wire up only the two simplest of the eight planned output
-- documents — Decision Log and Evidence Report — deliberately deferring
-- the other six (Project Portfolio, Leadership Report, Executive
-- Summary, Delivery Dashboard, Leadership DNA radar, Lessons Learned)
-- to a later, separate migration once this is live-verified.
--
-- Confirmed by research before writing this: NO such service existed
-- anywhere in the codebase before now (migration 061's own header and
-- 043's SCOPE NOTE both explicitly say Project Story / narrative
-- generation was deferred, not built) — this is new infrastructure,
-- not a reuse of anything.
--
-- Design: `narrative_templates` holds a bilingual intro template (with
-- {{var}} placeholders) per document type. render_narrative_document()
-- fills the placeholders with real, server-computed values AND attaches
-- the actual structured data (a real list of decision_log rows, or a
-- real list of skill_evidence rows) as `items` — the two documents this
-- migration wires up are explicitly the ones the owner judged "mostly
-- direct data, least narrative judgment," so the template's job here is
-- just the intro/wrapper text, not prose-generating the data itself.
-- No LLM call anywhere in this file, per ARCHITECTURE_levels2-4_strategy.md §3.
-- ============================================================

create table if not exists public.narrative_templates (
  template_key text primary key,
  title_ar text not null,
  title_en text not null,
  intro_template_ar text not null,
  intro_template_en text not null,
  created_at timestamptz not null default now()
);

alter table public.narrative_templates enable row level security;

-- Template text is not learner-sensitive — any signed-in user can read
-- it (matches kb_rule_scopes' own "signed-in read" posture). Editing
-- stays admin-only for now (no INSERT/UPDATE policy — a future content-
-- management pass can route this through content_drafts, 062, the same
-- way kb_scenarios/kb_scoring_rules/badges already do).
drop policy if exists "Narrative templates: signed-in read" on public.narrative_templates;
create policy "Narrative templates: signed-in read"
  on public.narrative_templates for select
  using (auth.uid() is not null);

insert into public.narrative_templates (template_key, title_ar, title_en, intro_template_ar, intro_template_en) values
(
  'decision_log',
  'سجل القرارات', 'Decision Log',
  'سجل القرارات الفعلي لمشروع {{project_name}}، بقلم {{learner_name}} — {{decision_count}} قرارًا موثَّقًا حتى الآن، بسياقه وسببه.',
  'The real decision log for project {{project_name}}, by {{learner_name}} — {{decision_count}} documented decisions so far, each with its context and reasoning.'
),
(
  'evidence_report',
  'تقرير الأدلة', 'Evidence Report',
  'ملخص الأدلة الفعلية المرفوعة بواسطة {{learner_name}} دعمًا لمهاراته المكتسَبة — {{evidence_count}} دليلًا موثَّقًا.',
  'A summary of the real evidence {{learner_name}} has submitted supporting their claimed skills — {{evidence_count}} documented pieces of evidence.'
)
on conflict (template_key) do nothing;

-- ------------------------------------------------------------
-- render_narrative_text: generic {{var}} substitution helper, reused by
-- every template this engine ever renders (not just the two wired up
-- now) — this is the reusable "engine" part the owner asked for.
-- ------------------------------------------------------------
create or replace function public.render_narrative_text(p_template text, p_vars jsonb)
returns text
language plpgsql
immutable
as $$
declare
  v_result text := p_template;
  v_key text;
  v_val text;
begin
  for v_key, v_val in select key, value #>> '{}' from jsonb_each(coalesce(p_vars, '{}'::jsonb))
  loop
    v_result := replace(v_result, '{{' || v_key || '}}', coalesce(v_val, ''));
  end loop;
  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- render_narrative_document: the two wired-up documents. Authorization
-- mirrors entity_memory (062/064): the caller must be the learner
-- themselves, or hold audit.read. Adding a new template_key later means
-- adding a new branch here, not touching the two already working ones.
-- ------------------------------------------------------------
create or replace function public.render_narrative_document(p_template_key text, p_user_id uuid, p_project_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_template record;
  v_full_name text;
  v_project_id uuid;
  v_project_name text;
  v_items jsonb;
  v_count int;
begin
  if v_caller is null or (v_caller <> p_user_id and not public.has_permission('audit.read')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_template from public.narrative_templates where template_key = p_template_key;
  if v_template is null then
    return jsonb_build_object('rendered', false, 'reason', 'template_not_found');
  end if;

  select full_name into v_full_name from public.profiles where id = p_user_id;

  if p_template_key = 'decision_log' then
    v_project_id := p_project_id;
    if v_project_id is null then
      select id into v_project_id from public.projects where owner_id = p_user_id order by created_at desc limit 1;
    end if;
    if v_project_id is null then
      return jsonb_build_object('rendered', false, 'reason', 'no_project_found');
    end if;

    select name into v_project_name from public.projects where id = v_project_id;

    select coalesce(jsonb_agg(jsonb_build_object(
             'situation', d.situation, 'decision', d.decision, 'reason', d.reason,
             'category', d.category, 'createdAt', d.created_at
           ) order by d.created_at), '[]'::jsonb), count(*)
      into v_items, v_count
      from public.decision_log d
     where d.project_id = v_project_id;

    return jsonb_build_object(
      'rendered', true,
      'templateKey', p_template_key,
      'titleAr', v_template.title_ar, 'titleEn', v_template.title_en,
      'introAr', public.render_narrative_text(v_template.intro_template_ar, jsonb_build_object('learner_name', coalesce(v_full_name, ''), 'project_name', coalesce(v_project_name, ''), 'decision_count', v_count)),
      'introEn', public.render_narrative_text(v_template.intro_template_en, jsonb_build_object('learner_name', coalesce(v_full_name, ''), 'project_name', coalesce(v_project_name, ''), 'decision_count', v_count)),
      'items', v_items
    );

  elsif p_template_key = 'evidence_report' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'skillName', s.name, 'evidenceType', se.evidence_type,
             'verifiedByType', se.verified_by_type, 'createdAt', se.created_at
           ) order by se.created_at desc), '[]'::jsonb), count(*)
      into v_items, v_count
      from public.skill_evidence se
      join public.entity_skills es on es.id = se.entity_skill_id
      join public.skills s on s.id = es.skill_id
     where es.entity_type = 'user' and es.entity_id = p_user_id;

    return jsonb_build_object(
      'rendered', true,
      'templateKey', p_template_key,
      'titleAr', v_template.title_ar, 'titleEn', v_template.title_en,
      'introAr', public.render_narrative_text(v_template.intro_template_ar, jsonb_build_object('learner_name', coalesce(v_full_name, ''), 'evidence_count', v_count)),
      'introEn', public.render_narrative_text(v_template.intro_template_en, jsonb_build_object('learner_name', coalesce(v_full_name, ''), 'evidence_count', v_count)),
      'items', v_items
    );

  else
    return jsonb_build_object('rendered', false, 'reason', 'template_not_wired_yet');
  end if;
end;
$$;

revoke execute on function public.render_narrative_document(text, uuid, uuid) from public, anon;
grant execute on function public.render_narrative_document(text, uuid, uuid) to authenticated;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_templates int;
  v_fn int;
begin
  select count(*) into v_templates from public.narrative_templates where template_key in ('decision_log', 'evidence_report');
  if v_templates <> 2 then
    raise exception '065 failed: expected 2 seeded templates, found %', v_templates;
  end if;

  select count(*) into v_fn from pg_proc where proname in ('render_narrative_text', 'render_narrative_document');
  if v_fn <> 2 then
    raise exception '065 failed: expected both render functions, found %', v_fn;
  end if;

  raise notice '065 OK: narrative_templates seeded (decision_log, evidence_report), render_narrative_text()/render_narrative_document() installed.';
end $$;
