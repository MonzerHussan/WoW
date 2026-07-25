-- ============================================================
-- WOW - World of Work — Migration 017
-- First real spend_coins() (007b) call site: submitting a module's
-- optional English language task. One submission per (user, lesson) —
-- the unique constraint below is the actual anti-replay guard, not
-- client-side disabling of the submit button.
--
-- Design note (per the raw seed content in 009_seed_pmp_level1.sql):
-- every module's optional_language_task text ends with "Submit your
-- draft to your Personal Companion for feedback" — a single text
-- submission routed to the user's own agent for feedback, regardless
-- of whether the module's task prose says "Write" or "Record/Prepare".
-- No task_type column exists (and none is added here): the six seeded
-- tasks split 3 write / 3 record-style by wording alone, with no
-- schema-level discriminator, and there is no audio recording/upload
-- capability anywhere in this project — so every task is answered as
-- text here, including the "record a 2-minute..." ones. Out of scope
-- for this migration: entity_skills/skill_evidence linkage
-- (career_dna_skills stays purely descriptive text) and wiring
-- spend_coins() into /api/agent itself (still deferred to the
-- subscriptions sprint, per CLAUDE.md).
-- ============================================================

create table if not exists public.language_task_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  task_text_snapshot text not null,
  response text not null,
  coin_cost int not null,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.language_task_submissions enable row level security;

drop policy if exists "owner can insert own submission" on public.language_task_submissions;
create policy "owner can insert own submission"
  on public.language_task_submissions for insert
  with check (user_id = auth.uid());

drop policy if exists "owner can read own submissions" on public.language_task_submissions;
create policy "owner can read own submissions"
  on public.language_task_submissions for select
  using (user_id = auth.uid());

-- No UPDATE, no DELETE policy for anyone — a submission is a permanent
-- record once made, same "no policy = no path" pattern already used
-- for `lessons` (SECURITY.md, Sprint 3.3).

-- wallets/coin_transactions already have owner-read SELECT policies
-- ("Wallet: owner reads", "Coin tx: owner reads" — 007b) — verified by
-- reading 007b_agent_and_coins.sql directly before writing this
-- migration; nothing to add here.
