-- ============================================================
-- WOW - World of Work — Migration 036
-- Floating agent part 4: real-time voice calls (Sprint 3.4, Task 3).
--
-- WHY THIS SHAPE — the constraint that decided everything:
-- The call runs browser <-> OpenAI directly over WebRTC. Our server is
-- NOT on the media path, and (verified against OpenAI's current docs
-- before this was written) there is:
--   * no endpoint that returns a completed call's duration or usage,
--   * no `realtime.call.ended`/`.completed` webhook (only
--     `realtime.call.incoming`, which is SIP-inbound only),
--   * a sideband monitor socket (wss://api.openai.com/v1/realtime
--     ?call_id=...) that COULD meter a live call, but needs a
--     long-lived process this serverless deployment cannot host
--     (app/api/agent/route.ts already carries maxDuration = 30).
--
-- And the ephemeral client secret does NOT bound the call: its expiry
-- gates CREATING a session, not continuing one — "the session itself may
-- continue after that time once started". So a token TTL cannot enforce
-- the 5-minute cap either.
--
-- CONSEQUENCE, stated plainly rather than hidden: we can control whether
-- a call STARTS and what it COSTS, but we cannot force an in-progress
-- call to stop. A modified client can talk past the cap. That residual
-- exposure is bounded (the block is paid up front, one call at a time per
-- user) and is disclosed the same way DOMAIN_CONTRACTS §8 discloses
-- self-reported live-session attendance.
--
-- THE BILLING MODEL THAT SURVIVES THAT:
-- Charge the whole capped block up front; refund unused whole minutes on
-- a verified end; forfeit the block if the end is never reported.
-- Every number in the refund comes from THIS DATABASE'S clock
-- (started_at set at start, ended_at set at end) — never from a
-- client-supplied duration. A client cannot make its end-report arrive
-- EARLIER than it does; it can only arrive later (costing itself refund)
-- or never (forfeiting). So no client figure ever enters the money path,
-- which is the same rule that 027 (points) and 007b (spend_coins) hold.
--
-- MODEL AND CAP ARE CONSTANTS INSIDE THE FUNCTION, NOT PARAMETERS.
-- PostgREST exposes every public function, so a p_cap_minutes or
-- p_model argument would be supplied by the caller — the cap would be
-- raised and the cheap model swapped for the expensive one, by anyone.
-- Identical reasoning to 029's placement cap. Changing either is a
-- deliberate migration, not a client's choice.
--
-- THERE IS DELIBERATELY NO GENERIC REFUND FUNCTION. coin_transactions
-- has always permitted type='refund' but nothing has ever written one,
-- and credit_coins() (020) structurally cannot — it reads its amount
-- from coin_packages. The temptation is refund_coins(p_user, p_amount);
-- that would be a coin-minting hole exactly like the generic
-- award_points(reason) that 027 refused to write. The refund amount is
-- COMPUTED INSIDE end_agent_call() from a verified session row and is
-- never an argument.
-- ============================================================

-- ============================================================
-- A) CALL SESSIONS — the audit + billing record
-- ============================================================

create table if not exists public.agent_call_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- From the `Location` header on the browser's SDP POST to
  -- /v1/realtime/calls. Nullable: it does not exist at mint time, and a
  -- handshake that never completes never produces one — which is exactly
  -- how end_agent_call() recognises a call that never connected.
  openai_call_id text,

  -- Snapshots, not live lookups. Same discipline as
  -- language_task_submissions.coin_cost: a later /admin/pricing edit or a
  -- model change must never silently rewrite what a past call cost.
  model text not null,
  rate_per_minute int not null check (rate_per_minute > 0),
  cap_minutes int not null check (cap_minutes > 0),
  coins_authorized int not null check (coins_authorized > 0),
  coins_refunded int not null default 0 check (coins_refunded >= 0),

  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned', 'failed')),

  created_at timestamptz not null default now(),

  -- A refund can never exceed what was taken.
  constraint agent_call_refund_within_authorized
    check (coins_refunded <= coins_authorized),
  -- A closed session must have a closing timestamp, an open one must not.
  constraint agent_call_ended_matches_status
    check ((status = 'active') = (ended_at is null))
);

create index if not exists idx_agent_calls_user
  on public.agent_call_sessions(user_id, started_at desc);

-- ONE ACTIVE CALL PER USER, enforced by the database rather than by a
-- route check. Without this, a client could mint several concurrent
-- sessions and multiply our OpenAI spend while each individual session
-- still looked correctly paid for.
create unique index if not exists uq_agent_calls_one_active
  on public.agent_call_sessions(user_id)
  where status = 'active';

alter table public.agent_call_sessions enable row level security;

-- Owner may READ their own call history (for a "recent calls" view and
-- for disputes). Knowing your own history cannot raise your quota or
-- lower your bill.
drop policy if exists "Agent calls: owner reads" on public.agent_call_sessions;
create policy "Agent calls: owner reads" on public.agent_call_sessions
  for select using (auth.uid() = user_id);

-- NO insert/update/delete policy, deliberately — the three security
-- definer functions below are the only writers. Same rule as
-- placement_usage (029), pricing_units (024) and the points columns
-- (027): anything protecting money is never a broad RLS write.
--
-- Plus 030's STATEMENT-level trigger so a direct write is refused with an
-- explicit 42501 instead of the silent "200 with zero rows" that RLS
-- alone produces. It MUST be `for each statement`: with no write policy
-- at all, RLS filters every row out during the scan and a row-level
-- trigger would never fire (030's own lesson).
drop trigger if exists trg_agent_calls_forbid_client_write on public.agent_call_sessions;
create trigger trg_agent_calls_forbid_client_write
  before insert or update or delete on public.agent_call_sessions
  for each statement execute procedure public.forbid_client_write();

-- ============================================================
-- B) PRICE — one more pricing_units row, editable from /admin/pricing
-- ============================================================

-- 4 coins/minute is a PRE-LAUNCH ESTIMATE, set before any metered call
-- existed to measure. Basis: gpt-realtime-mini at $10/1M audio in,
-- $20/1M audio out, $0.30/1M CACHED audio in, against a coin worth
-- ~$0.0125-0.0167 (from coin_packages). A 5-minute call at 4/min = 20
-- coins ~ $0.25-0.33 of revenue against an estimated $0.04-0.06 of cost
-- WHEN THE PROMPT CACHE IS HITTING, and roughly break-even when it is
-- not. The audio-token-density figure behind that estimate is assumed,
-- not measured — verify it on the first real metered call.
-- Adjustable from /admin/pricing without a code change or a migration.
insert into public.pricing_units (key, coin_cost, label_ar, label_en)
values ('voice_call_minute', 4, 'مكالمة صوتية مع وكيلك (بالدقيقة)', 'Voice call with your agent (per minute)')
on conflict (key) do nothing;

-- ============================================================
-- C) VOICE TURNS IN AGENT MEMORY — provenance, not a second writer
-- ============================================================

-- Voice transcripts arrive over the WebRTC data channel, i.e. AT THE
-- CLIENT — because the sideband monitor that would let the server
-- capture them itself needs a persistent process we do not have. So
-- persisting them means accepting client-supplied text into agent
-- memory, which 033 deliberately removed for the text path ("the server
-- derives its own context, never trusts a client-sent transcript").
--
-- Accepted knowingly, with two bounds: every row records WHERE it came
-- from, and a voice turn is only accepted while that user actually has
-- an active call open. The residual risk is a user fabricating turns in
-- THEIR OWN agent context — no privilege escalation, no cost effect.
alter table public.agent_messages
  add column if not exists source text not null default 'text';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agent_messages_source_check'
  ) then
    alter table public.agent_messages
      add constraint agent_messages_source_check check (source in ('text', 'voice'));
  end if;
end $$;

-- Extended, not duplicated: record_agent_turn stays the single writer to
-- agent_messages. Dropping the 2-arg signature and recreating it with a
-- DEFAULTED third parameter keeps every existing caller
-- (app/api/agent/route.ts sends p_user_message + p_assistant_reply only)
-- working unchanged, while giving the voice path a way to mark its rows.
-- Adding a second overload instead would have left two writers, which is
-- precisely what this migration is asked not to do.
drop function if exists public.record_agent_turn(text, text);

create or replace function public.record_agent_turn(
  p_user_message text,
  p_assistant_reply text,
  p_source text default 'text'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_source not in ('text', 'voice') then
    raise exception 'Unknown message source %', p_source using errcode = '22023';
  end if;

  -- A voice turn is only believable while a voice call is actually open.
  -- Outside that window the client has no legitimate reason to be
  -- submitting transcripts, so this closes the "inject arbitrary history
  -- whenever you like" shape down to "inject during your own paid call".
  if p_source = 'voice' and not exists (
    select 1 from public.agent_call_sessions
     where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'No active voice call for this user' using errcode = '42501';
  end if;

  insert into public.agent_messages (user_id, role, content, source)
  values
    (auth.uid(), 'user', p_user_message, p_source),
    (auth.uid(), 'assistant', p_assistant_reply, p_source);
end;
$$;

revoke execute on function public.record_agent_turn(text, text, text) from public, anon;
grant execute on function public.record_agent_turn(text, text, text) to authenticated;

-- ============================================================
-- D) START — authorize and charge the whole block up front
-- ============================================================

/**
 * Opens a voice call for the caller and charges the full capped block.
 *
 * Returns jsonb rather than raising for the ordinary refusals
 * (insufficient balance, price unavailable, call already open): those are
 * expected outcomes a route must render to the user, not exceptions.
 * Authentication failure DOES raise — same split as 029.
 *
 * Charging the whole block up front is the only amount a client cannot
 * misreport, because it is taken before the client has done anything.
 */
create or replace function public.start_agent_call()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Constants, NOT parameters. See this migration's header: a caller-
  -- supplied model or cap would be trivially changed via PostgREST.
  v_model constant text := 'gpt-realtime-mini';
  v_cap_minutes constant int := 5;
  -- Grace beyond the cap before an unreported call is written off. The
  -- call may genuinely still be running (we cannot stop it); this only
  -- decides when we stop considering the session open for accounting.
  v_abandon_grace constant interval := interval '10 minutes';

  v_rate int;
  v_cost int;
  v_balance int;
  v_session_id uuid;
  v_spent boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Lazy sweep, so an abandoned session cannot block this user forever
  -- through the one-active-call unique index. Deliberately lazy rather
  -- than scheduled: it needs no pg_cron and it runs exactly when it
  -- matters. coins_refunded stays 0 — an unreported call forfeits, which
  -- is the correct direction since the cost was genuinely incurred.
  update public.agent_call_sessions
     set status = 'abandoned',
         ended_at = started_at + (cap_minutes * interval '1 minute')
   where user_id = auth.uid()
     and status = 'active'
     and started_at < now() - v_abandon_grace;

  if exists (
    select 1 from public.agent_call_sessions
     where user_id = auth.uid() and status = 'active'
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'call_already_active');
  end if;

  -- Authoritative price. No fallback constant: charging a number nobody
  -- configured is worse than refusing, same call LessonView makes when it
  -- hides a paid card whose price it cannot read.
  select coin_cost into v_rate from public.pricing_units where key = 'voice_call_minute';
  if v_rate is null or v_rate <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'price_unavailable');
  end if;

  v_cost := v_rate * v_cap_minutes;

  select balance into v_balance from public.wallets where user_id = auth.uid();
  if coalesce(v_balance, 0) < v_cost then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'insufficient_balance',
      'balance', coalesce(v_balance, 0),
      'required', v_cost
    );
  end if;

  insert into public.agent_call_sessions (
    user_id, model, rate_per_minute, cap_minutes, coins_authorized
  )
  values (auth.uid(), v_model, v_rate, v_cap_minutes, v_cost)
  returning id into v_session_id;

  -- Reuses spend_coins (007b) rather than touching wallets directly, so
  -- the coin_transactions trail and the balance check stay in one place.
  -- If it refuses, the exception below rolls the session row back with
  -- it — one transaction, no orphan row, no route-level cleanup dance
  -- like pronunciation/evaluate has to do.
  select public.spend_coins(auth.uid(), v_cost, 'voice_call', 'agent_call_sessions', v_session_id)
    into v_spent;

  if not v_spent then
    raise exception 'Failed to charge for voice call' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'sessionId', v_session_id,
    'model', v_model,
    'capMinutes', v_cap_minutes,
    'ratePerMinute', v_rate,
    'coinsCharged', v_cost,
    'balanceAfter', v_balance - v_cost
  );
end;
$$;

revoke execute on function public.start_agent_call() from public, anon;
grant execute on function public.start_agent_call() to authenticated;

-- ============================================================
-- E) CALL ID — audit correlation, recorded after the handshake
-- ============================================================

create or replace function public.set_agent_call_id(p_session_id uuid, p_call_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Ownership + still-open are both required: a closed session's audit
  -- record is finished and must not be edited afterwards.
  update public.agent_call_sessions
     set openai_call_id = p_call_id
   where id = p_session_id
     and user_id = auth.uid()
     and status = 'active';

  if not found then
    raise exception 'No active call session for this user' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.set_agent_call_id(uuid, text) from public, anon;
grant execute on function public.set_agent_call_id(uuid, text) to authenticated;

-- ============================================================
-- F) END — close the session and refund unused whole minutes
-- ============================================================

/**
 * Closes the caller's call and refunds whole unused minutes.
 *
 * DURATION IS MEASURED HERE, from started_at (stamped when the block was
 * charged) to now(). No client-supplied duration is accepted, because a
 * client would only ever under-report to inflate its refund. The one
 * thing a client controls is WHEN it calls this — and calling it late
 * only costs itself, while never calling it forfeits the block.
 *
 * A call that never produced an openai_call_id and ended within
 * CONNECT_GRACE never connected at all (failed handshake / refused
 * microphone), so it is refunded in full and marked 'failed' rather than
 * charging a minute for something that never happened.
 */
create or replace function public.end_agent_call(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connect_grace constant interval := interval '30 seconds';
  v_session public.agent_call_sessions%rowtype;
  v_elapsed interval;
  v_used_minutes int;
  v_refund int;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Locked: two concurrent end-reports for the same session must not
  -- both compute a refund off the same open row.
  select * into v_session
    from public.agent_call_sessions
   where id = p_session_id and user_id = auth.uid() and status = 'active'
   for update;

  if not found then
    raise exception 'No active call session for this user' using errcode = '42501';
  end if;

  v_elapsed := now() - v_session.started_at;

  if v_session.openai_call_id is null and v_elapsed < v_connect_grace then
    v_used_minutes := 0;
    v_status := 'failed';
  else
    -- Any connected call bills at least one minute, and never more than
    -- the cap it paid for. ceil(): a partial minute is a used minute.
    v_used_minutes := least(
      v_session.cap_minutes,
      greatest(1, ceil(extract(epoch from v_elapsed) / 60.0)::int)
    );
    v_status := 'completed';
  end if;

  v_refund := (v_session.cap_minutes - v_used_minutes) * v_session.rate_per_minute;

  update public.agent_call_sessions
     set ended_at = now(),
         status = v_status,
         coins_refunded = v_refund
   where id = v_session.id;

  -- The refund is written INLINE, from a figure this function computed
  -- itself. There is deliberately no callable refund_coins(amount) — see
  -- this migration's header for why that would be a minting hole.
  if v_refund > 0 then
    update public.wallets
       set balance = balance + v_refund
     where user_id = auth.uid();

    insert into public.coin_transactions (user_id, amount, type, reason, ref_table, ref_id)
    values (auth.uid(), v_refund, 'refund', 'voice_call_unused_minutes',
            'agent_call_sessions', v_session.id);
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'status', v_status,
    'durationSeconds', floor(extract(epoch from v_elapsed))::int,
    'usedMinutes', v_used_minutes,
    'coinsCharged', v_session.coins_authorized,
    'coinsRefunded', v_refund
  );
end;
$$;

revoke execute on function public.end_agent_call(uuid) from public, anon;
grant execute on function public.end_agent_call(uuid) to authenticated;

-- ============================================================
-- G) SELF-CHECK — this migration proves its own effect, as 023/029/031 do
-- ============================================================

do $$
declare
  v_policies int;
  v_fn int;
  v_trigger int;
  v_index int;
  v_price int;
  v_source_default text;
  v_old_signature int;
begin
  -- Exactly one policy, and it must be the read-only one. A write policy
  -- here would let a user close their own session, or open one without
  -- paying.
  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'agent_call_sessions';
  if v_policies <> 1 then
    raise exception 'agent_call_sessions must have exactly 1 (read-only) policy, found %', v_policies;
  end if;

  select count(*) into v_trigger
    from pg_trigger where tgname = 'trg_agent_calls_forbid_client_write' and not tgisinternal;
  if v_trigger <> 1 then
    raise exception 'forbid_client_write trigger missing on agent_call_sessions';
  end if;

  -- The one-active-call guarantee is this index. Without it the whole
  -- concurrency argument in the header is untrue.
  select count(*) into v_index
    from pg_indexes where schemaname = 'public' and indexname = 'uq_agent_calls_one_active';
  if v_index <> 1 then
    raise exception 'uq_agent_calls_one_active partial unique index was not created';
  end if;

  select count(*) into v_fn from pg_proc
   where proname in ('start_agent_call', 'end_agent_call', 'set_agent_call_id');
  if v_fn <> 3 then
    raise exception 'expected 3 voice-call functions, found %', v_fn;
  end if;

  -- The old 2-arg record_agent_turn must be GONE, not merely shadowed —
  -- two overloads would mean two writers to agent_messages.
  select count(*) into v_old_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'record_agent_turn'
     and pg_get_function_identity_arguments(p.oid) = 'text, text';
  if v_old_signature <> 0 then
    raise exception 'the 2-arg record_agent_turn still exists — two writers to agent_messages';
  end if;

  select coin_cost into v_price from public.pricing_units where key = 'voice_call_minute';
  if v_price is null then
    raise exception 'voice_call_minute price row was not seeded';
  end if;

  -- Existing rows must have been backfilled to 'text', otherwise the
  -- whole provenance distinction is meaningless.
  select column_default into v_source_default
    from information_schema.columns
   where table_schema = 'public' and table_name = 'agent_messages' and column_name = 'source';
  if v_source_default is null then
    raise exception 'agent_messages.source was not added with a default';
  end if;

  if exists (select 1 from public.agent_messages where source is null) then
    raise exception 'agent_messages.source has nulls — backfill did not take effect';
  end if;

  raise notice '036 OK: agent_call_sessions created (read-only to owners, one active call enforced), 3 definer functions installed, voice_call_minute seeded at % coins/min, agent_messages.source added', v_price;
end $$;
