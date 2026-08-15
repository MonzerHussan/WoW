-- ============================================================
-- WOW - World of Work — Migration 074
-- Instructor profile fields + delivery mechanism (accept-and-charge,
-- messaging, rating). Builds directly on 040's "SCHEMA ONLY THIS
-- ROUND" instructor_profiles/instructor_assignments — this is the
-- confirmed follow-up.
--
-- Payment timing (confirmed): charged when the INSTRUCTOR accepts, not
-- when the learner requests. spend_coins() (007b) is deliberately left
-- untouched and is NOT called here — its `p_user is distinct from
-- auth.uid()` check is a documented security fix (007b's own header:
-- previously any authenticated client could drain another user's
-- wallet), and every one of its 7 existing call sites always passes
-- auth.uid() as p_user. The instructor-accepts-and-learner-pays shape
-- is a genuinely new "actor != payer" case, so accept_instructor_
-- assignment() below replicates spend_coins()'s exact internal logic
-- inline (balance check -> update wallets -> insert coin_transactions)
-- rather than touching the shared function or calling it with a
-- mismatched p_user (which would just return false).
--
-- Messaging (instructor_messages) follows the same "zero write
-- policies, all writes through one SECURITY DEFINER function" shape as
-- agent_messages (033) — participants-only read, no direct insert path.
--
-- Rating: learner -> instructor only (one-way, confirmed out of scope
-- reversed), one row per completed (accepted) assignment
-- (unique(assignment_id) — re-rating upserts rather than erroring,
-- since the brief only requires blocking rating WITHOUT a completed
-- assignment, not blocking a correction). Average is computed at
-- display time in the service layer, not materialized — trivial query
-- cost at this platform's scale, no staleness/double-write risk.
-- ============================================================

-- ------------------------------------------------------------
-- A. instructor_profiles — add bio/expertise/experience.
-- ------------------------------------------------------------
alter table public.instructor_profiles
  add column if not exists bio text,
  add column if not exists expertise_tags text[] not null default '{}',
  add column if not exists years_experience int check (years_experience >= 0);

-- ------------------------------------------------------------
-- B. accept_instructor_assignment — the actor (instructor) != the
-- payer (learner) case. Charges the learner atomically with the
-- status flip; a failed balance check leaves the row 'pending'
-- untouched (no ambiguous partial state).
-- ------------------------------------------------------------
create or replace function public.accept_instructor_assignment(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.instructor_assignments%rowtype;
  v_balance int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_assignment from public.instructor_assignments
   where id = p_assignment_id
   for update;

  if v_assignment is null then
    return jsonb_build_object('accepted', false, 'reason', 'assignment_not_found');
  end if;

  -- Identity check: confirms WHO is responding, never who pays.
  if v_assignment.instructor_id is distinct from auth.uid() then
    raise exception 'Only the invited instructor may accept this assignment' using errcode = '42501';
  end if;

  if v_assignment.status <> 'pending' then
    return jsonb_build_object('accepted', false, 'reason', 'not_pending', 'status', v_assignment.status);
  end if;

  select balance into v_balance from public.wallets where user_id = v_assignment.learner_id for update;
  if v_balance is null or v_balance < v_assignment.price_coins then
    return jsonb_build_object(
      'accepted', false,
      'reason', 'insufficient_balance',
      'balance', coalesce(v_balance, 0),
      'required', v_assignment.price_coins
    );
  end if;

  update public.wallets set balance = balance - v_assignment.price_coins
   where user_id = v_assignment.learner_id;

  insert into public.coin_transactions (user_id, amount, type, reason, ref_table, ref_id)
  values (v_assignment.learner_id, -v_assignment.price_coins, 'spend', 'instructor_request', 'instructor_assignments', p_assignment_id);

  update public.instructor_assignments set status = 'accepted' where id = p_assignment_id;

  return jsonb_build_object('accepted', true, 'coinsCharged', v_assignment.price_coins, 'learnerId', v_assignment.learner_id);
end;
$$;

revoke execute on function public.accept_instructor_assignment(uuid) from public, anon;
grant execute on function public.accept_instructor_assignment(uuid) to authenticated;

-- ------------------------------------------------------------
-- C. instructor_messages — participants-only, append-only, no direct
-- write path (same shape as agent_messages, 033).
-- ------------------------------------------------------------
create table public.instructor_messages (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.instructor_assignments(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);
create index idx_instructor_messages_assignment on public.instructor_messages(assignment_id, created_at);

alter table public.instructor_messages enable row level security;

create policy "Instructor messages: participants read" on public.instructor_messages
  for select using (
    exists (
      select 1 from public.instructor_assignments ia
       where ia.id = assignment_id
         and (ia.instructor_id = auth.uid() or ia.learner_id = auth.uid())
    )
  );
-- No INSERT policy — send_instructor_message() is the only writer.

create or replace function public.send_instructor_message(p_assignment_id uuid, p_content text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.instructor_assignments%rowtype;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    return jsonb_build_object('sent', false, 'reason', 'empty_content');
  end if;

  select * into v_assignment from public.instructor_assignments where id = p_assignment_id;
  if v_assignment is null then
    return jsonb_build_object('sent', false, 'reason', 'assignment_not_found');
  end if;
  if auth.uid() is distinct from v_assignment.instructor_id and auth.uid() is distinct from v_assignment.learner_id then
    raise exception 'Not a participant in this assignment' using errcode = '42501';
  end if;
  if v_assignment.status <> 'accepted' then
    return jsonb_build_object('sent', false, 'reason', 'assignment_not_accepted');
  end if;

  insert into public.instructor_messages (assignment_id, sender_id, content)
  values (p_assignment_id, auth.uid(), trim(p_content))
  returning id into v_message_id;

  return jsonb_build_object('sent', true, 'messageId', v_message_id);
end;
$$;

revoke execute on function public.send_instructor_message(uuid, text) from public, anon;
grant execute on function public.send_instructor_message(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- D. instructor_ratings — learner -> instructor, one-way, tied to a
-- completed (accepted) assignment. Signed-in read (same treatment as
-- instructor_profiles itself) so any learner can see an instructor's
-- track record before requesting them.
-- ------------------------------------------------------------
create table public.instructor_ratings (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null unique references public.instructor_assignments(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id),
  learner_id uuid not null references public.profiles(id),
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index idx_instructor_ratings_instructor on public.instructor_ratings(instructor_id);

alter table public.instructor_ratings enable row level security;

create policy "Instructor ratings: signed-in read" on public.instructor_ratings
  for select using (auth.uid() is not null);
-- No INSERT policy — rate_instructor() is the only writer.

create or replace function public.rate_instructor(p_assignment_id uuid, p_stars int, p_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.instructor_assignments%rowtype;
  v_rating_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    return jsonb_build_object('rated', false, 'reason', 'invalid_stars');
  end if;

  select * into v_assignment from public.instructor_assignments where id = p_assignment_id;
  if v_assignment is null then
    return jsonb_build_object('rated', false, 'reason', 'assignment_not_found');
  end if;
  if v_assignment.learner_id is distinct from auth.uid() then
    raise exception 'Only the learner may rate this assignment' using errcode = '42501';
  end if;
  if v_assignment.status <> 'accepted' then
    return jsonb_build_object('rated', false, 'reason', 'assignment_not_completed');
  end if;

  insert into public.instructor_ratings (assignment_id, instructor_id, learner_id, stars, comment)
  values (p_assignment_id, v_assignment.instructor_id, auth.uid(), p_stars, p_comment)
  on conflict (assignment_id) do update set stars = excluded.stars, comment = excluded.comment
  returning id into v_rating_id;

  return jsonb_build_object('rated', true, 'ratingId', v_rating_id);
end;
$$;

revoke execute on function public.rate_instructor(uuid, int, text) from public, anon;
grant execute on function public.rate_instructor(uuid, int, text) to authenticated;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_cols int;
  v_msg_policies int;
  v_msg_insert_policies int;
  v_rating_policies int;
  v_rating_insert_policies int;
  v_fn_accept int;
  v_fn_send int;
  v_fn_rate int;
  v_spend_coins_def text;
begin
  select count(*) into v_cols from information_schema.columns
   where table_schema = 'public' and table_name = 'instructor_profiles'
     and column_name in ('bio', 'expertise_tags', 'years_experience');
  if v_cols <> 3 then
    raise exception '074 failed: expected 3 new instructor_profiles columns, found %', v_cols;
  end if;

  select count(*) into v_fn_accept from pg_proc where proname = 'accept_instructor_assignment';
  if v_fn_accept = 0 then
    raise exception '074 failed: accept_instructor_assignment() was not created';
  end if;

  select count(*) into v_fn_send from pg_proc where proname = 'send_instructor_message';
  if v_fn_send = 0 then
    raise exception '074 failed: send_instructor_message() was not created';
  end if;

  select count(*) into v_fn_rate from pg_proc where proname = 'rate_instructor';
  if v_fn_rate = 0 then
    raise exception '074 failed: rate_instructor() was not created';
  end if;

  select count(*) into v_msg_policies from pg_policies
   where schemaname = 'public' and tablename = 'instructor_messages';
  if v_msg_policies <> 1 then
    raise exception '074 failed: instructor_messages must have exactly 1 policy (select), found %', v_msg_policies;
  end if;
  select count(*) into v_msg_insert_policies from pg_policies
   where schemaname = 'public' and tablename = 'instructor_messages' and cmd = 'INSERT';
  if v_msg_insert_policies <> 0 then
    raise exception '074 failed: instructor_messages must have ZERO insert policies, found %', v_msg_insert_policies;
  end if;

  select count(*) into v_rating_policies from pg_policies
   where schemaname = 'public' and tablename = 'instructor_ratings';
  if v_rating_policies <> 1 then
    raise exception '074 failed: instructor_ratings must have exactly 1 policy (select), found %', v_rating_policies;
  end if;
  select count(*) into v_rating_insert_policies from pg_policies
   where schemaname = 'public' and tablename = 'instructor_ratings' and cmd = 'INSERT';
  if v_rating_insert_policies <> 0 then
    raise exception '074 failed: instructor_ratings must have ZERO insert policies, found %', v_rating_insert_policies;
  end if;

  -- Confirms spend_coins() itself was NOT touched by this migration.
  select pg_get_functiondef(oid) into v_spend_coins_def from pg_proc where proname = 'spend_coins';
  if v_spend_coins_def not ilike '%p_user is distinct from auth.uid()%' then
    raise exception '074 failed: spend_coins() self-check appears modified — this migration must never touch it';
  end if;

  raise notice '074 OK: instructor_profiles extended, accept/message/rate functions installed, spend_coins() untouched.';
end $$;
