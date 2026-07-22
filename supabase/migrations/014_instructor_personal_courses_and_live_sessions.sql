-- ============================================================
-- WOW - World of Work — Migration 014
-- Instructor system, part 1: personal independent courses (invite-only,
-- outside the shared-curriculum content_review_votes governance from 008)
-- + live sessions.
--
-- Rewritten idempotent (2nd attempt): a first run of this file hit
-- "policy already exists" partway through, and a read-only diagnostic
-- (information_schema + pg_policies) confirmed the DB is actually back
-- to a clean pre-014 state — none of this migration's objects persisted
-- (whatever partially applied was already cleaned up, and nothing here
-- overlaps with a genuinely pre-existing object). This version is safe
-- to run even if that's wrong and some piece did survive: every
-- `create policy` is preceded by `drop policy if exists`, every column/
-- index/table uses `if not exists`. Safe to re-run to completion from
-- any partial state.
--
-- BACKGROUND: courses.owner_type/owner_id and the "Courses: user-owner
-- manages" for-all policy already existed (004) — any authenticated user
-- can already own a course row. What was actually missing, and what this
-- migration adds:
--
-- 1. invite_code: a personal course has is_published = false by design
--    (never appears in the public catalog — features/lms getPublishedCourses
--    is untouched). invite_code is the only way to *discover* its id.
--    Enrollment itself was never actually gated by publish status — the
--    existing "Enrollments are manageable by owner" policy (schema.sql)
--    already lets any authenticated user self-insert an enrollment row
--    for any course_id they already know. So invite_code only needs to
--    solve discovery, not authorization.
--
-- 2. modules/lessons had NO owner-manage policy at all (only a
--    published-only SELECT policy for modules, and an enrolled-or-preview
--    SELECT policy for lessons) — every course built so far was seeded
--    directly via SQL Editor (superuser, bypasses RLS), so this gap was
--    never exercised by the app itself until now. Added owner "for all"
--    policies on both, scoped through the courses.owner_type='user' chain
--    — mirrors courses' own "user-owner manages" policy exactly. Also
--    added an "enrolled can read" SELECT policy on modules (lessons
--    already had the enrolled-read case) — without it, an enrolled
--    student's own personal-course modules would be invisible even
--    though the same student's *lessons* query would technically be
--    allowed, because the lessons policy's own join back to modules is
--    itself subject to modules' RLS.
--
-- 3. courses itself needs an "enrolled can read" SELECT policy too —
--    getCourseDetail() previously hard-filtered `.eq("is_published",
--    true)` in application code on top of RLS; that filter is relaxed in
--    this same change-set (course.service.ts) to let RLS decide, which
--    is what actually makes an enrolled student's personal course
--    resolve at /courses/[id] at all. Guests / non-enrolled / non-owner
--    users hitting an unpublished course id are unaffected — none of the
--    SELECT policies match for them, so they still get zero rows, same
--    as before.
--
-- Scope is deliberately limited to owner_type='user' (individual
-- instructors) — organization-owned course management (owner_type=
-- 'organization') has the same latent modules/lessons RLS gap but is out
-- of scope here; not touched.
--
-- Run order: 001 → ... → 013 → 014. Additive only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Personal course discovery: invite_code
-- ------------------------------------------------------------
alter table public.courses
  add column if not exists invite_code text unique;
create index if not exists idx_courses_invite_code on public.courses(invite_code);

drop policy if exists "Courses: invite-code courses are discoverable" on public.courses;
create policy "Courses: invite-code courses are discoverable" on public.courses
  for select using (invite_code is not null);

drop policy if exists "Courses: enrolled can read own course" on public.courses;
create policy "Courses: enrolled can read own course" on public.courses
  for select using (
    exists (select 1 from public.enrollments e where e.course_id = courses.id and e.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 2. modules/lessons: owner management + enrolled visibility
-- ------------------------------------------------------------
drop policy if exists "Modules: user-owner manages own course" on public.modules;
create policy "Modules: user-owner manages own course" on public.modules
  for all using (
    exists (
      select 1 from public.courses c
      where c.id = modules.course_id and c.owner_type = 'user' and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Modules: enrolled can read" on public.modules;
create policy "Modules: enrolled can read" on public.modules
  for select using (
    exists (select 1 from public.enrollments e where e.course_id = modules.course_id and e.user_id = auth.uid())
  );

drop policy if exists "Lessons: user-owner manages own course" on public.lessons;
create policy "Lessons: user-owner manages own course" on public.lessons
  for all using (
    exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.owner_type = 'user' and c.owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. Live sessions (a shared meeting link, not a Zoom API integration)
-- ------------------------------------------------------------
create table if not exists public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id),
  title text not null,
  meeting_link text not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz default now()
);
create index if not exists idx_live_sessions_course on public.live_sessions(course_id, scheduled_at);

-- Attendance is self-reported (the student clicks "I joined"), NOT
-- verified by Zoom or any meeting provider — this is a known, deliberate
-- design limitation (no Zoom API integration in this sprint). Do not
-- treat live_session_attendance as proof of actual attendance anywhere
-- downstream (e.g. it must never feed skill_evidence or points).
create table if not exists public.live_session_attendance (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz,
  primary key (session_id, user_id)
);

alter table public.live_sessions enable row level security;
alter table public.live_session_attendance enable row level security;

drop policy if exists "Live sessions: instructor manages own" on public.live_sessions;
create policy "Live sessions: instructor manages own" on public.live_sessions
  for all using (instructor_id = auth.uid());

drop policy if exists "Live sessions: enrolled students read" on public.live_sessions;
create policy "Live sessions: enrolled students read" on public.live_sessions
  for select using (
    exists (select 1 from public.enrollments e where e.course_id = live_sessions.course_id and e.user_id = auth.uid())
  );

drop policy if exists "Attendance: student marks own join" on public.live_session_attendance;
create policy "Attendance: student marks own join" on public.live_session_attendance
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.live_sessions ls
      join public.enrollments e on e.course_id = ls.course_id
      where ls.id = session_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "Attendance: student reads own" on public.live_session_attendance;
create policy "Attendance: student reads own" on public.live_session_attendance
  for select using (user_id = auth.uid());

drop policy if exists "Attendance: instructor reads own session's attendance" on public.live_session_attendance;
create policy "Attendance: instructor reads own session's attendance" on public.live_session_attendance
  for select using (
    exists (select 1 from public.live_sessions ls where ls.id = session_id and ls.instructor_id = auth.uid())
  );
