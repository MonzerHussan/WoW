-- ============================================================
-- WOW - World of Work — Migration 029
-- Closes TECH_DEBT #15: abandoned placement conversations were an
-- unbounded real OpenAI cost.
--
-- THE GAP: /api/agent/placement's once-only guard (the
-- user_language_profiles PRIMARY KEY) only fires after a COMPLETED
-- placement. A user who starts the free conversation and abandons it
-- before the model emits its placement block can start over forever, and
-- every message is a real, billable model invocation.
--
-- The only bound was `rateLimit()` — 15 messages / 10 minutes, held in
-- ONE serverless instance's memory. It resets on every deploy and every
-- cold start, and on a multi-instance host the effective limit is
-- (15 x instance count). It slows a user down for ten minutes; it does
-- not stop them spending all day.
--
-- THE FIX: a durable per-user counter in the database, checked and
-- incremented in one atomic statement immediately before the OpenAI
-- call. A restart cannot reset it because it is not in memory.
--
-- The cap is 40 messages TOTAL per user across every session and every
-- restart. A full placement is 5-8 exchanges and the route force-
-- concludes at 14, so 40 leaves room for a user who abandons and
-- restarts twice over and still finishes properly — while turning
-- "unbounded" into a number.
--
-- NOTE the cap is a constant INSIDE the function, not a parameter. A
-- p_cap argument would be supplied by the caller, and PostgREST exposes
-- every public function — so the limit would have been trivially
-- bypassable by passing a bigger number. Same reasoning as never
-- accepting a coin amount or a points amount from a client.
-- ============================================================

create table if not exists public.placement_usage (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  message_count int not null default 0,
  first_message_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table public.placement_usage enable row level security;

-- Read-only for the owner: useful for showing "you have N left" later,
-- and harmless — knowing your own count does not raise it.
drop policy if exists "Placement usage: owner reads" on public.placement_usage;
create policy "Placement usage: owner reads" on public.placement_usage
  for select using (auth.uid() = user_id);

-- NO insert/update/delete policy, deliberately. With RLS on and no write
-- policy, a client cannot reset or lower its own counter by any route —
-- the security-definer function below is the only writer. Same rule as
-- pricing_units (024) and the points columns (027): anything that
-- protects money is never a broad RLS write.

/**
 * Atomically counts one placement message against the caller's lifetime
 * quota and reports whether it is allowed.
 *
 * The check and the increment are ONE statement on purpose. Doing
 * `select count` then `update` would leave a window where two concurrent
 * requests both read 39 and both proceed — precisely the kind of race a
 * cost control must not have. The `where message_count < cap` on the
 * conflict branch means an over-quota caller updates zero rows and the
 * counter stops growing instead of climbing forever.
 */
create or replace function public.consume_placement_quota()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap constant int := 40;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.placement_usage (user_id, message_count, first_message_at, last_message_at)
  values (auth.uid(), 1, now(), now())
  on conflict (user_id) do update
     set message_count = public.placement_usage.message_count + 1,
         last_message_at = now()
   where public.placement_usage.message_count < v_cap
  returning message_count into v_count;

  if v_count is null then
    -- The conflict branch matched nothing, i.e. the WHERE failed: the
    -- caller is already at or past the cap. Read the stored value back
    -- so the caller can be told exactly where they stand.
    select message_count into v_count
      from public.placement_usage where user_id = auth.uid();
    return jsonb_build_object('allowed', false, 'count', coalesce(v_count, 0), 'cap', v_cap);
  end if;

  return jsonb_build_object('allowed', true, 'count', v_count, 'cap', v_cap);
end;
$$;

revoke execute on function public.consume_placement_quota() from public, anon;
grant execute on function public.consume_placement_quota() to authenticated;

do $$
declare
  v_policies int;
  v_fn int;
begin
  select count(*) into v_fn from pg_proc where proname = 'consume_placement_quota';
  if v_fn = 0 then
    raise exception 'consume_placement_quota() was not created';
  end if;

  -- Exactly one policy, and it must be the SELECT one. A write policy
  -- here would hand users the ability to reset their own cost cap.
  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'placement_usage';
  if v_policies <> 1 then
    raise exception 'placement_usage must have exactly 1 (read-only) policy, found %', v_policies;
  end if;

  raise notice '029 OK: placement_usage created, read-only to owners, quota function installed (cap 40)';
end $$;
