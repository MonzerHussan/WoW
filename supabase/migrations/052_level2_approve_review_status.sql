-- ============================================================
-- WOW - World of Work — Migration 052
-- Fixes a real bug FOUND LIVE: after enrolling in the Level 2 course
-- and confirming enrollment ("✅ أنت مسجّل في هذه الدورة"), every unit
-- still showed "locked" — module.lessons came back empty even for an
-- enrolled student.
--
-- ROOT CAUSE: 047/048/051's lesson INSERTs never set `review_status`,
-- so each one defaulted to 'nova_check_pending' (008's column default).
-- 015c's RESTRICTIVE policy ("Lessons: pending shared-curriculum review
-- hidden from students") only lets an ordinary enrolled student see a
-- shared-course lesson when review_status is null OR 'approved' — this
-- is EXACTLY the same gap 015c's own migration already backfilled once
-- for the original 18 PMP Level 1 lessons (which predate the governance
-- workflow and were seeded directly as trusted content), and exactly
-- the trap its own header comment warned about. New shared-course
-- content added directly via SQL, same as this Level 2 course, needs
-- the same explicit backfill every time — that step was simply missed
-- for 047/048/051.
--
-- FIX: same backfill 015c already ran, scoped to this course's lessons.
-- ============================================================

update public.lessons l
set review_status = 'approved'
from public.modules m
join public.courses c on c.id = m.course_id
where l.module_id = m.id
  and c.title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني'
  and l.review_status is distinct from 'approved';

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_not_approved int;
begin
  select count(*) into v_not_approved
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
   where c.title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني'
     and l.review_status is distinct from 'approved';

  if v_not_approved > 0 then
    raise exception '052 failed: % Level 2 lesson(s) still not approved', v_not_approved;
  end if;

  raise notice '052 OK: all Level 2 lessons now review_status=approved';
end $$;
