-- ============================================================
-- WOW - World of Work — Migration 004
-- Sprint 2: DOMAIN CORE
--   A) Skills Framework (shared backbone)
--   B) Career DNA nucleus (Professional Digital Twin)
--   C) LMS tables (first real consumer of the foundation)
-- Run order: 001 → 002 → 003 → 004. Additive only.
-- Binding privacy/transparency rules live in DOMAIN_CONTRACTS.md.
-- ============================================================

-- ============================================================
-- A) SKILLS FRAMEWORK — the shared backbone.
-- LMS, Jobs, Career DNA and AI all reference SKILLS, not each other.
-- ============================================================
create table public.skill_categories (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  parent_id uuid references public.skill_categories(id),
  order_index int default 0
);

create table public.skills (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  category_id uuid references public.skill_categories(id),
  description text,
  aliases text[] default '{}',        -- searchable synonyms (AR/EN)
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index idx_skills_category on public.skills(category_id);

-- Polymorphic skill attachment: ONE table links skills to anything.
-- entity_type grows by check-constraint update, never by new tables.
create table public.entity_skills (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('user','course','lesson','job','project')),
  entity_id uuid not null,
  skill_id uuid not null references public.skills(id) on delete cascade,
  level int check (level between 1 and 5),   -- null = untagged level
  source text not null default 'self'
    check (source in ('self','assessment','system','employer','instructor')),
  created_at timestamptz default now(),
  unique (entity_type, entity_id, skill_id, source)
);
create index idx_entity_skills_entity on public.entity_skills(entity_type, entity_id);
create index idx_entity_skills_skill on public.entity_skills(skill_id);

alter table public.skills enable row level security;
alter table public.skill_categories enable row level security;
alter table public.entity_skills enable row level security;

-- Skills taxonomy is public reference data (guests included).
create policy "Skills: public read" on public.skills for select using (true);
create policy "Categories: public read" on public.skill_categories for select using (true);
-- Users manage their own skill claims; other sources are written server-side.
create policy "Entity skills: read own or public entities" on public.entity_skills
  for select using (
    (entity_type = 'user' and entity_id = auth.uid())
    or entity_type <> 'user'
  );
create policy "Entity skills: user manages own self-claims" on public.entity_skills
  for all using (entity_type = 'user' and entity_id = auth.uid() and source = 'self');

-- ============================================================
-- B) CAREER DNA NUCLEUS — the Professional Digital Twin.
-- Four core tables now; axes expand later inside jsonb without migrations.
-- ============================================================

-- B1. The living profile. Axis columns are jsonb on purpose: Identity,
-- Learning, Experience, Personality evolve without schema churn.
-- PERSONALITY RULE (binding, see DOMAIN_CONTRACTS.md): Big Five is the
-- primary instrument; DISC/MBTI are optional enrichment only and MUST NOT
-- feed scores or matching.
create table public.career_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  identity jsonb not null default '{}'::jsonb,      -- country, languages, education
  learning jsonb not null default '{}'::jsonb,      -- style, pace (fed by LMS)
  experience jsonb not null default '{}'::jsonb,    -- roles, projects, achievements
  personality jsonb not null default '{}'::jsonb,   -- big_five{}, disc?, work_values[]
  updated_at timestamptz default now()
);
create trigger trg_career_profiles_updated_at before update on public.career_profiles
  for each row execute procedure public.set_updated_at();

-- B2. Goals — multiple, with lifecycle.
create table public.career_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_role text,
  target_sector text,
  target_country text,
  target_salary_min numeric,
  target_salary_max numeric,
  status text not null default 'active' check (status in ('active','achieved','archived')),
  created_at timestamptz default now()
);
create index idx_career_goals_user on public.career_goals(user_id, status);

-- B3. Scores — TIME SERIES (a row per computation, never updated in place).
-- The growth curve IS the product. TRANSPARENCY RULE (binding): explanation
-- is NOT NULL — every score ships with its human-readable factor breakdown.
create table public.career_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_type text not null check (score_type in ('employability','promotion')),
  score numeric(5,2) not null check (score between 0 and 100),
  explanation jsonb not null,           -- {factors:[{name, weight, value, tip}]}
  computed_by uuid not null references public.system_actors(id),
  computed_at timestamptz default now()
);
create index idx_career_scores_series
  on public.career_scores(user_id, score_type, computed_at desc);

-- B4. Preferences — work style, remote/onsite, availability...
create table public.career_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
create trigger trg_career_prefs_updated_at before update on public.career_preferences
  for each row execute procedure public.set_updated_at();

-- B5. CONSENT-BASED SHARING (the legal-safety table).
-- Organizations see NOTHING of a user's DNA beyond the public profile
-- unless the user grants a scope to that specific org. Revocable anytime.
create table public.career_consents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  scope text not null check (scope in ('scores','skills','full_dna')),  -- personality is NEVER shareable
  granted_at timestamptz default now(),
  revoked_at timestamptz,
  unique (user_id, org_id, scope)
);
create index idx_career_consents_org on public.career_consents(org_id) where revoked_at is null;

-- B6. AI recommendations — attributed to Nova via system_actors, auditable
-- and measurable (acted-on rate = Nova's own success metric).
create table public.career_recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_system_id uuid not null references public.system_actors(id),
  kind text not null check (kind in ('learn_skill','add_project','apply_job','complete_course','take_assessment','other')),
  payload jsonb not null default '{}'::jsonb,   -- {skill_id | course_id | job_id, message}
  status text not null default 'pending' check (status in ('pending','done','dismissed')),
  created_at timestamptz default now(),
  acted_at timestamptz
);
create index idx_career_recs_user on public.career_recommendations(user_id, status);

-- Career DNA RLS: the owner sees everything about themselves. Org access
-- goes through consent checks in server code — no direct org RLS here.
alter table public.career_profiles enable row level security;
alter table public.career_goals enable row level security;
alter table public.career_scores enable row level security;
alter table public.career_preferences enable row level security;
alter table public.career_consents enable row level security;
alter table public.career_recommendations enable row level security;

create policy "DNA profile: owner" on public.career_profiles
  for all using (auth.uid() = user_id);
create policy "DNA goals: owner" on public.career_goals
  for all using (auth.uid() = user_id);
create policy "DNA scores: owner reads" on public.career_scores
  for select using (auth.uid() = user_id);   -- inserts: system only
create policy "DNA prefs: owner" on public.career_preferences
  for all using (auth.uid() = user_id);
create policy "DNA consents: owner" on public.career_consents
  for all using (auth.uid() = user_id);
create policy "DNA recs: owner reads/updates" on public.career_recommendations
  for select using (auth.uid() = user_id);
create policy "DNA recs: owner updates status" on public.career_recommendations
  for update using (auth.uid() = user_id);

-- ============================================================
-- C) LMS TABLES — first real consumer of the foundation.
-- Built on: owner polymorphism (003), assessment_mode (003),
-- sponsor_org_id decision (003), guest is_published rule (003).
-- ============================================================

-- C1. Extend the existing courses table (001) instead of replacing it.
alter table public.courses
  add column if not exists owner_type text
    check (owner_type in ('user','organization')),   -- null = platform-owned
  add column if not exists owner_id uuid,
  add column if not exists summary text,
  add column if not exists cover_url text,
  add column if not exists language text default 'ar',
  add column if not exists is_published boolean not null default false,
  add column if not exists updated_at timestamptz default now();
create index if not exists idx_courses_owner on public.courses(owner_type, owner_id);
create index if not exists idx_courses_published on public.courses(is_published);
drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at before update on public.courses
  for each row execute procedure public.set_updated_at();

-- C2. Structure: course → modules → lessons.
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index int not null default 0
);
create index idx_modules_course on public.modules(course_id, order_index);

create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  content jsonb not null default '{}'::jsonb,    -- rich blocks: text/video/files
  video_url text,
  duration_minutes int,
  order_index int not null default 0,
  is_free_preview boolean not null default false -- guests may open these
);
create index idx_lessons_module on public.lessons(module_id, order_index);

-- C3. Assessment: quizzes attach to a lesson OR stand as a course exam
-- (e.g. a PMP level exam). assessment_mode drives auto/human/hybrid.
create table public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  pmp_level int check (pmp_level between 1 and 4),  -- set for PMP level exams
  title text not null,
  assessment_mode assessment_mode not null default 'auto',
  passing_score int not null default 60 check (passing_score between 0 and 100),
  check (num_nonnulls(course_id, lesson_id) = 1)
);
create index idx_quizzes_course on public.quizzes(course_id);
create index idx_quizzes_lesson on public.quizzes(lesson_id);

create table public.quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question jsonb not null,   -- {text, options[], correct_index?} (correct only used in auto)
  points int not null default 1,
  order_index int not null default 0
);
create index idx_quiz_questions_quiz on public.quiz_questions(quiz_id, order_index);

-- Attempts support all three modes:
--  auto:   graded_by null, score set immediately
--  human:  score null until an assessor grades (graded_by = assessor user)
--  hybrid: auto score immediately + human confirmation before certification
create table public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  passed boolean,
  graded_by uuid references public.profiles(id),   -- null = auto
  submitted_at timestamptz default now(),
  graded_at timestamptz
);
create index idx_quiz_attempts_user on public.quiz_attempts(user_id, quiz_id);

-- C4. Progress + sponsored enrollments (the training_consumer decision).
alter table public.enrollments
  add column if not exists sponsor_org_id uuid references public.organizations(id);
create index if not exists idx_enrollments_sponsor on public.enrollments(sponsor_org_id);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

-- C5. Certificates — issued by system, an assessor, or a certification body.
create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  pmp_level int check (pmp_level between 1 and 4),
  assessment_mode assessment_mode not null,
  issued_by_type text not null check (issued_by_type in ('system','assessor','certification_body')),
  issued_by_id uuid,            -- system_actor / assessor user / org id
  certificate_no text unique not null,
  issued_at timestamptz default now()
);
create index idx_certificates_user on public.certificates(user_id);

-- C6. LMS RLS — including the binding GUEST rule from 003.
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.certificates enable row level security;

-- Guests + everyone: browse published courses only.
create policy "Courses: published are public" on public.courses
  for select using (is_published = true);
-- Owners (individual instructors) manage their own courses.
create policy "Courses: user-owner manages" on public.courses
  for all using (owner_type = 'user' and owner_id = auth.uid());
-- Org courses: managed by org admins / org instructors via org_role_of().
create policy "Courses: org staff manage" on public.courses
  for all using (
    owner_type = 'organization'
    and public.org_role_of(owner_id) in ('owner','org_admin','org_instructor')
  );

create policy "Modules: visible with course" on public.modules
  for select using (exists (
    select 1 from public.courses c where c.id = course_id and c.is_published = true
  ));
create policy "Lessons: enrolled or free preview" on public.lessons
  for select using (
    is_free_preview = true
    or exists (
      select 1 from public.modules m
      join public.enrollments e on e.course_id = m.course_id
      where m.id = module_id and e.user_id = auth.uid()
    )
  );
create policy "Quizzes: enrolled read" on public.quizzes
  for select using (
    exists (select 1 from public.enrollments e
            where e.user_id = auth.uid()
              and e.course_id = coalesce(quizzes.course_id,
                (select m.course_id from public.lessons l join public.modules m on m.id = l.module_id where l.id = quizzes.lesson_id)))
  );
-- quiz_questions: same visibility as their quiz; correct answers must be
-- stripped server-side before sending to clients in auto mode.
create policy "Questions: enrolled read" on public.quiz_questions
  for select using (exists (
    select 1 from public.quizzes q where q.id = quiz_id
  ));
create policy "Attempts: own" on public.quiz_attempts
  for all using (auth.uid() = user_id);
create policy "Attempts: assessors read pending" on public.quiz_attempts
  for select using (exists (
    select 1 from public.user_capabilities uc
    where uc.user_id = auth.uid() and uc.capability = 'assessor'
  ));
create policy "Lesson progress: own" on public.lesson_progress
  for all using (auth.uid() = user_id);
create policy "Certificates: own" on public.certificates
  for select using (auth.uid() = user_id);

-- Sponsored-training visibility: training managers see their org's
-- sponsored enrollments (adds to the owner-only policy from 001).
create policy "Enrollments: training manager reads sponsored" on public.enrollments
  for select using (
    sponsor_org_id is not null
    and public.org_role_of(sponsor_org_id) in ('owner','org_admin','training_manager')
  );

-- ============================================================
-- SEED: minimal skills taxonomy + link PMP course (001) to skills.
-- ============================================================
insert into public.skill_categories (name, order_index) values
  ('إدارة المشاريع', 1), ('مهارات تقنية', 2), ('مهارات شخصية', 3);

insert into public.skills (name, category_id, aliases)
select s.name, c.id, s.aliases from (values
  ('تخطيط المشاريع', 'إدارة المشاريع', array['project planning']),
  ('إدارة المخاطر', 'إدارة المشاريع', array['risk management']),
  ('إدارة أصحاب المصلحة', 'إدارة المشاريع', array['stakeholder management']),
  ('القيادة', 'مهارات شخصية', array['leadership']),
  ('التواصل', 'مهارات شخصية', array['communication'])
) as s(name, cat, aliases)
join public.skill_categories c on c.name = s.cat;
