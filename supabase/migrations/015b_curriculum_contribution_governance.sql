-- ============================================================
-- WOW - World of Work — Migration 015b
-- Instructor system, part 2: curriculum contribution to WOW's own
-- shared courses (owner_type IS NULL) — the governed path from
-- migration 008's content_review_votes, as opposed to migration 014's
-- ungoverned personal courses (owner_type='user').
--
-- Run AFTER 015a has completed and committed on its own — 015a adds the
-- 'content_manager' app_role enum value this file uses; Postgres
-- requires that to be a separate, already-committed transaction (error
-- 55P04 otherwise — see 015a's header for the full story).
--
-- Idempotent throughout (drop policy if exists before every create
-- policy, if not exists everywhere else), per the convention adopted in
-- 014.
--
-- Run order: 001 → ... → 014 → 015a → 015b. Additive only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. content.manage: narrow, single-purpose role for the platform owner
-- ------------------------------------------------------------
-- 'content.manage' already existed as a permission (003) and was already
-- granted to 'admin'/'super_admin' — but both of those roles also carry
-- unrelated permissions (users.manage, roles.assign, audit.read, finance
-- for super_admin, etc). The owner asked for content.manage specifically
-- for their own account, not full admin — so this adds a new, narrow
-- role that maps to *only* content.manage, rather than reusing admin.
insert into public.role_permissions (role, permission_key)
values ('content_manager', 'content.manage')
on conflict do nothing;

-- OWNER: replace the placeholder email below with your real account
-- email before running this migration. If your account already holds
-- an elevated role (admin/super_admin/etc), this UPDATE will silently
-- replace it, since profiles.role is a single column — check first if
-- you're not sure, and skip this UPDATE (run the rest of the file) if
-- you already hold a role that includes content.manage.
update public.profiles set role = 'content_manager'
where email = 'REPLACE_WITH_YOUR_ACCOUNT_EMAIL@example.com';

-- ------------------------------------------------------------
-- 2. content_review_votes: let 'instructor' capability holders peer-vote
--    too, not just 'assessor' (008 only wired the assessor case).
-- ------------------------------------------------------------
alter table public.content_review_votes
  drop constraint if exists content_review_votes_voter_type_check;
alter table public.content_review_votes
  add constraint content_review_votes_voter_type_check
  check (voter_type in ('owner', 'peer_assessor', 'peer_instructor', 'nova_check'));

drop policy if exists "Votes: instructor capability peer-votes" on public.content_review_votes;
create policy "Votes: instructor capability peer-votes" on public.content_review_votes
  for insert with check (
    voter_type = 'peer_instructor'
    and voter_id = auth.uid()
    and exists (
      select 1 from public.user_capabilities uc
      where uc.user_id = auth.uid() and uc.capability = 'instructor'
    )
  );

-- ------------------------------------------------------------
-- 3. lessons: let an instructor propose a new lesson on a SHARED course
--    (owner_type is null) — 014 only ever covered owner_type='user'.
--    INSERT-only: proposing new content, never editing/deleting an
--    already-live shared lesson (that stays content.manage-only, #4).
--    The WITH CHECK also pins review_status to the starting state, so a
--    caller can't insert a lesson that claims to already be approved.
-- ------------------------------------------------------------
drop policy if exists "Lessons: instructor proposes for shared course" on public.lessons;
create policy "Lessons: instructor proposes for shared course" on public.lessons
  for insert with check (
    exists (
      select 1 from public.user_capabilities uc
      where uc.user_id = auth.uid() and uc.capability = 'instructor'
    )
    and exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.owner_type is null
    )
    and (review_status is null or review_status = 'nova_check_pending')
  );

-- ------------------------------------------------------------
-- 4. lessons: content.manage can update review_status (approve/reject a
--    proposal) — matches the permission's own documented scope ("Full
--    content administration", 003), same reasoning 008 already used
--    has_permission('content.manage') directly for the 'owner' vote
--    type. Not a broad "any role" policy — content.manage is a single,
--    narrowly-provisioned, admin-assigned permission (profiles.role
--    cannot be self-elevated the way user_capabilities can), so a
--    direct RLS grant here doesn't repeat the points/broad-RLS mistake.
-- ------------------------------------------------------------
drop policy if exists "Lessons: content-manage administers" on public.lessons;
create policy "Lessons: content-manage administers" on public.lessons
  for update using (public.has_permission('content.manage'));

-- ------------------------------------------------------------
-- 5. Automatic "Nova check" — PLACEHOLDER ONLY. Real automated content
--    review logic does not exist yet; this always auto-approves and
--    immediately moves a freshly-proposed lesson from
--    'nova_check_pending' to 'human_review' so it reaches the review
--    queue. Replace this function's body with real checks before it is
--    trusted for anything beyond this sprint's demo. Security definer
--    because the vote's voter_id is NULL (system-attributed, not a
--    real user) — no RLS policy lets a client insert a null-voter_id
--    row directly, by design (008's check constraint allows it, but no
--    INSERT policy grants it — this function is the only path in).
--    Scoped to the lesson's own last_edited_by so it can only ever
--    advance a lesson the caller themselves just submitted.
-- ------------------------------------------------------------
create or replace function public.run_nova_check_placeholder(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_last_edited_by uuid;
  v_status text;
begin
  select last_edited_by, review_status into v_last_edited_by, v_status
  from public.lessons
  where id = p_lesson_id
  for update;

  if v_last_edited_by is distinct from auth.uid() or v_status is distinct from 'nova_check_pending' then
    return false;
  end if;

  insert into public.content_review_votes (lesson_id, voter_type, voter_id, vote, comment)
  values (
    p_lesson_id, 'nova_check', null, 'approve',
    'PLACEHOLDER: automatic Nova content check is not implemented yet — this always auto-approves without real analysis. Replace with genuine automated review logic before relying on this signal for anything beyond Sprint 4''s demo.'
  );

  update public.lessons set review_status = 'human_review' where id = p_lesson_id;

  return true;
end;
$$;

revoke execute on function public.run_nova_check_placeholder(uuid) from public, anon;
grant execute on function public.run_nova_check_placeholder(uuid) to authenticated;
