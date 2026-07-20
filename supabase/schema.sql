-- ============================================================
-- WOW - World of Work — Supabase / Postgres schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES  (extends auth.users)
-- ============================================================
create type account_type as enum ('student', 'job_seeker', 'freelancer', 'employee', 'company');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  account_type account_type not null default 'student',
  avatar_url text,

  -- Onboarding
  onboarding_completed boolean default false,
  onboarding_goal text,
  pmp_level_interest int check (pmp_level_interest between 1 and 4),

  -- Gamification
  points int not null default 0,
  level int not null default 1,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'account_type')::account_type, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. COURSES & PMP LEVELS
-- ============================================================
create type course_track as enum ('education', 'employment', 'promotion');

create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  track course_track not null,
  description text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- PMP is modeled as a single course with 4 progressive levels.
create table public.pmp_levels (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  level_number int not null check (level_number between 1 and 4),
  title text not null,
  description text,
  content jsonb default '{}'::jsonb,   -- lessons, quizzes, videos, etc.
  points_reward int default 100,
  unique (course_id, level_number)
);

create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  progress int default 0 check (progress between 0 and 100),
  status text default 'in_progress' check (status in ('in_progress', 'completed', 'paused')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "Enrollments are viewable by owner"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "Enrollments are manageable by owner"
  on public.enrollments for all
  using (auth.uid() = user_id);


-- ============================================================
-- 3. GAMIFICATION — badges, user_badges, leaderboard
-- ============================================================
create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  icon text,           -- emoji or icon key
  points_value int default 0
);

create table public.user_badges (
  user_id uuid references public.profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "User badges are viewable by owner"
  on public.user_badges for select
  using (auth.uid() = user_id);

-- Public leaderboard view (only non-sensitive fields exposed)
create view public.leaderboard as
  select
    id as user_id,
    full_name,
    avatar_url,
    points,
    level,
    rank() over (order by points desc) as rank
  from public.profiles
  order by points desc;


-- ============================================================
-- 4. "PROJECT HORIZON" LEARNING SERIES
-- ============================================================
create table public.horizon_episodes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  order_index int not null,
  unlock_points int default 0,       -- points needed to unlock this episode
  video_url text,
  created_at timestamptz default now()
);

create table public.horizon_progress (
  user_id uuid references public.profiles(id) on delete cascade,
  episode_id uuid references public.horizon_episodes(id) on delete cascade,
  watched boolean default false,
  watched_at timestamptz,
  primary key (user_id, episode_id)
);

alter table public.horizon_progress enable row level security;

create policy "Horizon progress is viewable by owner"
  on public.horizon_progress for select
  using (auth.uid() = user_id);

create policy "Horizon progress is manageable by owner"
  on public.horizon_progress for all
  using (auth.uid() = user_id);


-- ============================================================
-- 5. NOVA — AI agent conversation log
-- ============================================================
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz default now()
);

alter table public.ai_conversations enable row level security;

create policy "Conversations are viewable by owner"
  on public.ai_conversations for select
  using (auth.uid() = user_id);

create policy "Conversations are insertable by owner"
  on public.ai_conversations for insert
  with check (auth.uid() = user_id);


-- ============================================================
-- 6. SEED DATA (sample) — safe to remove in production
-- ============================================================
insert into public.courses (title, track, description, order_index) values
  ('PMP — Project Management Professional', 'education', 'برنامج PMP الكامل بأربع مستويات تصاعدية', 1),
  ('Interview Readiness', 'employment', 'تجهيز شامل لمقابلات التوظيف', 2),
  ('Leadership Track', 'promotion', 'مسار تطوير مهارات القيادة للترقية', 3);

insert into public.badges (name, description, icon, points_value) values
  ('أول خطوة', 'أكملت أول درس على المنصة', '🎯', 10),
  ('قارئ نهم', 'أكملت 5 دورات', '📚', 50),
  ('بطل PMP', 'أنهيت المستوى الأول من PMP', '🏆', 100),
  ('نجم التوظيف', 'حصلت على أول وظيفة عبر المنصة', '⭐', 200);

insert into public.horizon_episodes (title, description, order_index, unlock_points) values
  ('الحلقة 1: البداية', 'أول خطوة في رحلة Project Horizon', 1, 0),
  ('الحلقة 2: التحدي الأول', 'مواجهة أول عقبة مهنية', 2, 50),
  ('الحلقة 3: التحالف', 'بناء شبكة علاقات مهنية', 3, 150),
  ('الحلقة 4: القمة', 'الوصول لموقع القيادة', 4, 400);
