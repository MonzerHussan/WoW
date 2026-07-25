-- ============================================================
-- WOW - World of Work — Migration 021
-- Pronunciation practice: a learner records themselves reading an
-- English phrase, listens back, and (optionally, for coins) sends the
-- speech-to-text transcript to their agent for feedback.
--
-- DELIBERATELY NO UNIQUE CONSTRAINT, unlike language_task_submissions
-- (017): repeated practice is the entire point of this feature, so
-- every attempt is its own row and its own charge. That means the
-- unique index can't serve as the anti-double-charge guard here the
-- way it does for language tasks — nothing needs to, because repeats
-- are intentional rather than an error to prevent.
--
-- What is stored: the reference text and the TRANSCRIPT only. The
-- audio recording itself is never uploaded or persisted anywhere — it
-- lives in browser memory as a Blob for self-playback and dies with
-- the page. No audio storage means no voice-data retention duty.
-- ============================================================

create table if not exists public.pronunciation_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  reference_text text not null,
  transcript text not null,
  coin_cost int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pronunciation_attempts_user
  on public.pronunciation_attempts(user_id, created_at desc);

alter table public.pronunciation_attempts enable row level security;

drop policy if exists "owner can insert own attempt" on public.pronunciation_attempts;
create policy "owner can insert own attempt"
  on public.pronunciation_attempts for insert
  with check (user_id = auth.uid());

drop policy if exists "owner can read own attempts" on public.pronunciation_attempts;
create policy "owner can read own attempts"
  on public.pronunciation_attempts for select
  using (user_id = auth.uid());

-- Mirrors 018's lesson learned exactly: the route inserts the attempt
-- row before calling spend_coins(), so it needs a way to roll that row
-- back when the charge fails. Without a DELETE policy that rollback
-- silently no-ops (Postgres treats a zero-row DELETE as success), which
-- is precisely the orphaned-row bug 018 had to fix after the fact.
-- Scoped so only an unpaid row is ever deletable: once a
-- coin_transaction references the attempt, it is permanent.
drop policy if exists "owner can delete own unpaid attempt" on public.pronunciation_attempts;
create policy "owner can delete own unpaid attempt"
  on public.pronunciation_attempts for delete
  using (
    user_id = auth.uid()
    and not exists (
      select 1 from public.coin_transactions
      where ref_table = 'pronunciation_attempts' and ref_id = pronunciation_attempts.id
    )
  );

-- No UPDATE policy for anyone: an attempt is an immutable record.
