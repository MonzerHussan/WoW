-- 042_games_generic_unlock_reversal.sql
--
-- DELIBERATE POLICY REVERSAL — NOT A BUG FIX, NOT A REGRESSION.
--
-- 038 (level1_games) built, and 038-040 repeatedly tested, a hard gate on
-- generic-variant games: play_game() refused to start a generic-variant
-- attempt ('reason': 'quiz_not_passed') unless the caller had a passed
-- attempt on the PMP Level 1 final quiz (qa.passed = true, q.pmp_level =
-- 1, q.lesson_id is null). That gate was working exactly as designed.
--
-- The owner (Monzer) explicitly changed the product decision (session of
-- 2026-08-06): generic-variant games now open with NO quiz-pass condition
-- at all. This migration's only functional change is deleting that one
-- `if not coalesce(v_quiz_passed, false) then return ... 'quiz_not_passed'
-- end if;` block from play_game()'s generic branch. Everything else
-- (ownership check for the project variant, scenario resolution, pricing,
-- wallet balance/spend, game_attempts insert) is copied byte-for-byte
-- from 038 — this is a `create or replace function`, no schema change.
--
-- If a future session finds generic games open with no quiz requirement
-- and assumes 038-040's gate silently broke: it did not break. It was
-- removed on purpose, here, by request. See ROADMAP.md and
-- DOMAIN_CONTRACTS.md for the same note. Do not "restore" this gate
-- without a fresh, explicit owner decision.

create or replace function public.play_game(
  p_game_key text,
  p_variant text,
  p_project_id uuid default null,
  p_scenario_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pricing_key text;
  v_cost int;
  v_balance int;
  v_attempt_id uuid;
  v_spent boolean;
  v_resolved_scenario uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_game_key not in ('charter_builder', 'stakeholder_detective', 'project_vs_operations_race',
                         'assumptions_constraints', 'strategy_alignment') then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_game');
  end if;
  if p_variant not in ('project', 'generic') then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_variant');
  end if;

  if p_variant = 'project' then
    if p_project_id is null or not exists (
      select 1 from public.projects where id = p_project_id and owner_id = v_uid
    ) then
      return jsonb_build_object('allowed', false, 'reason', 'project_not_owned');
    end if;
  else
    -- Owner-reversed here (042): generic variant no longer requires a
    -- passed Level 1 final quiz. 038's v_quiz_passed check deliberately
    -- deleted, not merely disabled — see the file header above.
    if p_game_key <> 'project_vs_operations_race' then
      if p_scenario_id is not null then
        select id into v_resolved_scenario
          from public.game_generic_scenarios
         where id = p_scenario_id and game_key = p_game_key and is_active;
        if v_resolved_scenario is null then
          return jsonb_build_object('allowed', false, 'reason', 'scenario_not_found');
        end if;
      else
        select id into v_resolved_scenario
          from public.game_generic_scenarios
         where game_key = p_game_key and is_active
         order by created_at
         limit 1;
        if v_resolved_scenario is null then
          return jsonb_build_object('allowed', false, 'reason', 'no_scenario_available');
        end if;
      end if;
    end if;
  end if;

  v_pricing_key := case p_game_key
    when 'project_vs_operations_race' then 'game_project_vs_ops_' || p_variant
    else 'game_' || p_game_key || '_' || p_variant
  end;

  select coin_cost into v_cost from public.pricing_units where key = v_pricing_key;
  if v_cost is null or v_cost <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'price_unavailable');
  end if;

  select balance into v_balance from public.wallets where user_id = v_uid;
  if coalesce(v_balance, 0) < v_cost then
    return jsonb_build_object(
      'allowed', false, 'reason', 'insufficient_balance',
      'balance', coalesce(v_balance, 0), 'required', v_cost
    );
  end if;

  insert into public.game_attempts (user_id, game_key, variant, project_id, scenario_id)
  values (v_uid, p_game_key, p_variant, p_project_id, v_resolved_scenario)
  returning id into v_attempt_id;

  select public.spend_coins(v_uid, v_cost, v_pricing_key, 'game_attempts', v_attempt_id)
    into v_spent;

  if not v_spent then
    raise exception 'Failed to charge for game attempt' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'attemptId', v_attempt_id,
    'scenarioId', v_resolved_scenario,
    'coinsCharged', v_cost,
    'balanceAfter', v_balance - v_cost
  );
end;
$$;

revoke execute on function public.play_game(text, text, uuid, uuid) from public, anon;
grant execute on function public.play_game(text, text, uuid, uuid) to authenticated;

do $$
declare
  v_src text;
begin
  select prosrc into v_src from pg_proc where proname = 'play_game';
  if v_src is null then
    raise exception '042 self-check failed: play_game() not found';
  end if;
  if v_src ilike '%quiz_not_passed%' then
    raise exception '042 self-check failed: quiz_not_passed still referenced in play_game()';
  end if;
  raise notice '042 OK: play_game() generic variant no longer requires a passed Level 1 final quiz';
end $$;
