-- ============================================================
-- WOW - World of Work — Migration 040
-- Instructors screen (item 7 of the navigation-restructuring batch).
-- Confirmed narrow scope: NOT the full #coach-marketplace backlog item
-- (ROADMAP.md §6) — no matching/marketplace design, no Zoom (explicitly
-- ruled out this round). Two tables:
--
--   instructor_profiles — one row per instructor: their price (already
--   converted to coins, so a learner sees a coin number, never a
--   currency one — same "price lives in a table, never hardcoded"
--   principle as pricing_units, just per-instructor instead of global)
--   and a simple availability flag.
--
--   instructor_assignments — the bidirectional link this round confirmed:
--   an instructor can invite a specific learner, OR a learner can send an
--   explicit request to a specific instructor. Both directions produce
--   the same row shape, distinguished by `initiated_by`. `price_coins` is
--   a SNAPSHOT of the instructor's price at request time (mirrors
--   `language_task_submissions.coin_cost`'s own snapshot pattern) — a
--   later price change must not retroactively change what an
--   already-pending request costs.
--
-- SCHEMA ONLY THIS ROUND. The actual "how does the explanation/help get
-- delivered after payment" mechanism (proposed: an in-platform message
-- thread per accepted assignment, mirroring decision_log/agent_messages'
-- existing append-only shape) is explicitly NOT built here — awaiting
-- confirmation before writing spend_coins()/messaging. Coins are
-- therefore NOT charged by anything in this migration; `price_coins` is
-- readable/quotable only. No forbid_client_write trigger is needed yet
-- either, since there is no payment path here yet to protect — added in
-- the follow-up migration alongside the accept-and-charge function.
-- ============================================================

create table if not exists public.instructor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- Denormalized on purpose: `profiles` SELECT is owner-only
  -- ("Profiles are viewable by owner", schema.sql) — a learner has no
  -- read access to another user's profiles row at all, so embedding
  -- profiles!instructor_id(full_name) from a learner's session would
  -- silently return null. Widening profiles' own RLS is a bigger, more
  -- sensitive change than this screen needs; a small public display
  -- name scoped to this table avoids touching that table's security
  -- model at all.
  display_name text not null,
  price_coins int not null check (price_coins >= 0),
  is_available boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_instructor_profiles_updated_at on public.instructor_profiles;
create trigger trg_instructor_profiles_updated_at before update on public.instructor_profiles
  for each row execute procedure public.set_updated_at();

alter table public.instructor_profiles enable row level security;

-- Price/availability are quoted to a learner BEFORE any relationship
-- exists (the whole point of the learner-initiated direction — they
-- need to see who to ask and what it costs), so this is signed-in-read,
-- not owner-scoped — same "signed-in read" treatment pricing_units and
-- game_generic_scenarios already get for comparable not-secret reference
-- data.
drop policy if exists "Instructor profiles: signed-in read" on public.instructor_profiles;
create policy "Instructor profiles: signed-in read" on public.instructor_profiles
  for select using (auth.uid() is not null);

-- The instructor manages their own price/availability. No INSERT policy
-- (a row is provisioned administratively when someone is set up as an
-- instructor — out of scope for this pass, matching the owner's own
-- "assignment mechanism decided later" framing) — only UPDATE is open.
drop policy if exists "Instructor profiles: instructor updates own" on public.instructor_profiles;
create policy "Instructor profiles: instructor updates own" on public.instructor_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.instructor_assignments (
  id uuid primary key default uuid_generate_v4(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  initiated_by text not null check (initiated_by in ('instructor', 'learner')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  context text,
  price_coins int not null check (price_coins >= 0),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_instructor_assignments_instructor on public.instructor_assignments(instructor_id, created_at desc);
create index if not exists idx_instructor_assignments_learner on public.instructor_assignments(learner_id, created_at desc);

alter table public.instructor_assignments enable row level security;

drop policy if exists "Instructor assignments: participants read" on public.instructor_assignments;
create policy "Instructor assignments: participants read" on public.instructor_assignments
  for select using (instructor_id = auth.uid() or learner_id = auth.uid());

-- A learner may create a row only as themselves, initiating as 'learner',
-- targeting a real available instructor and quoting that instructor's
-- REAL current price (not a client-supplied number) — mirrors 037/038's
-- own "never trust a client-sent price" rule, just enforced via a CHECK
-- against a live subquery instead of a SECURITY DEFINER function, since
-- there is no money movement here yet to protect (see header comment).
drop policy if exists "Instructor assignments: learner requests" on public.instructor_assignments;
create policy "Instructor assignments: learner requests" on public.instructor_assignments
  for insert with check (
    learner_id = auth.uid()
    and initiated_by = 'learner'
    and status = 'pending'
    and exists (
      select 1 from public.instructor_profiles ip
       where ip.user_id = instructor_assignments.instructor_id
         and ip.is_available
         and ip.price_coins = instructor_assignments.price_coins
    )
  );

-- Symmetric policy for the instructor-invites-learner direction.
drop policy if exists "Instructor assignments: instructor invites" on public.instructor_assignments;
create policy "Instructor assignments: instructor invites" on public.instructor_assignments
  for insert with check (
    instructor_id = auth.uid()
    and initiated_by = 'instructor'
    and status = 'pending'
    and exists (
      select 1 from public.instructor_profiles ip
       where ip.user_id = instructor_assignments.instructor_id
         and ip.price_coins = instructor_assignments.price_coins
    )
  );

-- Either participant can respond (accept/decline) to a pending request.
-- RLS's WITH CHECK has no OLD/NEW comparison (that needs a trigger, not
-- a plain policy expression — `col = col` in a policy is a tautology
-- against the same new row, not an old-vs-new guard), so the "price/
-- parties can't change on response" rule below is enforced by an actual
-- trigger, not this policy alone.
drop policy if exists "Instructor assignments: participants respond" on public.instructor_assignments;
create policy "Instructor assignments: participants respond" on public.instructor_assignments
  for update using (
    (instructor_id = auth.uid() or learner_id = auth.uid()) and status = 'pending'
  ) with check (
    status in ('accepted', 'declined')
  );

create or replace function public.guard_instructor_assignment_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.instructor_id is distinct from old.instructor_id
     or new.learner_id is distinct from old.learner_id
     or new.price_coins is distinct from old.price_coins
     or new.initiated_by is distinct from old.initiated_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Only status may change when responding to an assignment' using errcode = '42501';
  end if;
  if new.status in ('accepted', 'declined') and new.responded_at is null then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_instructor_assignment_response on public.instructor_assignments;
create trigger trg_guard_instructor_assignment_response
  before update on public.instructor_assignments
  for each row execute procedure public.guard_instructor_assignment_response();

-- ============================================================
-- SELF-CHECK
-- ============================================================

do $$
declare
  v_profile_policies int;
  v_assignment_policies int;
begin
  select count(*) into v_profile_policies
    from pg_policies where schemaname = 'public' and tablename = 'instructor_profiles';
  if v_profile_policies <> 2 then
    raise exception 'instructor_profiles must have exactly 2 policies (signed-in read, instructor update), found %', v_profile_policies;
  end if;

  select count(*) into v_assignment_policies
    from pg_policies where schemaname = 'public' and tablename = 'instructor_assignments';
  if v_assignment_policies <> 4 then
    raise exception 'instructor_assignments must have exactly 4 policies, found %', v_assignment_policies;
  end if;

  raise notice '040 OK: instructor_profiles + instructor_assignments created, schema only — no payment/messaging path yet';
end $$;
