-- ============================================================
-- WOW - World of Work — Migration 046
-- Level 2 (Project Planning & Control): the reusable Knowledge-Base
-- scoring engine + scenario engine (ARCHITECTURE_levels2-4_strategy.md
-- §3, DOMAIN_CONTRACTS.md), and the two approved games — Resource
-- Optimizer and EVM Simulator (passing threshold 70%, confirmed by
-- Monzer 2026-08-06). NO LLM anywhere in this migration, by design.
--
-- Deliberately PARALLEL to 038's game_attempts/game_generic_scenarios
-- rather than extending them — those are Level-1-specific (project vs
-- generic variant tied to project_charters, a fixed 5-game_key CHECK).
-- Level 2+ games have a structurally different shape (decision-point
-- scoring against an authored rule table, not payload-shape validation)
-- and no "project variant" concept at all. Reusable pieces, generic
-- across ANY future rule_scope (level 3/4 included):
--
--   kb_rule_scopes    — registry of KB-scored evaluations (one row per
--                        game/assessment): passing score + how many
--                        scenarios an attempt draws. Adding a future
--                        game = an INSERT here, not a migration.
--   kb_scenarios      — the scenario bank, keyed by (rule_scope,
--                        scenario_key). Content lives in `body` jsonb —
--                        shape is game-specific, this table doesn't
--                        constrain it.
--   kb_scoring_rules  — "rule_scope × scenario_key × decision_key =
--                        score + bilingual feedback". RLS enabled, ZERO
--                        policies — same isolation as quiz_answer_keys
--                        (028): only SECURITY DEFINER functions can
--                        read it, and only after the caller has already
--                        paid for a kb_game_attempts row (same
--                        brute-force deterrent play_game()/
--                        complete_game_attempt() already rely on: a
--                        guess costs coins).
--   kb_game_attempts  — one row per paid attempt, mirrors game_attempts'
--                        own owner-reads-only + forbid_client_write
--                        shape.
--
-- Random N-of-M scenario selection lives in kb_start_attempt() below,
-- driven by kb_rule_scopes.scenario_count — genuinely reusable (a
-- future Final Boss row with scenario_count=4..6 needs no new code
-- here), unlike 038's play_game() which deterministically picks the
-- oldest active scenario.
--
-- Resource Optimizer and EVM Simulator are the two concrete games this
-- round. Their COMPLETION logic is necessarily game-specific (EVM's
-- CPI/SPI check is arithmetic, not a rule-table lookup) but both share
-- the same kb_score_decisions() helper for their decision-point half —
-- see Part F.
-- ============================================================

-- ------------------------------------------------------------
-- A. kb_rule_scopes — registry (data, not schema)
-- ------------------------------------------------------------
create table if not exists public.kb_rule_scopes (
  rule_scope text primary key,
  label_ar text not null,
  label_en text not null,
  passing_score numeric not null check (passing_score between 0 and 100),
  scenario_count int not null default 1 check (scenario_count >= 1),
  created_at timestamptz not null default now()
);

alter table public.kb_rule_scopes enable row level security;

drop policy if exists "KB rule scopes: signed-in read" on public.kb_rule_scopes;
create policy "KB rule scopes: signed-in read" on public.kb_rule_scopes
  for select using (auth.uid() is not null);

insert into public.kb_rule_scopes (rule_scope, label_ar, label_en, passing_score, scenario_count) values
  ('level2_resource_optimizer', 'محسّن الموارد', 'Resource Optimizer', 70, 1),
  ('level2_evm_simulator', 'محاكي القيمة المكتسبة', 'EVM Simulator', 70, 1)
on conflict (rule_scope) do nothing;

-- ------------------------------------------------------------
-- B. kb_scenarios — reusable scenario bank
-- ------------------------------------------------------------
create table if not exists public.kb_scenarios (
  id uuid primary key default uuid_generate_v4(),
  rule_scope text not null references public.kb_rule_scopes(rule_scope),
  scenario_key text not null,
  title_ar text not null,
  title_en text not null,
  body jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (rule_scope, scenario_key)
);

create index if not exists idx_kb_scenarios_scope on public.kb_scenarios(rule_scope, is_active);

alter table public.kb_scenarios enable row level security;

drop policy if exists "KB scenarios: signed-in read" on public.kb_scenarios;
create policy "KB scenarios: signed-in read" on public.kb_scenarios
  for select using (auth.uid() is not null);

-- ------------------------------------------------------------
-- C. kb_scoring_rules — the answer key. RLS enabled, ZERO policies.
-- ------------------------------------------------------------
create table if not exists public.kb_scoring_rules (
  id uuid primary key default uuid_generate_v4(),
  rule_scope text not null references public.kb_rule_scopes(rule_scope),
  scenario_key text not null,
  decision_key text not null,
  score numeric not null check (score >= 0 and score <= 100),
  feedback_ar text not null,
  feedback_en text not null,
  created_at timestamptz not null default now(),
  unique (rule_scope, scenario_key, decision_key)
);

alter table public.kb_scoring_rules enable row level security;
-- DELIBERATELY NO POLICIES — see file header. Every client read/write
-- returns zero rows / is refused. Only the SECURITY DEFINER functions
-- below (owned by the table owner) can see it.

-- ------------------------------------------------------------
-- D. kb_game_attempts — one row per paid attempt
-- ------------------------------------------------------------
create table if not exists public.kb_game_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rule_scope text not null references public.kb_rule_scopes(rule_scope),
  scenario_ids uuid[] not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  score numeric,
  passed boolean,
  result jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_kb_game_attempts_user on public.kb_game_attempts(user_id, created_at desc);

drop trigger if exists trg_kb_game_attempts_updated_at on public.kb_game_attempts;
create trigger trg_kb_game_attempts_updated_at before update on public.kb_game_attempts
  for each row execute procedure public.set_updated_at();

alter table public.kb_game_attempts enable row level security;

drop policy if exists "KB game attempts: owner reads" on public.kb_game_attempts;
create policy "KB game attempts: owner reads" on public.kb_game_attempts
  for select using (auth.uid() = user_id);

-- NO insert/update/delete policy — same shape as game_attempts (038).
-- kb_start_attempt()/kb_complete_*_attempt() are the only doors in,
-- both SECURITY DEFINER, both bypass RLS as the table owner on purpose.
drop trigger if exists trg_kb_game_attempts_forbid_client_insert on public.kb_game_attempts;
create trigger trg_kb_game_attempts_forbid_client_insert
  before insert on public.kb_game_attempts
  for each statement execute procedure public.forbid_client_write();

-- ------------------------------------------------------------
-- E. kb_start_attempt — generic starter for ANY rule_scope
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

  -- Random N-of-M pick, generic across any future rule_scope — the
  -- reusable half of the "scenario engine" (see file header). Both of
  -- today's games have scenario_count=1, so this degrades to "pick one
  -- random active scenario", same effective behavior 038's generic
  -- variant gets via a different (deterministic) method.
  select array_agg(id) into v_scenario_ids from (
    select id from public.kb_scenarios
     where rule_scope = p_rule_scope and is_active
     order by random()
     limit v_scope.scenario_count
  ) s;

  if v_scenario_ids is null or array_length(v_scenario_ids, 1) < v_scope.scenario_count then
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

  -- Scenario CONTENT is not secret (only the scoring is) — safe to
  -- return title/body directly, same treatment game_generic_scenarios
  -- gets.
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

revoke execute on function public.kb_start_attempt(text) from public, anon;
grant execute on function public.kb_start_attempt(text) to authenticated;

-- ------------------------------------------------------------
-- F. kb_score_decisions — shared decision-point scoring helper.
-- NOT its own RPC (no grant to authenticated) — only ever called from
-- inside another SECURITY DEFINER function in this same migration, so
-- a client can never invoke it directly to probe kb_scoring_rules.
-- p_decisions shape: [{"scenarioKey": text, "decisionKey": text}, ...]
-- ------------------------------------------------------------
create or replace function public.kb_score_decisions(p_rule_scope text, p_decisions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_decision jsonb;
  v_rule record;
  v_total numeric := 0;
  v_count int := 0;
  v_items jsonb := '[]'::jsonb;
begin
  for v_decision in select * from jsonb_array_elements(coalesce(p_decisions, '[]'::jsonb))
  loop
    v_count := v_count + 1;
    select * into v_rule from public.kb_scoring_rules
     where rule_scope = p_rule_scope
       and scenario_key = (v_decision ->> 'scenarioKey')
       and decision_key = (v_decision ->> 'decisionKey');

    if v_rule is null then
      -- An unrecognized scenario/decision key combination scores zero —
      -- never an error. A malformed or guessed key must not crash
      -- grading (same principle submit_quiz_attempt (028) already uses
      -- for a missing/malformed answer).
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'scenarioKey', v_decision ->> 'scenarioKey',
        'decisionKey', v_decision ->> 'decisionKey',
        'score', 0, 'feedbackAr', null, 'feedbackEn', null
      ));
    else
      v_total := v_total + v_rule.score;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'scenarioKey', v_rule.scenario_key,
        'decisionKey', v_rule.decision_key,
        'score', v_rule.score, 'feedbackAr', v_rule.feedback_ar, 'feedbackEn', v_rule.feedback_en
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'averageScore', case when v_count = 0 then 0 else round(v_total / v_count, 2) end,
    'items', v_items
  );
end;
$$;

revoke execute on function public.kb_score_decisions(text, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------
-- G. complete_resource_optimizer_attempt
-- p_assignments shape: [{"taskKey": text, "choiceKey": text}, ...]
-- ------------------------------------------------------------
create or replace function public.complete_resource_optimizer_attempt(p_attempt_id uuid, p_assignments jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt record;
  v_scenario record;
  v_scope record;
  v_decisions jsonb;
  v_a jsonb;
  v_result jsonb;
  v_score numeric;
  v_passed boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_attempt from public.kb_game_attempts
   where id = p_attempt_id and user_id = v_uid and rule_scope = 'level2_resource_optimizer';
  if v_attempt is null then
    return jsonb_build_object('completed', false, 'reason', 'attempt_not_found');
  end if;
  if v_attempt.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true, 'score', v_attempt.score, 'passed', v_attempt.passed);
  end if;

  select * into v_scenario from public.kb_scenarios where id = v_attempt.scenario_ids[1];
  select * into v_scope from public.kb_rule_scopes where rule_scope = 'level2_resource_optimizer';

  -- Build the composite scenarioKey ("<scenario_key>:<taskKey>") per
  -- task from the client's raw taskKey — the caller never needs to know
  -- the composite-key convention itself.
  v_decisions := '[]'::jsonb;
  for v_a in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
      'scenarioKey', v_scenario.scenario_key || ':' || (v_a ->> 'taskKey'),
      'decisionKey', v_a ->> 'choiceKey'
    ));
  end loop;

  v_result := public.kb_score_decisions('level2_resource_optimizer', v_decisions);
  v_score := (v_result ->> 'averageScore')::numeric;
  v_passed := v_score >= v_scope.passing_score;

  update public.kb_game_attempts
     set status = 'completed', score = v_score, passed = v_passed, result = v_result, completed_at = now()
   where id = p_attempt_id;

  if v_passed then
    insert into public.user_badges (user_id, badge_id)
    select v_uid, b.id from public.badges b where b.name = 'Resource Balancer'
    on conflict (user_id, badge_id) do nothing;
  end if;

  return jsonb_build_object('completed', true, 'already_completed', false, 'score', v_score, 'passed', v_passed, 'result', v_result);
end;
$$;

revoke execute on function public.complete_resource_optimizer_attempt(uuid, jsonb) from public, anon;
grant execute on function public.complete_resource_optimizer_attempt(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- H. complete_evm_simulator_attempt
-- CPI/SPI are the learner's OWN computed answers, checked against the
-- real PV/EV/AC from kb_scenarios.body — never trusted as "the given
-- numbers", exactly like submit_quiz_attempt (028) never trusts a
-- client-submitted "correct" flag. Tolerance is a fixed ±0.02 — CPI/SPI
-- are ratios (e.g. 0.89), not currency, so an absolute band is
-- appropriate; revisit if a future scenario's numbers make that band
-- too generous or too strict.
-- ------------------------------------------------------------
create or replace function public.complete_evm_simulator_attempt(
  p_attempt_id uuid, p_cpi numeric, p_spi numeric, p_response_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt record;
  v_scenario record;
  v_scope record;
  v_pv numeric;
  v_ev numeric;
  v_ac numeric;
  v_real_cpi numeric;
  v_real_spi numeric;
  v_cpi_score numeric;
  v_spi_score numeric;
  v_response_result jsonb;
  v_response_score numeric;
  v_score numeric;
  v_passed boolean;
  v_result jsonb;
  v_tolerance constant numeric := 0.02;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_attempt from public.kb_game_attempts
   where id = p_attempt_id and user_id = v_uid and rule_scope = 'level2_evm_simulator';
  if v_attempt is null then
    return jsonb_build_object('completed', false, 'reason', 'attempt_not_found');
  end if;
  if v_attempt.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true, 'score', v_attempt.score, 'passed', v_attempt.passed);
  end if;

  select * into v_scenario from public.kb_scenarios where id = v_attempt.scenario_ids[1];
  select * into v_scope from public.kb_rule_scopes where rule_scope = 'level2_evm_simulator';

  v_pv := (v_scenario.body ->> 'pv')::numeric;
  v_ev := (v_scenario.body ->> 'ev')::numeric;
  v_ac := (v_scenario.body ->> 'ac')::numeric;
  v_real_cpi := round(v_ev / v_ac, 4);
  v_real_spi := round(v_ev / v_pv, 4);

  v_cpi_score := case when p_cpi is not null and abs(p_cpi - v_real_cpi) <= v_tolerance then 100 else 0 end;
  v_spi_score := case when p_spi is not null and abs(p_spi - v_real_spi) <= v_tolerance then 100 else 0 end;

  v_response_result := public.kb_score_decisions(
    'level2_evm_simulator',
    jsonb_build_array(jsonb_build_object('scenarioKey', v_scenario.scenario_key, 'decisionKey', p_response_key))
  );
  v_response_score := (v_response_result ->> 'averageScore')::numeric;

  v_score := round(v_cpi_score * 0.3 + v_spi_score * 0.3 + v_response_score * 0.4, 2);
  v_passed := v_score >= v_scope.passing_score;

  v_result := jsonb_build_object(
    'cpiCorrect', v_cpi_score = 100, 'spiCorrect', v_spi_score = 100,
    'realCpi', v_real_cpi, 'realSpi', v_real_spi,
    'response', v_response_result
  );

  update public.kb_game_attempts
     set status = 'completed', score = v_score, passed = v_passed, result = v_result, completed_at = now()
   where id = p_attempt_id;

  if v_passed then
    insert into public.user_badges (user_id, badge_id)
    select v_uid, b.id from public.badges b where b.name = 'EVM Analyst'
    on conflict (user_id, badge_id) do nothing;
  end if;

  return jsonb_build_object('completed', true, 'already_completed', false, 'score', v_score, 'passed', v_passed, 'result', v_result);
end;
$$;

revoke execute on function public.complete_evm_simulator_attempt(uuid, numeric, numeric, text) from public, anon;
grant execute on function public.complete_evm_simulator_attempt(uuid, numeric, numeric, text) to authenticated;

-- ------------------------------------------------------------
-- I. Two new badges. `badges.name` has NO unique constraint (schema.sql
-- — confirmed the hard way: `on conflict (name)` here first failed with
-- 42P10, "no unique or exclusion constraint matching the ON CONFLICT
-- specification"). 038 already worked around this exact gap with a
-- `where not exists` insert instead of ON CONFLICT — same fix here.
-- ------------------------------------------------------------
insert into public.badges (name, description, icon)
select v.name, v.description, v.icon
from (values
  ('Resource Balancer', 'خصّصت موارد فريقك بتوازن يحترم قدراتهم وتبعيات المهام.', '⚖️'),
  ('EVM Analyst', 'حسبت CPI وSPI بدقة واخترت الاستجابة الإدارية الصحيحة.', '📊')
) as v(name, description, icon)
where not exists (select 1 from public.badges b where b.name = v.name);

-- ------------------------------------------------------------
-- J. Pricing — PROPOSED values, confirm/adjust via /admin/pricing
-- anytime; matches Level 1 games' own 5-coin baseline plus a modest
-- premium for the richer multi-step content.
-- ------------------------------------------------------------
insert into public.pricing_units (key, coin_cost, label_ar, label_en) values
  ('game_level2_resource_optimizer', 8, 'محسّن الموارد', 'Resource Optimizer'),
  ('game_level2_evm_simulator',      8, 'محاكي القيمة المكتسبة', 'EVM Simulator')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- K. Content — Resource Optimizer scenario + scoring rules
-- Dollar-quoted (tag "json"), not single-quoted — English text below
-- has real apostrophes, same lesson 038 already learned the hard way.
-- ------------------------------------------------------------
insert into public.kb_scenarios (rule_scope, scenario_key, title_ar, title_en, body) values (
  'level2_resource_optimizer',
  'booking_system_v1',
  'إطلاق نظام حجز داخلي',
  'Launching an Internal Booking System',
  $json$
  {
    "context_ar": "فريقك الصغير مكلَّف ببناء نظام حجز داخلي في أسبوع واحد. أحمد (مطوّر) متاح 20 ساعة هذا الأسبوع، وسارة (مختبِرة جودة) متاحة 12 ساعة. وزّع المهام الأربع التالية بما يحترم طاقتهم وترتيب التبعيات.",
    "context_en": "Your small team must build an internal booking system in one week. Ahmed (Developer) has 20 hours available this week; Sara (QA) has 12. Assign the four tasks below in a way that respects their real capacity and the task dependencies.",
    "team": [
      {"key": "ahmed", "name_ar": "أحمد", "name_en": "Ahmed", "role_ar": "مطوّر", "role_en": "Developer", "weekly_hours": 20},
      {"key": "sara", "name_ar": "سارة", "name_en": "Sara", "role_ar": "مختبِرة جودة", "role_en": "QA", "weekly_hours": 12}
    ],
    "tasks": [
      {
        "key": "build_ui", "name_ar": "بناء واجهة الحجز", "name_en": "Build the booking UI",
        "hours": 16, "depends_on_ar": "لا يوجد", "depends_on_en": "None",
        "choices": [
          {"key": "assign_ahmed", "label_ar": "خصّصها لأحمد هذا الأسبوع", "label_en": "Assign it fully to Ahmed this week"},
          {"key": "split_ahmed_sara", "label_ar": "قسّمها بين أحمد وسارة", "label_en": "Split it between Ahmed and Sara"},
          {"key": "delay", "label_ar": "أجّلها للأسبوع القادم بلا سبب واضح", "label_en": "Delay it to next week with no clear reason"}
        ]
      },
      {
        "key": "build_backend", "name_ar": "بناء منطق الحجز الخلفي", "name_en": "Build the backend booking logic",
        "hours": 24, "depends_on_ar": "لا يوجد", "depends_on_en": "None",
        "choices": [
          {"key": "overload_ahmed", "label_ar": "خصّصها بالكامل لأحمد هذا الأسبوع (24 ساعة رغم أن طاقته 20)", "label_en": "Assign all 24 hours to Ahmed this week (his capacity is only 20)"},
          {"key": "split_two_weeks", "label_ar": "قسّمها على أسبوعين لأحمد بما يحترم طاقته الفعلية", "label_en": "Split it across two weeks for Ahmed, respecting his real capacity"},
          {"key": "ignore_limit", "label_ar": "تجاهل حد الساعات وابدأها فورًا بالكامل", "label_en": "Ignore the hour limit and start all of it immediately"}
        ]
      },
      {
        "key": "test_system", "name_ar": "اختبار النظام", "name_en": "Test the system",
        "hours": 10, "depends_on_ar": "بعد اكتمال بناء الواجهة والمنطق الخلفي", "depends_on_en": "After the UI and backend are both done",
        "choices": [
          {"key": "start_immediately", "label_ar": "ابدأ الاختبار فورًا مع بداية المشروع", "label_en": "Start testing immediately at project start"},
          {"key": "wait_then_sara", "label_ar": "انتظر اكتمال المهمتين السابقتين ثم خصّصها لسارة", "label_en": "Wait for the two prior tasks to finish, then assign it to Sara"},
          {"key": "assign_ahmed_instead", "label_ar": "خصّصها لأحمد بدل سارة", "label_en": "Assign it to Ahmed instead of Sara"}
        ]
      },
      {
        "key": "write_docs", "name_ar": "توثيق دليل المستخدم", "name_en": "Write user documentation",
        "hours": 6, "depends_on_ar": "لا يوجد", "depends_on_en": "None",
        "choices": [
          {"key": "assign_sara_slack", "label_ar": "خصّصها لسارة في وقتها المتاح", "label_en": "Assign it to Sara in her available slack time"},
          {"key": "assign_ahmed_busy", "label_ar": "خصّصها لأحمد رغم انشغاله الكامل", "label_en": "Assign it to Ahmed despite his being fully booked"},
          {"key": "skip", "label_ar": "لا تخصّصها لأي أحد الآن", "label_en": "Don't assign it to anyone right now"}
        ]
      }
    ]
  }
  $json$::jsonb
) on conflict (rule_scope, scenario_key) do nothing;

insert into public.kb_scoring_rules (rule_scope, scenario_key, decision_key, score, feedback_ar, feedback_en) values
  ('level2_resource_optimizer', 'booking_system_v1:build_ui', 'assign_ahmed', 100,
    'صحيح — 16 ساعة أقل من طاقة أحمد الأسبوعية (20)، ومهمة تطوير واجهة تناسب دوره تمامًا.',
    'Correct — 16 hours fits within Ahmed''s 20-hour weekly capacity, and UI work matches his role.'),
  ('level2_resource_optimizer', 'booking_system_v1:build_ui', 'split_ahmed_sara', 40,
    'سارة مختبِرة جودة لا مطوّرة — تقسيم مهمة تطوير بينهما يخلط الأدوار بلا داعٍ، رغم أن أحمد وحده كان يكفي.',
    'Sara is QA, not a developer — splitting a development task with her mixes roles unnecessarily; Ahmed alone was already enough.'),
  ('level2_resource_optimizer', 'booking_system_v1:build_ui', 'delay', 10,
    'لا يوجد سبب واضح للتأجيل هنا — المهمة تناسب طاقة أحمد المتاحة الآن تمامًا.',
    'There is no clear reason to delay here — the task fits Ahmed''s available capacity right now.'),

  ('level2_resource_optimizer', 'booking_system_v1:build_backend', 'overload_ahmed', 15,
    'هذا تحميل زائد حقيقي — 24 ساعة تتجاوز طاقة أحمد الأسبوعية (20)، وهذا يفشل التسليم أو يرهقه.',
    'This is real overallocation — 24 hours exceeds Ahmed''s 20-hour weekly capacity, risking a missed deadline or burnout.'),
  ('level2_resource_optimizer', 'booking_system_v1:build_backend', 'split_two_weeks', 100,
    'صحيح — توزيع العمل على أسبوعين يحترم طاقة أحمد الفعلية بدل افتراض طاقة غير موجودة.',
    'Correct — spreading the work across two weeks respects Ahmed''s real capacity instead of assuming capacity that doesn''t exist.'),
  ('level2_resource_optimizer', 'booking_system_v1:build_backend', 'ignore_limit', 0,
    'تجاهل حدود الساعات ليس تخطيطًا للموارد — هذا يضمن التأخر أو جودة رديئة تحت الضغط.',
    'Ignoring hour limits isn''t resource planning — it all but guarantees delay or poor quality under pressure.'),

  ('level2_resource_optimizer', 'booking_system_v1:test_system', 'start_immediately', 0,
    'الاختبار يعتمد على اكتمال الواجهة والمنطق الخلفي أولًا — بدؤه فورًا يكسر ترتيب التبعية بالكامل.',
    'Testing depends on the UI and backend being finished first — starting immediately breaks the dependency entirely.'),
  ('level2_resource_optimizer', 'booking_system_v1:test_system', 'wait_then_sara', 100,
    'صحيح — احترام التبعية، وسارة هي صاحبة دور الاختبار المناسب لهذه المهمة.',
    'Correct — respects the dependency, and Sara is the right role for testing.'),
  ('level2_resource_optimizer', 'booking_system_v1:test_system', 'assign_ahmed_instead', 35,
    'التبعية محترمة هنا، لكن الاختبار دور سارة أساسًا — تكليف أحمد به يهدر تخصصها ويزيد عبأه هو.',
    'The dependency is respected, but testing is Sara''s specialty — assigning it to Ahmed wastes her expertise and adds to his load.'),

  ('level2_resource_optimizer', 'booking_system_v1:write_docs', 'assign_sara_slack', 100,
    'صحيح — التوثيق مهمة منخفضة التخصص تناسب وقت سارة المتاح، وهذا استغلال جيد للطاقة الفائضة.',
    'Correct — documentation is low-specialization work that fits Sara''s available slack time; good use of spare capacity.'),
  ('level2_resource_optimizer', 'booking_system_v1:write_docs', 'assign_ahmed_busy', 20,
    'أحمد محمَّل بالكامل بالفعل — إضافة مهمة أخرى عليه رغم توفر وقت لدى سارة قرار غير متوازن.',
    'Ahmed is already fully booked — adding more to him while Sara has spare time is an unbalanced choice.'),
  ('level2_resource_optimizer', 'booking_system_v1:write_docs', 'skip', 30,
    'تجاهل المهمة لا يحلها — لو حقًا غير أولوية الآن كان الأصح تأجيلها بوضوح لا تركها بلا تخصيص.',
    'Skipping the task doesn''t resolve it — if it genuinely isn''t a priority now, the better move is an explicit delay, not leaving it unassigned.')
on conflict (rule_scope, scenario_key, decision_key) do nothing;

-- ------------------------------------------------------------
-- L. Content — EVM Simulator scenario + scoring rules
-- ------------------------------------------------------------
insert into public.kb_scenarios (rule_scope, scenario_key, title_ar, title_en, body) values (
  'level2_evm_simulator',
  'evm_case_v1',
  'مشروع متأخر ومتجاوز للميزانية',
  'A Project Behind Schedule and Over Budget',
  $json$
  {
    "context_ar": "بعد مراجعة الأداء عند منتصف المشروع: القيمة المخطَّطة (PV) = 50,000، القيمة المكتسبة (EV) = 40,000، التكلفة الفعلية (AC) = 45,000. احسب CPI وSPI، ثم اختر الاستجابة الإدارية الأنسب.",
    "context_en": "At the mid-project performance review: Planned Value (PV) = 50,000, Earned Value (EV) = 40,000, Actual Cost (AC) = 45,000. Calculate CPI and SPI, then choose the most appropriate management response.",
    "pv": 50000,
    "ev": 40000,
    "ac": 45000,
    "responses": [
      {"key": "crashing", "label_ar": "الإسراع (Crashing) — إضافة موارد لتسريع الجدول", "label_en": "Crashing — add resources to speed up the schedule"},
      {"key": "fast_tracking", "label_ar": "المسارات المتوازية (Fast Tracking) — تنفيذ أنشطة متتابعة بالتوازي", "label_en": "Fast Tracking — run sequential activities in parallel"},
      {"key": "no_action", "label_ar": "لا إجراء — الاستمرار كما هو مخطَّط", "label_en": "No action — continue as planned"},
      {"key": "rebaseline", "label_ar": "إعادة خط الأساس (Rebaseline)", "label_en": "Rebaseline the plan"}
    ]
  }
  $json$::jsonb
) on conflict (rule_scope, scenario_key) do nothing;

insert into public.kb_scoring_rules (rule_scope, scenario_key, decision_key, score, feedback_ar, feedback_en) values
  ('level2_evm_simulator', 'evm_case_v1', 'fast_tracking', 100,
    'صحيح — المشروع متأخر (SPI<1) ومتجاوز للميزانية (CPI<1) معًا. Fast Tracking يعالج الجدول عبر إعادة الترتيب بلا تكلفة إضافية بالضرورة، وهو الخيار الأول المعتاد حين تكون الميزانية مضغوطة أصلًا — على عكس Crashing الذي يزيد التكلفة عادة.',
    'Correct — the project is both behind schedule (SPI<1) and over budget (CPI<1). Fast Tracking addresses the schedule by re-sequencing work without necessarily adding cost, making it the usual first choice when budget is already tight — unlike Crashing, which typically increases cost.'),
  ('level2_evm_simulator', 'evm_case_v1', 'crashing', 55,
    'استجابة معقولة للتأخر الزمني وحده، لكنها غالبًا تزيد التكلفة — وهذا خطر إضافي على مشروع متجاوز للميزانية بالفعل (CPI<1). ليست خاطئة تمامًا، لكنها ليست الخيار الأول هنا.',
    'A reasonable response to schedule slippage alone, but it usually increases cost — an added risk on a project that''s already over budget (CPI<1). Not entirely wrong, but not the first choice here.'),
  ('level2_evm_simulator', 'evm_case_v1', 'no_action', 10,
    'كل من CPI وSPI أقل من 1 — تجاهل الانحراف في الجانبين معًا ليس خيارًا مبرَّرًا.',
    'Both CPI and SPI are below 1 — ignoring the variance on both fronts at once is not a defensible choice.'),
  ('level2_evm_simulator', 'evm_case_v1', 'rebaseline', 25,
    'إعادة خط الأساس إجراء صارم يُلجأ إليه عادة بعد فشل إجراءات تصحيحية أخرى، لا كاستجابة أولى لقياس أداء واحد في منتصف المشروع.',
    'Rebaselining is a drastic step usually taken after other corrective actions have failed, not a first response to a single mid-project performance reading.')
on conflict (rule_scope, scenario_key, decision_key) do nothing;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_scopes int;
  v_scenarios int;
  v_rules int;
  v_kb_rules_policies int;
  v_badges int;
  v_pricing int;
begin
  select count(*) into v_scopes from public.kb_rule_scopes;
  if v_scopes <> 2 then
    raise exception 'Expected 2 kb_rule_scopes, found %', v_scopes;
  end if;

  select count(*) into v_scenarios from public.kb_scenarios;
  if v_scenarios <> 2 then
    raise exception 'Expected 2 kb_scenarios, found %', v_scenarios;
  end if;

  select count(*) into v_rules from public.kb_scoring_rules;
  if v_rules <> 16 then
    raise exception 'Expected 16 kb_scoring_rules rows (12 resource optimizer + 4 evm), found %', v_rules;
  end if;

  select count(*) into v_kb_rules_policies
    from pg_policies where schemaname = 'public' and tablename = 'kb_scoring_rules';
  if v_kb_rules_policies <> 0 then
    raise exception 'kb_scoring_rules must have ZERO policies, found %', v_kb_rules_policies;
  end if;

  select count(*) into v_badges from public.badges where name in ('Resource Balancer', 'EVM Analyst');
  if v_badges <> 2 then
    raise exception 'Expected both new badges seeded, found %', v_badges;
  end if;

  select count(*) into v_pricing from public.pricing_units
   where key in ('game_level2_resource_optimizer', 'game_level2_evm_simulator');
  if v_pricing <> 2 then
    raise exception 'Expected both new pricing_units rows, found %', v_pricing;
  end if;

  raise notice '046 OK: KB engine (0 policies on kb_scoring_rules), 2 scenarios, 16 scoring rules, 2 badges, 2 pricing rows';
end $$;
