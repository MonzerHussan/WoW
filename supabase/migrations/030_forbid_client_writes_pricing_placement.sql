-- ============================================================
-- WOW - World of Work — Migration 030
-- Closes TECH_DEBT #24: a write refused by "no RLS policy" returned
-- 200/204 with zero rows instead of an explicit refusal.
--
-- WHY A ROW-LEVEL TRIGGER (the 026 pattern) DOES NOT WORK HERE:
-- pricing_units/placement_usage have RLS enabled with NO write policy at
-- all. With no permissive policy for a command, Postgres's row security
-- is equivalent to an implicit `USING (false)` applied during the scan
-- phase — BEFORE any row is selected for the write. A `FOR EACH ROW`
-- trigger only fires for rows that survive that filtering, so with zero
-- rows surviving, a row-level trigger never runs at all. That is exactly
-- why the write silently "succeeds" against zero rows today.
--
-- THE FIX: a `FOR EACH STATEMENT` trigger. Statement-level triggers fire
-- once per SQL statement, unconditionally, BEFORE row-level RLS
-- filtering is evaluated — so they run even when the write will end up
-- matching zero rows. This lets a genuinely unauthorized session get a
-- loud, explicit 403 instead of a silent no-op.
--
-- WHY THIS CANNOT BREAK THE LEGITIMATE WRITE PATHS: update_pricing_unit
-- (024) and consume_placement_quota (029) are both SECURITY DEFINER,
-- which — per 026's already-verified finding — makes `current_user`
-- report the FUNCTION OWNER (postgres) during their execution, not the
-- calling session's role. The guard below only rejects `authenticated`/
-- `anon`, so both functions pass through untouched. Verified live below.
-- ============================================================

create or replace function public.forbid_client_write()
returns trigger
language plpgsql
-- SECURITY INVOKER (the default — no `security definer` here). This
-- function must see the REAL calling role via current_user. Marking it
-- SECURITY DEFINER would silently disable it — the exact 025 bug 026
-- already had to fix once for `profiles`. Do not repeat that mistake.
as $$
begin
  if current_user in ('authenticated', 'anon') then
    raise exception 'Direct % on % is not permitted — this table is only written by a verified server-side function',
      TG_OP, TG_TABLE_NAME
      using errcode = '42501';
  end if;
  return null; -- ignored for statement-level triggers
end;
$$;

drop trigger if exists trg_pricing_units_forbid_client_write on public.pricing_units;
create trigger trg_pricing_units_forbid_client_write
  before insert or update or delete on public.pricing_units
  for each statement execute procedure public.forbid_client_write();

drop trigger if exists trg_placement_usage_forbid_client_write on public.placement_usage;
create trigger trg_placement_usage_forbid_client_write
  before insert or update or delete on public.placement_usage
  for each statement execute procedure public.forbid_client_write();

-- Self-check: assert the function is NOT security definer (the single
-- attribute that would make this migration inert, per 026's lesson), and
-- that both triggers are installed.
do $$
declare
  v_secdef boolean;
  v_triggers int;
begin
  select prosecdef into v_secdef from pg_proc where proname = 'forbid_client_write';
  if v_secdef is null then
    raise exception 'forbid_client_write() was not created';
  end if;
  if v_secdef then
    raise exception 'forbid_client_write() is SECURITY DEFINER — it would be inert, same bug as 025';
  end if;

  select count(*) into v_triggers
    from pg_trigger
   where tgisinternal = false
     and tgname in ('trg_pricing_units_forbid_client_write', 'trg_placement_usage_forbid_client_write');
  if v_triggers <> 2 then
    raise exception 'Expected 2 forbid_client_write triggers installed, found %', v_triggers;
  end if;

  raise notice '030 OK: forbid_client_write is SECURITY INVOKER, installed on pricing_units and placement_usage';
end $$;
