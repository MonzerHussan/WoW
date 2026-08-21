-- ============================================================
-- WOW - World of Work — Migration 079
-- Two data corrections found by walking Level 1 end to end as a fresh
-- account on 2026-08-20. No schema change: no new column, table,
-- function or policy.
--
-- THIS FILE WAS WRITTEN TO THE REPOSITORY BEFORE BEING APPLIED, and
-- applied by copying from it — the rule added to CLAUDE.md after 078 was
-- applied first and reconstructed afterwards. This is its first real
-- exercise.
--
-- ------------------------------------------------------------
-- A. enrollments.progress — backfill
-- ------------------------------------------------------------
-- The column had NO writer anywhere in the codebase, so every row ever
-- created sat at 0. The walk proved it: 19 of 19 lessons completed,
-- progress still 0. The agent reads this column to tell a learner
-- `"<course>" (N% done)`, so every user was being told 0% regardless of
-- what they had finished.
--
-- The forward fix ships in the same commit as this file
-- (features/lms/services/progress.service.ts, called from
-- app/api/lms/lessons/complete/route.ts — the one route the completion
-- button calls). This migration only repairs rows that already exist;
-- without it they stay 0 until their owner happens to finish another
-- lesson.
--
-- DEFINITION (stated here and in the service, because the column had
-- none): progress = the percentage of the COURSE'S LESSONS this user has
-- completed, rounded, 0..100. Lessons only — no quiz, no project.
--
-- `status` IS DELIBERATELY NOT TOUCHED. Moving an enrollment to
-- 'completed' at 100% lessons would declare a certificated course
-- finished while its final assessment is still unmarked. Per the owner's
-- decision of 2026-08-20 the completion record requires all lessons AND
-- a passed final assessment, so `status` must mean the same thing and is
-- set by the issuing function when that is built — not here, and not on
-- lessons alone.
--
-- EXPECTED EFFECT, measured before writing and reported to the owner:
-- 51 enrollments exist; 40 have zero completed lessons and stay 0; 11
-- change, of which 2 belong to real accounts (monzer2023bar@gmail.com
-- -> 11, monzerhasaan@gmail.com -> 5) and exactly 1 reaches 100 (the
-- walk account). No enrollment points at a course with zero lessons, so
-- there is no division by zero. The column feeds display and the agent
-- only — no permission, points or money path reads it.
-- ------------------------------------------------------------

with course_lessons as (
  select m.course_id, count(*)::numeric as total
  from public.lessons l
  join public.modules m on m.id = l.module_id
  group by m.course_id
),
computed as (
  select e.id as enrollment_id,
         round(
           (select count(*)
              from public.lesson_progress lp
              join public.lessons l2 on l2.id = lp.lesson_id
              join public.modules m2 on m2.id = l2.module_id
             where lp.user_id = e.user_id
               and lp.completed
               and m2.course_id = e.course_id
           )::numeric * 100 / cl.total
         )::int as new_progress
  from public.enrollments e
  join course_lessons cl on cl.course_id = e.course_id
  where cl.total > 0
)
update public.enrollments e
   set progress = least(100, c.new_progress)
  from computed c
 where c.enrollment_id = e.id
   and e.progress is distinct from least(100, c.new_progress);

-- ------------------------------------------------------------
-- B. Duplicate order_index in Level 1, Module 3
-- ------------------------------------------------------------
-- Two lessons both sat at order_index = 5:
--   'Lesson 3.5: Closing'          (1629 chars) — the numbered lesson
--   'إدارة التغيير أثناء التنفيذ'  (225 chars)  — an unnumbered extra
-- so their display order was undefined.
--
-- The extra lesson moves to 6 rather than renumbering the 3.x sequence.
-- Any other arrangement puts a lesson titled "Lesson 3.4"/"Lesson 3.5"
-- at a position that contradicts its own title; this keeps every
-- numbered title matching its slot and appends the supplementary lesson
-- at the end of the module. Titles are not edited.
--
-- Matched by id, not by title: a title match would silently do nothing
-- if the text were ever edited, and the self-check below would then be
-- the only thing that noticed.
-- ------------------------------------------------------------

update public.lessons
   set order_index = 6
 where id = '4c0d03d4-3fe3-4eed-b72c-c3e78b6adc93'
   and order_index = 5;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_zero_but_done int;
  v_over_100 int;
  v_dupes int;
  v_walk_progress int;
  v_status_changed int;
begin
  -- 1. No enrollment with completed lessons is still sitting at 0.
  select count(*) into v_zero_but_done
    from public.enrollments e
   where e.progress = 0
     and exists (
       select 1 from public.lesson_progress lp
       join public.lessons l on l.id = lp.lesson_id
       join public.modules m on m.id = l.module_id
      where lp.user_id = e.user_id and lp.completed and m.course_id = e.course_id
     );
  if v_zero_but_done > 0 then
    raise exception '079 failed: % enrollment(s) have completed lessons but progress = 0', v_zero_but_done;
  end if;

  -- 2. Nothing exceeded 100.
  select count(*) into v_over_100 from public.enrollments where progress > 100 or progress < 0;
  if v_over_100 > 0 then
    raise exception '079 failed: % enrollment(s) outside 0..100', v_over_100;
  end if;

  -- 3. status was NOT moved by this migration — every row must still be
  --    in_progress, since nothing has ever set anything else.
  select count(*) into v_status_changed from public.enrollments where status <> 'in_progress';
  if v_status_changed > 0 then
    raise exception '079 failed: % enrollment(s) left in_progress — this migration must not touch status', v_status_changed;
  end if;

  -- 4. No module in Level 1 has two lessons sharing an order_index.
  select count(*) into v_dupes from (
    select l.module_id, l.order_index
      from public.lessons l
      join public.modules m on m.id = l.module_id
     where m.course_id = '8986e80e-4f85-48d5-9abe-e7669b3bb1cb'
     group by l.module_id, l.order_index
    having count(*) > 1
  ) d;
  if v_dupes > 0 then
    raise exception '079 failed: % duplicate order_index group(s) remain in Level 1', v_dupes;
  end if;

  -- 5. The one account that finished every lesson reads 100.
  select e.progress into v_walk_progress
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
   where p.email = 'wow-walk-1787231230435@example.com';
  if v_walk_progress is not null and v_walk_progress <> 100 then
    raise exception '079 failed: the fully-completed enrollment reads %, expected 100', v_walk_progress;
  end if;

  raise notice '079 OK: progress backfilled from lesson_progress (status untouched); Level 1 lesson order is unambiguous.';
end $$;
