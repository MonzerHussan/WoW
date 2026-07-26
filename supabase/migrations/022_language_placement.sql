-- ============================================================
-- WOW - World of Work — Migration 022
-- Agent-led language layer, phase A: the one-time English placement
-- conversation. Two tables:
--
-- user_language_profiles — one row per user, written exactly once when
-- the agent concludes the free placement conversation. The PRIMARY KEY
-- on user_id IS the real "once only" guard: the API route checks it
-- before ever touching OpenAI, and the constraint itself backstops any
-- race between two parallel conversations (23505 -> treated as 409).
--
-- learner_notes — durable facts the learner tells the agent about
-- themselves. Append-only by design; today only the placement writes
-- them (source='placement'), later ordinary conversations will too
-- (source='conversation'). This is the beginning of real cross-session
-- agent memory — until now everything the learner said died with the
-- page (the client-held 20-message history).
--
-- No UPDATE and no DELETE policies on either table at this stage,
-- deliberately: re-placement ("test up to a higher level") is a
-- deferred owner decision, not a forgotten gap, and notes are an
-- append-only record.
-- ============================================================

create table if not exists public.user_language_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  english_level text not null check (english_level in ('A1','A2','B1','B2','C1','C2')),
  placement_summary text not null,
  placed_at timestamptz not null default now()
);

alter table public.user_language_profiles enable row level security;

drop policy if exists "owner reads own language profile" on public.user_language_profiles;
create policy "owner reads own language profile"
  on public.user_language_profiles for select
  using (user_id = auth.uid());

drop policy if exists "owner inserts own language profile" on public.user_language_profiles;
create policy "owner inserts own language profile"
  on public.user_language_profiles for insert
  with check (user_id = auth.uid());

create table if not exists public.learner_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  source text not null check (source in ('placement','conversation')),
  created_at timestamptz not null default now()
);

create index if not exists idx_learner_notes_user
  on public.learner_notes(user_id, created_at desc);

alter table public.learner_notes enable row level security;

drop policy if exists "owner reads own notes" on public.learner_notes;
create policy "owner reads own notes"
  on public.learner_notes for select
  using (user_id = auth.uid());

drop policy if exists "owner inserts own notes" on public.learner_notes;
create policy "owner inserts own notes"
  on public.learner_notes for insert
  with check (user_id = auth.uid());
