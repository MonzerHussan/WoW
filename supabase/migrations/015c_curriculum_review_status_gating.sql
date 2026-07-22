-- ============================================================
-- WOW - World of Work — Migration 015c
-- Fixes a real gap found while testing 015b end-to-end (not a schema
-- typo, an actual missing RLS gate): the existing "Lessons: enrolled or
-- free preview" policy (004) has zero awareness of review_status — an
-- enrolled student can already see EVERY lesson in a course's modules
-- regardless of approval state. A freshly-proposed, not-yet-approved
-- shared-curriculum lesson (015b) was therefore visible to every
-- enrolled student immediately on submission, before any review at
-- all — exactly the "goes through review before students see it"
-- guarantee the feature was supposed to provide.
--
-- The same missing read path also broke the submitting instructor's own
-- flow: their API route's `.insert(...).select()` (Prefer:
-- return=representation) requires reading the row back immediately
-- after insert, and until this migration nothing granted them SELECT on
-- their own not-yet-visible submission — so the insert itself appeared
-- to fail with a generic RLS error. Same root cause the Sprint 3
-- "skill_evidence manual-curl false-negative" already documented
-- (SECURITY.md) for a *diagnostic* curl call; this time it was a real
-- bug in real app code, not a testing artifact.
--
-- IMPORTANT — checked before writing this: every one of the 18 already-
-- live PMP lessons is still sitting at review_status='nova_check_pending'
-- (they predate this whole governance workflow — seeded directly via
-- SQL as trusted content, never actually run through it). Any gate on
-- review_status='approved' would have hidden the entire published PMP
-- course from every student without the backfill in step 1 below.
--
-- IMPORTANT — also checked: migration 014's personal-course lessons
-- default to the same 'nova_check_pending' (review_status's column
-- default, 008) and never go through this workflow either — a personal
-- course is self-owned and self-approved by design (014's own header).
-- Both new policies below explicitly exempt owner_type='user' courses
-- entirely, so personal-course lesson visibility (014, already tested
-- end-to-end in production) is completely unaffected.
--
-- Run order: 001 → ... → 015b → 015c. Additive only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Backfill: shared-course lessons that predate this workflow are
--    already-live, owner-deployed content — mark them approved so
--    step 2's new gate doesn't hide them. Scoped to owner_type IS NULL
--    only; personal-course lessons are untouched (their review_status
--    is irrelevant to them either way, per the exemption in step 2/3).
-- ------------------------------------------------------------
update public.lessons l
set review_status = 'approved'
from public.modules m
join public.courses c on c.id = m.course_id
where l.module_id = m.id
  and c.owner_type is null
  and l.review_status is distinct from 'approved';

-- ------------------------------------------------------------
-- 2. RESTRICTIVE gate: narrows the existing permissive "enrolled or
--    free preview" policy (004) rather than adding another permissive
--    OR branch, which would have had no effect (permissive policies
--    only ever widen access; only a RESTRICTIVE policy can narrow what
--    another permissive policy already allows). A shared-course lesson
--    must be review_status='approved' to be visible via the ordinary
--    enrolled/free-preview path — except to the lesson's own submitter,
--    a reviewer-capable user, or any owner_type='user' (personal
--    course) lesson, which is exempt entirely.
-- ------------------------------------------------------------
drop policy if exists "Lessons: pending shared-curriculum review hidden from students" on public.lessons;
create policy "Lessons: pending shared-curriculum review hidden from students" on public.lessons
  as restrictive
  for select
  using (
    review_status is null
    or review_status = 'approved'
    or last_edited_by = auth.uid()
    or exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.owner_type = 'user'
    )
    or exists (
      select 1 from public.user_capabilities uc
      where uc.user_id = auth.uid() and uc.capability in ('instructor', 'assessor')
    )
    or public.has_permission('content.manage')
  );

-- ------------------------------------------------------------
-- 3. PERMISSIVE grant: the restrictive policy above can only ever
--    narrow access, never widen it — a submitter who isn't enrolled in
--    the shared course they proposed a lesson for (the normal case) had
--    no permissive policy granting them SELECT at all. Scoped tightly
--    to owner_type IS NULL (shared courses only) so this does NOT leak
--    a *personal* course's private lesson content to unrelated
--    instructors/assessors elsewhere on the platform — that privacy
--    model (014) stays completely separate from this one.
-- ------------------------------------------------------------
drop policy if exists "Lessons: submitter and reviewers read shared proposals" on public.lessons;
create policy "Lessons: submitter and reviewers read shared proposals" on public.lessons
  for select using (
    exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.owner_type is null
    )
    and (
      last_edited_by = auth.uid()
      or exists (
        select 1 from public.user_capabilities uc
        where uc.user_id = auth.uid() and uc.capability in ('instructor', 'assessor')
      )
      or public.has_permission('content.manage')
    )
  );
