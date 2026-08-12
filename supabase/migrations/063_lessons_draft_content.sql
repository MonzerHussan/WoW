-- ============================================================
-- WOW - World of Work — Migration 063
-- Content-management CMS, part 2: makes `lessons.review_status`
-- actually provide the draft/publish guarantee the owner asked for
-- (§0.3 of the CMS brief), for TWO distinct cases the owner explicitly
-- separated after reviewing the first proposal:
--
--   1. A brand-new lesson with no published version yet: review_status
--      can be 'draft' (new allowed value below) — nothing live exists
--      to hide, so this is a pure addition, no side effect.
--
--   2. Editing an ALREADY-approved, already-live lesson: do NOT touch
--      review_status at all (content_manager already has unrestricted
--      direct UPDATE on lessons via 015b's "Lessons: content-manage
--      administers" policy — flipping review_status away from
--      'approved' mid-edit would hide the live lesson from students
--      for the whole editing window, which is the OPPOSITE of what was
--      asked for: the live version must stay untouched until an
--      explicit publish). Instead: a new nullable `draft_content jsonb`
--      column holds the in-progress edit. "Save draft" writes here,
--      never to `content`. "Publish" copies draft_content -> content
--      and clears draft_content. The live lesson is unaffected for the
--      entire editing window.
--
-- Leak prevention (explicitly required by the owner): draft_content
-- must never reach a student, even for an approved+visible row, not
-- just via RLS row-hiding but at the column-select level. Verified
-- before writing this migration: every student-facing lesson read in
-- features/lms/services/lesson.service.ts uses an explicit column
-- list (not `select("*")`), so simply never adding draft_content to
-- those lists keeps it out of the response — no RLS/query change
-- needed there, but this is an application-layer discipline the admin
-- CMS's own code must not violate either.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Widen review_status to allow 'draft', for brand-new lessons only.
--    Introspects the actual constraint name rather than assuming it
--    (it's an inline, unnamed CHECK from 008, so Postgres's default
--    naming applies, but this is safer than hardcoding it blind).
-- ------------------------------------------------------------
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.lessons'::regclass
     and pg_get_constraintdef(oid) ilike '%review_status%in%';

  if v_constraint_name is not null then
    execute format('alter table public.lessons drop constraint %I', v_constraint_name);
  end if;

  alter table public.lessons add constraint lessons_review_status_check
    check (review_status in ('draft', 'nova_check_pending', 'nova_check_failed', 'human_review', 'approved', 'rejected'));
end $$;

-- ------------------------------------------------------------
-- 2. draft_content: staging area for edits to an already-live lesson.
--    Nullable — null means "no pending edit". Same jsonb shape as
--    `content` (rich blocks, per 004), since publish is a direct copy.
-- ------------------------------------------------------------
alter table public.lessons add column if not exists draft_content jsonb;

-- ------------------------------------------------------------
-- 3. save_lesson_draft / publish_lesson_draft: the two actions the CMS
--    calls. SECURITY DEFINER so a single, auditable path handles both
--    cases (new lesson via review_status, existing lesson via
--    draft_content) without the client needing to know which case
--    applies — the function inspects the row itself.
-- ------------------------------------------------------------
create or replace function public.save_lesson_draft(p_lesson_id uuid, p_content jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.has_permission('content.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select review_status into v_status from public.lessons where id = p_lesson_id for update;
  if v_status is null then
    return jsonb_build_object('saved', false, 'reason', 'lesson_not_found');
  end if;

  if v_status = 'approved' then
    -- live lesson: stage the edit, never touch the visible `content`.
    update public.lessons
       set draft_content = p_content, last_edited_by = auth.uid()
     where id = p_lesson_id;
  else
    -- not yet published (draft/pending/rejected/etc): safe to edit
    -- content directly, nothing live to disturb.
    update public.lessons
       set content = p_content, last_edited_by = auth.uid()
     where id = p_lesson_id;
  end if;

  return jsonb_build_object('saved', true, 'targetId', p_lesson_id::text);
end;
$$;

create or replace function public.publish_lesson_draft(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_draft jsonb;
begin
  if not public.has_permission('content.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select review_status, draft_content into v_status, v_draft
    from public.lessons where id = p_lesson_id for update;
  if v_status is null then
    return jsonb_build_object('published', false, 'reason', 'lesson_not_found');
  end if;

  if v_status = 'approved' then
    if v_draft is null then
      return jsonb_build_object('published', false, 'reason', 'no_pending_draft');
    end if;
    update public.lessons
       set content = v_draft, draft_content = null
     where id = p_lesson_id;
  else
    -- brand-new lesson's first publish: flip straight to approved.
    update public.lessons
       set review_status = 'approved'
     where id = p_lesson_id;
  end if;

  return jsonb_build_object('published', true, 'targetId', p_lesson_id::text);
end;
$$;

revoke execute on function public.save_lesson_draft(uuid, jsonb) from public, anon;
grant execute on function public.save_lesson_draft(uuid, jsonb) to authenticated;
revoke execute on function public.publish_lesson_draft(uuid) from public, anon;
grant execute on function public.publish_lesson_draft(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Column-level lockdown for draft_content — RLS on `lessons` is
--    ROW-level only. An approved lesson's row is already visible to
--    any enrolled student, and PostgREST lets a caller request any
--    column that role has privilege on regardless of what this
--    project's own app code happens to select. "The app never selects
--    draft_content" is NOT a real guard against a direct REST call
--    (exactly the kind of attack this project's own RLS tests already
--    replay). The actual fix: revoke SELECT on just this column from
--    `authenticated`/`anon` outright, and expose it ONLY through
--    SECURITY DEFINER functions below — the same trick already used
--    for kb_scoring_rules (046), one level more granular (column, not
--    whole-table). This also means content_manager itself can no
--    longer read draft_content via a plain `.select()` — the two
--    functions below are the only path in, for everyone.
-- ------------------------------------------------------------
revoke select (draft_content) on public.lessons from authenticated, anon;

create or replace function public.list_lessons_for_admin(p_module_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('content.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', l.id,
             'title', l.title,
             'orderIndex', l.order_index,
             'reviewStatus', l.review_status,
             'hasPendingDraft', l.draft_content is not null
           ) order by l.order_index)
    from public.lessons l
    where l.module_id = p_module_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_lesson_for_admin(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson record;
begin
  if not public.has_permission('content.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select id, title, content, draft_content, review_status into v_lesson
    from public.lessons where id = p_lesson_id;
  if v_lesson is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_lesson.id,
    'title', v_lesson.title,
    'content', v_lesson.content,
    'draftContent', v_lesson.draft_content,
    'reviewStatus', v_lesson.review_status
  );
end;
$$;

revoke execute on function public.list_lessons_for_admin(uuid) from public, anon;
grant execute on function public.list_lessons_for_admin(uuid) to authenticated;
revoke execute on function public.get_lesson_for_admin(uuid) from public, anon;
grant execute on function public.get_lesson_for_admin(uuid) to authenticated;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_draft_allowed boolean;
  v_col_exists int;
  v_fn_count int;
begin
  -- confirm the widened CHECK actually accepts 'draft' by inspecting
  -- the constraint definition text (cheaper and safer than inserting
  -- a throwaway row).
  select pg_get_constraintdef(oid) ilike '%''draft''%' into v_draft_allowed
    from pg_constraint
   where conrelid = 'public.lessons'::regclass and conname = 'lessons_review_status_check';
  if not coalesce(v_draft_allowed, false) then
    raise exception '063 failed: lessons_review_status_check does not allow ''draft''';
  end if;

  select count(*) into v_col_exists
    from information_schema.columns
   where table_schema = 'public' and table_name = 'lessons' and column_name = 'draft_content';
  if v_col_exists <> 1 then
    raise exception '063 failed: lessons.draft_content column missing';
  end if;

  select count(*) into v_fn_count from pg_proc
   where proname in ('save_lesson_draft', 'publish_lesson_draft', 'list_lessons_for_admin', 'get_lesson_for_admin');
  if v_fn_count <> 4 then
    raise exception '063 failed: expected 4 admin lesson functions, found %', v_fn_count;
  end if;

  if has_column_privilege('authenticated', 'public.lessons', 'draft_content', 'SELECT') then
    raise exception '063 failed: authenticated role can still SELECT draft_content directly — column revoke did not take effect';
  end if;

  raise notice '063 OK: review_status accepts ''draft'', draft_content column in place (SELECT revoked from authenticated/anon), save/publish/list/get admin lesson functions installed.';
end $$;
