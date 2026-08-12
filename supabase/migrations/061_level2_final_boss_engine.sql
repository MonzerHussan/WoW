-- ============================================================
-- WOW - World of Work — Migration 061
-- Level 2 Final Boss — the two design gaps flagged in 060, approved by
-- the owner (2026-08-07), now built:
--
--   1. RANDOM 4-6 SCENARIO DRAW: kb_rule_scopes.scenario_count (a fixed
--      single int) is replaced with scenario_count_min/
--      scenario_count_max. Every existing rule_scope backfills to
--      min=max=1 (identical behavior to before — Resource Optimizer/
--      EVM Simulator/Burndown Reader are unaffected). Final Boss gets
--      min=4, max=6. kb_start_attempt() now rolls a random count in
--      that range before drawing scenarios — genuinely reusable for any
--      future rule_scope, not hardcoded to Final Boss.
--
--   2. SPEED BONUS: content score dominates, speed only breaks ties
--      between similar-quality answers — never rewards fast-wrong over
--      slow-right. budget = 90s × scenarios drawn (proposed, adjustable
--      via kb_rule_scopes.speed_budget_seconds_per_scenario, not a
--      hardcoded constant). elapsed time is computed server-side from
--      kb_game_attempts.created_at/completed_at (both already existed
--      in 046) — never trusted from the client.
--      speed_bonus = greatest(0, least(10, 10 * (1 - elapsed/budget)))
--      final_score = least(100, content_score + speed_bonus)
--
-- NOT built here: Project Story generation on Final Boss success (the
-- original brief's own §3 "عند النجاح: يُطلق توليد Project Story") —
-- a separate, later piece, not part of what was approved this round.
-- ============================================================

-- ------------------------------------------------------------
-- A. kb_rule_scopes: scenario_count -> scenario_count_min/max
-- Guarded for re-run: this section already fully applied once in
-- production (only the self-check at the bottom had the NULL-
-- comparison bug, not the DDL above it) — scenario_count is already
-- gone and the range constraint already exists, so the backfill UPDATE
-- and the ADD CONSTRAINT below are wrapped to be safe whether this is
-- the first run or a repeat.
-- ------------------------------------------------------------
alter table public.kb_rule_scopes add column if not exists scenario_count_min int;
alter table public.kb_rule_scopes add column if not exists scenario_count_max int;
alter table public.kb_rule_scopes add column if not exists speed_budget_seconds_per_scenario int not null default 90;

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'kb_rule_scopes' and column_name = 'scenario_count'
  ) then
    update public.kb_rule_scopes
       set scenario_count_min = coalesce(scenario_count_min, scenario_count),
           scenario_count_max = coalesce(scenario_count_max, scenario_count)
     where scenario_count_min is null or scenario_count_max is null;
  end if;
end $$;

update public.kb_rule_scopes
   set scenario_count_min = coalesce(scenario_count_min, 1),
       scenario_count_max = coalesce(scenario_count_max, 1)
 where scenario_count_min is null or scenario_count_max is null;

alter table public.kb_rule_scopes alter column scenario_count_min set not null;
alter table public.kb_rule_scopes alter column scenario_count_max set not null;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
     where constraint_schema = 'public' and table_name = 'kb_rule_scopes'
       and constraint_name = 'kb_rule_scopes_count_range_check'
  ) then
    alter table public.kb_rule_scopes add constraint kb_rule_scopes_count_range_check
      check (scenario_count_min >= 1 and scenario_count_max >= scenario_count_min);
  end if;
end $$;

alter table public.kb_rule_scopes drop column if exists scenario_count;

update public.kb_rule_scopes
   set scenario_count_min = 4, scenario_count_max = 6
 where rule_scope = 'level2_final_boss';

-- ------------------------------------------------------------
-- B. kb_start_attempt — rolls a random count in [min, max] before
-- drawing scenarios. Identical effective behavior for every existing
-- rule_scope (min=max=1 -> always draws exactly 1).
-- ------------------------------------------------------------
create or replace function public.kb_start_attempt(p_rule_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scope record;
  v_cost int;
  v_balance int;
  v_spent boolean;
  v_pick_count int;
  v_scenario_ids uuid[];
  v_attempt_id uuid;
  v_scenarios jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_scope from public.kb_rule_scopes where rule_scope = p_rule_scope;
  if v_scope is null then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_rule_scope');
  end if;

  select coin_cost into v_cost from public.pricing_units where key = 'game_' || p_rule_scope;
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

  v_pick_count := v_scope.scenario_count_min
    + floor(random() * (v_scope.scenario_count_max - v_scope.scenario_count_min + 1))::int;

  select array_agg(id) into v_scenario_ids from (
    select id from public.kb_scenarios
     where rule_scope = p_rule_scope and is_active
     order by random()
     limit v_pick_count
  ) s;

  if v_scenario_ids is null or array_length(v_scenario_ids, 1) < v_pick_count then
    return jsonb_build_object('allowed', false, 'reason', 'not_enough_scenarios');
  end if;

  insert into public.kb_game_attempts (user_id, rule_scope, scenario_ids)
  values (v_uid, p_rule_scope, v_scenario_ids)
  returning id into v_attempt_id;

  select public.spend_coins(v_uid, v_cost, 'game_' || p_rule_scope, 'kb_game_attempts', v_attempt_id)
    into v_spent;

  if not v_spent then
    raise exception 'Failed to charge for attempt' using errcode = '42501';
  end if;

  select jsonb_agg(jsonb_build_object(
           'id', s.id, 'scenarioKey', s.scenario_key,
           'titleAr', s.title_ar, 'titleEn', s.title_en, 'body', s.body
         ))
    into v_scenarios
    from public.kb_scenarios s
   where s.id = any(v_scenario_ids);

  return jsonb_build_object(
    'allowed', true,
    'attemptId', v_attempt_id,
    'scenarios', v_scenarios,
    'coinsCharged', v_cost,
    'balanceAfter', v_balance - v_cost
  );
end;
$$;

-- ------------------------------------------------------------
-- C. Final Boss pricing + badge
-- ------------------------------------------------------------
insert into public.pricing_units (key, coin_cost, label_ar, label_en) values
  ('game_level2_final_boss', 15, 'Final Boss — محاكي الأزمات', 'Final Boss — Crisis Simulator')
on conflict (key) do nothing;

insert into public.badges (name, description, icon)
select v.name, v.description, v.icon
from (values
  ('Final Boss', 'اجتزت محاكي الأزمات — اتخذت قرارات سليمة تحت ضغط حقيقي عبر عدة سيناريوهات.', '🏆')
) as v(name, description, icon)
where not exists (select 1 from public.badges b where b.name = v.name);

-- ------------------------------------------------------------
-- D. complete_final_boss_attempt
-- p_answers: [{scenarioKey, choiceKey}, ...] — one per DRAWN scenario
-- (4-6, not fixed). Elapsed time computed server-side from
-- created_at/now(), never trusted from the client.
-- ------------------------------------------------------------
create or replace function public.complete_final_boss_attempt(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt record;
  v_scope record;
  v_decisions jsonb;
  v_a jsonb;
  v_content_result jsonb;
  v_content_score numeric;
  v_elapsed_seconds numeric;
  v_budget_seconds numeric;
  v_speed_bonus numeric;
  v_final_score numeric;
  v_passed boolean;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_attempt from public.kb_game_attempts
   where id = p_attempt_id and user_id = v_uid and rule_scope = 'level2_final_boss';
  if v_attempt is null then
    return jsonb_build_object('completed', false, 'reason', 'attempt_not_found');
  end if;
  if v_attempt.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true, 'score', v_attempt.score, 'passed', v_attempt.passed);
  end if;

  select * into v_scope from public.kb_rule_scopes where rule_scope = 'level2_final_boss';

  v_decisions := '[]'::jsonb;
  for v_a in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
      'scenarioKey', v_a ->> 'scenarioKey',
      'decisionKey', v_a ->> 'choiceKey'
    ));
  end loop;

  v_content_result := public.kb_score_decisions('level2_final_boss', v_decisions);
  v_content_score := (v_content_result ->> 'averageScore')::numeric;

  v_elapsed_seconds := greatest(0, extract(epoch from (now() - v_attempt.created_at)));
  v_budget_seconds := array_length(v_attempt.scenario_ids, 1) * v_scope.speed_budget_seconds_per_scenario;
  v_speed_bonus := greatest(0, least(10, 10 * (1 - v_elapsed_seconds / nullif(v_budget_seconds, 0))));

  v_final_score := least(100, round(v_content_score + v_speed_bonus, 2));
  v_passed := v_final_score >= v_scope.passing_score;

  v_result := jsonb_build_object(
    'contentScore', v_content_score,
    'speedBonus', round(v_speed_bonus, 2),
    'elapsedSeconds', round(v_elapsed_seconds),
    'budgetSeconds', v_budget_seconds,
    'content', v_content_result
  );

  update public.kb_game_attempts
     set status = 'completed', score = v_final_score, passed = v_passed, result = v_result, completed_at = now()
   where id = p_attempt_id;

  if v_passed then
    insert into public.user_badges (user_id, badge_id)
    select v_uid, b.id from public.badges b where b.name = 'Final Boss'
    on conflict (user_id, badge_id) do nothing;
  end if;

  return jsonb_build_object('completed', true, 'already_completed', false, 'score', v_final_score, 'passed', v_passed, 'result', v_result);
end;
$$;

revoke execute on function public.complete_final_boss_attempt(uuid, jsonb) from public, anon;
grant execute on function public.complete_final_boss_attempt(uuid, jsonb) to authenticated;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_min int;
  v_max int;
  v_badge int;
  v_pricing int;
  v_col_exists int;
begin
  select scenario_count_min, scenario_count_max into v_min, v_max
    from public.kb_rule_scopes where rule_scope = 'level2_final_boss';
  -- `<>` against a NULL (row missing entirely, e.g. because 060 hasn't
  -- run yet) silently evaluates to NULL, not TRUE — caught live: this
  -- exact bug let 061 report success once already while the Final Boss
  -- row didn't exist at all. `is distinct from` treats NULL as a real,
  -- reportable difference.
  if v_min is distinct from 4 or v_max is distinct from 6 then
    raise exception '061 failed: expected Final Boss min=4 max=6, found min=% max=% (row missing entirely if both are NULL — run 060 first)', v_min, v_max;
  end if;

  select count(*) into v_col_exists
    from information_schema.columns
   where table_schema = 'public' and table_name = 'kb_rule_scopes' and column_name = 'scenario_count';
  if v_col_exists > 0 then
    raise exception '061 failed: old scenario_count column still present';
  end if;

  select count(*) into v_badge from public.badges where name = 'Final Boss';
  if v_badge <> 1 then
    raise exception '061 failed: Final Boss badge not seeded';
  end if;

  select count(*) into v_pricing from public.pricing_units where key = 'game_level2_final_boss';
  if v_pricing <> 1 then
    raise exception '061 failed: Final Boss pricing_units row not seeded';
  end if;

  raise notice '061 OK: scenario_count_min/max in place (Final Boss 4-6, existing games unaffected at 1/1), complete_final_boss_attempt installed';
end $$;
