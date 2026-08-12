-- ============================================================
-- WOW - World of Work — Migration 058
-- Level 2 Unit 6's closing exercise — "Burndown Reader". Owner-approved
-- design: pure content on top of the EXISTING kb_scoring_rules engine
-- (046) — confirmed via a real search of package.json + the codebase
-- that no charting library exists anywhere in this project, so the
-- scenario is a plain text table (day/ideal/actual), not a rendered
-- chart. NO new tables, no new generic infrastructure — only:
--   - one new kb_rule_scopes row
--   - one new kb_scenarios row (the 6-day sprint data + 3 questions)
--   - 9 new kb_scoring_rules rows (3 questions × 3 choices each)
--   - one new completion function, mirroring
--     complete_resource_optimizer_attempt's exact shape (composite
--     "<scenario_key>:<questionKey>" scenarioKey per decision, scored
--     via the existing kb_score_decisions() helper)
--   - one new badge, one new pricing_units row (proposed 6 coins —
--     shorter exercise than the other two games, confirm/adjust
--     anytime via /admin/pricing)
-- ============================================================

insert into public.kb_rule_scopes (rule_scope, label_ar, label_en, passing_score, scenario_count) values
  ('level2_burndown_reader', 'قارئ Burndown', 'Burndown Reader', 70, 1)
on conflict (rule_scope) do nothing;

insert into public.pricing_units (key, coin_cost, label_ar, label_en) values
  ('game_level2_burndown_reader', 6, 'قارئ Burndown', 'Burndown Reader')
on conflict (key) do nothing;

insert into public.badges (name, description, icon)
select v.name, v.description, v.icon
from (values
  ('Burndown Reader', 'قرأت مخطط Burndown صح — رصدت الانحراف عن الخط المثالي واخترت الاستجابة الصحيحة.', '📉')
) as v(name, description, icon)
where not exists (select 1 from public.badges b where b.name = v.name);

-- ------------------------------------------------------------
-- Scenario: a 6-day sprint, 30 story points, actual falling
-- progressively further behind the ideal line each day.
-- ------------------------------------------------------------
insert into public.kb_scenarios (rule_scope, scenario_key, title_ar, title_en, body) values (
  'level2_burndown_reader',
  'burndown_case_v1',
  'سبرنت في خطر',
  'A Sprint at Risk',
  $json$
  {
    "context_ar": "سبرنت أسبوعين (6 أيام عمل) بإجمالي 30 نقطة قصة. راجع الجدول بعناية، وجاوب الأسئلة الثلاثة.",
    "context_en": "A two-week sprint (6 working days), 30 total story points. Review the table carefully, then answer the three questions.",
    "days": [
      {"day": 0, "ideal": 30, "actual": 30},
      {"day": 1, "ideal": 25, "actual": 28},
      {"day": 2, "ideal": 20, "actual": 26},
      {"day": 3, "ideal": 15, "actual": 24},
      {"day": 4, "ideal": 10, "actual": 20},
      {"day": 5, "ideal": 5,  "actual": 16},
      {"day": 6, "ideal": 0,  "actual": 13}
    ],
    "questions": [
      {
        "key": "on_track",
        "text_ar": "هل الفريق على المسار الصحيح لإنهاء نطاق السبرنت؟",
        "text_en": "Is the team on track to finish the sprint scope?",
        "choices": [
          {"key": "on_track", "label_ar": "نعم، قريب من الخط المثالي", "label_en": "Yes, close to the ideal line"},
          {"key": "behind", "label_ar": "لا، متأخر بوضوح عن الخط المثالي", "label_en": "No, clearly behind the ideal line"},
          {"key": "ahead", "label_ar": "لا، الفريق أسرع من الخط المثالي", "label_en": "No, the team is ahead of the ideal line"}
        ]
      },
      {
        "key": "trend",
        "text_ar": "إيه اللي بيقوله اتجاه الفجوة بين الخط الفعلي والمثالي عبر الأيام؟",
        "text_en": "What does the trend in the gap between actual and ideal say across the days?",
        "choices": [
          {"key": "widening", "label_ar": "الفجوة بتكبر يوم بعد يوم", "label_en": "The gap is widening day by day"},
          {"key": "narrowing", "label_ar": "الفجوة بتقل يوم بعد يوم", "label_en": "The gap is narrowing day by day"},
          {"key": "stable", "label_ar": "الفجوة ثابتة تقريبًا", "label_en": "The gap is roughly stable"}
        ]
      },
      {
        "key": "risk_action",
        "text_ar": "هل فيه خطر تأخير، وإيه الإجراء الأنسب؟",
        "text_en": "Is there a delay risk, and what's the most appropriate action?",
        "choices": [
          {"key": "no_risk", "label_ar": "لا خطر، استمر زي ما انت من غير أي تغيير", "label_en": "No risk, continue exactly as-is"},
          {"key": "review_backlog", "label_ar": "خطر حقيقي — راجع الـBacklog في أقرب Retrospective وفكّر تقلل النطاق أو تزود الموارد", "label_en": "Real risk — review the backlog at the next retrospective and consider reducing scope or adding resources"},
          {"key": "stop_sprint", "label_ar": "أوقف السبرنت فورًا واعتبره فشل كامل", "label_en": "Stop the sprint immediately and call it a total failure"}
        ]
      }
    ]
  }
  $json$::jsonb
) on conflict (rule_scope, scenario_key) do nothing;

insert into public.kb_scoring_rules (rule_scope, scenario_key, decision_key, score, feedback_ar, feedback_en) values
  ('level2_burndown_reader', 'burndown_case_v1:on_track', 'behind', 100,
    'صحيح — الفعلي أعلى من المثالي في كل يوم بعد البداية، وده يعني عمل متبقٍّ أكتر من المخطط.',
    'Correct — actual stays above ideal every day after the start, meaning more remaining work than planned.'),
  ('level2_burndown_reader', 'burndown_case_v1:on_track', 'on_track', 0,
    'الفعلي بعيد عن المثالي من اليوم الأول ولا يقترب منه أبدًا — هذا ليس "قريب من المسار".',
    'The actual line is far from ideal from day one and never closes in — this is not "close to on track".'),
  ('level2_burndown_reader', 'burndown_case_v1:on_track', 'ahead', 0,
    'العكس تمامًا — الفعلي أعلى من المثالي (عمل متبقٍّ أكتر لا أقل)، وهذا تأخر لا تقدّم.',
    'The exact opposite — actual is above ideal (more remaining work, not less), which is behind, not ahead.'),

  ('level2_burndown_reader', 'burndown_case_v1:trend', 'widening', 100,
    'صحيح — الفجوة تكبر باستمرار: 0 ثم 3 ثم 6 ثم 9 ثم 10 ثم 11 ثم 13 نقطة.',
    'Correct — the gap keeps growing: 0, then 3, 6, 9, 10, 11, and 13 points.'),
  ('level2_burndown_reader', 'burndown_case_v1:trend', 'narrowing', 0,
    'الفجوة تكبر لا تقل في كل يوم من أيام السبرنت — لاحظ الأرقام يوم بيوم.',
    'The gap grows, not shrinks, every single day of the sprint — check the numbers day by day.'),
  ('level2_burndown_reader', 'burndown_case_v1:trend', 'stable', 15,
    'قراءة سطحية للأرقام ممكن توحي بثبات نسبي، لكن الفجوة تتضاعف أكتر من مرة عبر السبرنت — مش ثابتة فعليًا.',
    'A surface read might suggest rough stability, but the gap more than doubles across the sprint — it is not actually stable.'),

  ('level2_burndown_reader', 'burndown_case_v1:risk_action', 'review_backlog', 100,
    'صحيح — خطر حقيقي وواضح، والاستجابة المتناسبة معه مراجعة الـBacklog والنطاق أو الموارد، لا تجاهله ولا تهويله لحد إيقاف السبرنت.',
    'Correct — a real, clear risk, and the proportionate response is reviewing the backlog and scope or resources, neither ignoring it nor escalating to stopping the sprint.'),
  ('level2_burndown_reader', 'burndown_case_v1:risk_action', 'no_risk', 0,
    'تجاهل فجوة متزايدة بهذا الوضوح ليس قرارًا مبرَّرًا — البيانات تُظهر خطرًا حقيقيًا.',
    'Ignoring a gap this clearly widening is not a defensible call — the data shows a real risk.'),
  ('level2_burndown_reader', 'burndown_case_v1:risk_action', 'stop_sprint', 30,
    'استجابة مبالَغ فيها — السبرنت متأخر لا فاشل بالكامل؛ مراجعة النطاق أو الموارد عادة أنسب من الإيقاف الفوري.',
    'An overreaction — the sprint is behind, not a total failure; reviewing scope or resources is usually more appropriate than stopping outright.')
on conflict (rule_scope, scenario_key, decision_key) do nothing;

-- ------------------------------------------------------------
-- Completion function — mirrors complete_resource_optimizer_attempt
-- (046) exactly: composite "<scenario_key>:<questionKey>" per decision,
-- scored via the existing kb_score_decisions() helper. No new generic
-- infrastructure needed.
-- ------------------------------------------------------------
create or replace function public.complete_burndown_reader_attempt(p_attempt_id uuid, p_answers jsonb)
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
   where id = p_attempt_id and user_id = v_uid and rule_scope = 'level2_burndown_reader';
  if v_attempt is null then
    return jsonb_build_object('completed', false, 'reason', 'attempt_not_found');
  end if;
  if v_attempt.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true, 'score', v_attempt.score, 'passed', v_attempt.passed);
  end if;

  select * into v_scenario from public.kb_scenarios where id = v_attempt.scenario_ids[1];
  select * into v_scope from public.kb_rule_scopes where rule_scope = 'level2_burndown_reader';

  v_decisions := '[]'::jsonb;
  for v_a in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
      'scenarioKey', v_scenario.scenario_key || ':' || (v_a ->> 'questionKey'),
      'decisionKey', v_a ->> 'answerKey'
    ));
  end loop;

  v_result := public.kb_score_decisions('level2_burndown_reader', v_decisions);
  v_score := (v_result ->> 'averageScore')::numeric;
  v_passed := v_score >= v_scope.passing_score;

  update public.kb_game_attempts
     set status = 'completed', score = v_score, passed = v_passed, result = v_result, completed_at = now()
   where id = p_attempt_id;

  if v_passed then
    insert into public.user_badges (user_id, badge_id)
    select v_uid, b.id from public.badges b where b.name = 'Burndown Reader'
    on conflict (user_id, badge_id) do nothing;
  end if;

  return jsonb_build_object('completed', true, 'already_completed', false, 'score', v_score, 'passed', v_passed, 'result', v_result);
end;
$$;

revoke execute on function public.complete_burndown_reader_attempt(uuid, jsonb) from public, anon;
grant execute on function public.complete_burndown_reader_attempt(uuid, jsonb) to authenticated;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_scopes int;
  v_scenarios int;
  v_rules int;
  v_badge int;
  v_pricing int;
begin
  select count(*) into v_scopes from public.kb_rule_scopes where rule_scope = 'level2_burndown_reader';
  if v_scopes <> 1 then
    raise exception '058 failed: kb_rule_scopes row missing';
  end if;

  select count(*) into v_scenarios from public.kb_scenarios where rule_scope = 'level2_burndown_reader';
  if v_scenarios <> 1 then
    raise exception '058 failed: expected 1 kb_scenarios row, found %', v_scenarios;
  end if;

  select count(*) into v_rules from public.kb_scoring_rules where rule_scope = 'level2_burndown_reader';
  if v_rules <> 9 then
    raise exception '058 failed: expected 9 kb_scoring_rules rows (3 questions x 3 choices), found %', v_rules;
  end if;

  select count(*) into v_badge from public.badges where name = 'Burndown Reader';
  if v_badge <> 1 then
    raise exception '058 failed: badge not seeded';
  end if;

  select count(*) into v_pricing from public.pricing_units where key = 'game_level2_burndown_reader';
  if v_pricing <> 1 then
    raise exception '058 failed: pricing_units row not seeded';
  end if;

  raise notice '058 OK: burndown reader rule_scope, scenario, 9 rules, badge, pricing all in place';
end $$;
