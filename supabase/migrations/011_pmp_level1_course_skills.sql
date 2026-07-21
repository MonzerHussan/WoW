-- ============================================================
-- WOW - World of Work — Migration 011
-- Completes the LMS→DNA contract for the PMP Level 1 course (009):
-- tags the course itself with the 4 skills it teaches/tests via
-- entity_skills(entity_type='course'). Without this row, quiz-pass
-- confirmation (features/lms/services/dna.service.ts) has nothing to
-- credit the user with — it looks up course-level entity_skills to know
-- which skills to write to the user, and silently no-ops if none exist
-- (which is exactly what happened before this migration).
--
-- source='assessment': these are the skills PROVEN by passing an
-- assessor-confirmed hybrid quiz, not a self-claim.
-- Idempotent: unique (entity_type, entity_id, skill_id, source) already
-- exists on entity_skills (004), so ON CONFLICT DO NOTHING is safe to
-- re-run.
-- Run order: 001 → ... → 010 → 011. Additive only.
-- ============================================================

insert into public.entity_skills (entity_type, entity_id, skill_id, source)
select 'course', c.id, s.id, 'assessment'
from public.courses c
cross join public.skills s
where c.id = '8986e80e-4f85-48d5-9abe-e7669b3bb1cb'
  and s.name in ('تخطيط المشاريع', 'إدارة أصحاب المصلحة', 'القيادة', 'التواصل')
on conflict (entity_type, entity_id, skill_id, source) do nothing;
