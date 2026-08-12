-- ============================================================
-- WOW - World of Work — Migration 038
-- Level 1 games (TASK_level1_games.md + v2 addendum + v3 addendum,
-- combined). Depends on 037 (Living Project) for the project variant.
--
-- WHAT THIS MIGRATION IMPLEMENTS, PER THE THREE ROUNDS OF OWNER DECISIONS:
--  - Five games, each with two variants (v2): 'project' (uses the
--    trainee's own real projects/project_charters/decision_log, lives in
--    /project/[id], no quiz lock — v3 decision 2) and 'generic' (uses a
--    pre-built scenario/statement bank, unlocks all five at once the
--    moment the single Level 1 course-final quiz is passed — v3 decision
--    1, which explicitly discarded v2's old per-module quiz-mapping
--    table as based on a quiz-per-module assumption this session verified
--    does not exist in the schema — there is exactly one course-level
--    quiz for the whole level).
--  - 10 separate pricing_units keys, one per game x variant (v3 decision
--    3), named exactly as proposed in v3.
--  - `#dynamic-ai-pricing` and `#coach-marketplace` stay documentation-only
--    backlog items (ROADMAP.md §6/§7) — nothing here implements either.
--
-- SECURITY MODEL — the same two lessons this codebase already learned
-- the hard way, applied here instead of re-discovering them under attack:
--  1. (037's lesson) Paid creation needs a SECURITY DEFINER charge+insert
--     function as the ONLY door — `game_attempts` ships with NO insert
--     policy, same forbid_client_write() trigger, and `play_game()` is
--     the sole entry point. A free direct-insert here would be exactly
--     the payment-bypass hole 037 closed on `projects`.
--  2. (028's lesson) An auto-graded exercise's answer key must be a
--     property of the DATA, not the route — `quiz_answer_key_isolation`
--     (028) found a real production hole this exact way: correct_index
--     sat inside a client-readable jsonb column, and a test account read
--     it straight off PostgREST and cheated a real assessor-approved
--     attempt. Project vs Operations Race (the one auto-graded game here)
--     gets the identical treatment: statement text is public, but
--     `game_spotter_answer_keys` has RLS enabled with ZERO policies, and
--     grading happens inside `complete_game_attempt()`, which never
--     returns the key.
--
-- A DOCUMENTED IMPLEMENTATION JUDGMENT CALL (flagging per CLAUDE.md #8,
-- same as 037's RLS hardening — not asked in so many words, but the
-- alternative silently conflicts with 037's own already-tested pricing):
-- Charter Builder's PROJECT variant is, mechanically, the same
-- CharterWizard + project_charters flow 037 already ships for free as
-- part of the one-time project creation charge. v3 says every game in
-- either variant costs coins. Charging AGAIN for the same field edits
-- 037 already made free would silently change 037's tested behavior.
-- Resolution: the coin charge on every game buys the *formal graded
-- attempt* (a game_attempts row + a shot at the badge), never the
-- underlying data edit — editing project fields/charter/decision_log
-- stays exactly as free as 037 made it, in or out of a game. For Charter
-- Builder specifically, this means completion just reads the project's
-- REAL project_charters.is_approved (server-side, ignoring whatever the
-- client's payload claims) — if a trainee already approved their charter
-- for free before ever paying to "play", paying and completing the game
-- is instant. That is intentional, not a bug: the payment is for the
-- badge attempt, not for data that was already there.
--
-- A SECOND DOCUMENTED SIMPLIFICATION: the original brief wanted Project
-- vs Operations Race statements "partly pulled from the trainee's own
-- project" for the project variant. That is incompatible with
-- pre-graded correctness (a statement improvised from free-text project
-- data has no pre-known right answer) and would break the one property
-- the brief itself called this game's strength ("الأوضح تقنيًا" — auto-
-- gradable). Both variants draw from the same pre-classified statement
-- bank; the project variant only differs cosmetically (the UI frames it
-- using the trainee's own project name/sector). Flagging this rather
-- than silently picking it.
-- ============================================================

-- ============================================================
-- A) GAME ATTEMPTS — one row per paid attempt, either variant
-- ============================================================

create table if not exists public.game_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null check (game_key in (
    'charter_builder', 'stakeholder_detective', 'project_vs_operations_race',
    'assumptions_constraints', 'strategy_alignment'
  )),
  variant text not null check (variant in ('project', 'generic')),
  project_id uuid references public.projects(id) on delete cascade,
  scenario_id uuid,  -- references game_generic_scenarios(id), see FK added below
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  score numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint game_attempts_variant_shape check (
    (variant = 'project' and project_id is not null)
    or (variant = 'generic' and project_id is null)
  )
);

create index if not exists idx_game_attempts_user on public.game_attempts(user_id, created_at desc);
create index if not exists idx_game_attempts_project on public.game_attempts(project_id) where project_id is not null;

drop trigger if exists trg_game_attempts_updated_at on public.game_attempts;
create trigger trg_game_attempts_updated_at before update on public.game_attempts
  for each row execute procedure public.set_updated_at();

alter table public.game_attempts enable row level security;

drop policy if exists "Game attempts: owner reads" on public.game_attempts;
create policy "Game attempts: owner reads" on public.game_attempts
  for select using (auth.uid() = user_id);

-- NO insert, NO update, NO delete policy — same shape as `projects` in
-- 037. `play_game()` is the only door in, `complete_game_attempt()` is
-- the only door to a status change, both SECURITY DEFINER and both
-- bypass RLS deliberately, on purpose, as the table owner.
drop trigger if exists trg_game_attempts_forbid_client_insert on public.game_attempts;
create trigger trg_game_attempts_forbid_client_insert
  before insert on public.game_attempts
  for each statement execute procedure public.forbid_client_write();

-- ============================================================
-- B) GENERIC SCENARIO BANK — games 1, 2, 4, 5 (not 3, see part C)
-- ============================================================

create table if not exists public.game_generic_scenarios (
  id uuid primary key default uuid_generate_v4(),
  game_key text not null check (game_key in (
    'charter_builder', 'stakeholder_detective', 'project_vs_operations_race',
    'assumptions_constraints', 'strategy_alignment'
  )),
  payload jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_scenarios_key on public.game_generic_scenarios(game_key) where is_active;

alter table public.game_generic_scenarios enable row level security;

-- Flavor text, not a secret — open to any signed-in user, same spirit as
-- lessons.is_free_preview. Deliberately no write policy: content-managed
-- via migrations for now, same status as quiz content before any content
-- admin UI existed.
drop policy if exists "Generic scenarios: signed-in read" on public.game_generic_scenarios;
create policy "Generic scenarios: signed-in read" on public.game_generic_scenarios
  for select using (auth.uid() is not null and is_active);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'game_attempts_scenario_fk') then
    alter table public.game_attempts
      add constraint game_attempts_scenario_fk
      foreign key (scenario_id) references public.game_generic_scenarios(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- C) PROJECT VS OPERATIONS RACE — isolated answer key (028's pattern)
-- ============================================================

create table if not exists public.game_spotter_statements (
  id uuid primary key default uuid_generate_v4(),
  text_ar text not null,
  text_en text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.game_spotter_statements enable row level security;

drop policy if exists "Spotter statements: signed-in read" on public.game_spotter_statements;
create policy "Spotter statements: signed-in read" on public.game_spotter_statements
  for select using (auth.uid() is not null and is_active);

create table if not exists public.game_spotter_answer_keys (
  statement_id uuid primary key references public.game_spotter_statements(id) on delete cascade,
  correct_type text not null check (correct_type in ('project', 'operation'))
);

alter table public.game_spotter_answer_keys enable row level security;
-- DELIBERATELY NO POLICIES — identical to quiz_answer_keys (028). RLS
-- enabled with zero policies means every client role gets zero rows on
-- every read and every write is refused; only the SECURITY DEFINER
-- grading function below (running as table owner) can see this table.

-- ============================================================
-- D) PRICING — 10 rows, one per game x variant (v3 decision 3)
-- ============================================================

-- 5 coins is a PRE-LAUNCH PLACEHOLDER, same status as 037's 10-coin
-- new_project estimate — adjustable from /admin/pricing without a code
-- change or a new migration.
insert into public.pricing_units (key, coin_cost, label_ar, label_en) values
  ('game_charter_builder_project', 5, 'لعبة بناء الميثاق — نسخة مشروعي', 'Charter Builder — Project Variant'),
  ('game_charter_builder_generic', 5, 'لعبة بناء الميثاق — نسخة عامة', 'Charter Builder — Generic Variant'),
  ('game_stakeholder_detective_project', 5, 'لعبة محقق أصحاب المصلحة — نسخة مشروعي', 'Stakeholder Detective — Project Variant'),
  ('game_stakeholder_detective_generic', 5, 'لعبة محقق أصحاب المصلحة — نسخة عامة', 'Stakeholder Detective — Generic Variant'),
  ('game_project_vs_ops_project', 5, 'سباق مشروع أم عملية — نسخة مشروعي', 'Project vs Operations Race — Project Variant'),
  ('game_project_vs_ops_generic', 5, 'سباق مشروع أم عملية — نسخة عامة', 'Project vs Operations Race — Generic Variant'),
  ('game_assumptions_constraints_project', 5, 'لعبة الافتراضات والقيود — نسخة مشروعي', 'Assumptions & Constraints — Project Variant'),
  ('game_assumptions_constraints_generic', 5, 'لعبة الافتراضات والقيود — نسخة عامة', 'Assumptions & Constraints — Generic Variant'),
  ('game_strategy_alignment_project', 5, 'لعبة مواءمة الاستراتيجية — نسخة مشروعي', 'Strategy Alignment — Project Variant'),
  ('game_strategy_alignment_generic', 5, 'لعبة مواءمة الاستراتيجية — نسخة عامة', 'Strategy Alignment — Generic Variant')
on conflict (key) do nothing;

-- ============================================================
-- E) BADGES — seed the five, matched by name (badges has no slug column
-- and this migration deliberately does not add one to a pre-existing
-- shared table used elsewhere — see RBAC/leaderboard). points_value=0
-- for all five: the brief asks for badges only, never mentions the
-- separate points/gamification system, and CLAUDE.md rule keeps points
-- and coins strictly apart — not touching points without being asked.
-- ============================================================

insert into public.badges (name, description, icon, points_value)
select v.name, v.description, v.icon, 0
from (values
  ('Charter Master', 'Completed the Charter Builder game — built and approved a full project charter.', '📜'),
  ('Stakeholder Analyst', 'Completed the Stakeholder Detective game — classified stakeholders on the power/interest grid.', '🕵️'),
  ('Project Spotter', 'Completed the Project vs Operations Race — correctly told projects and operations apart.', '🏁'),
  ('Critical Thinker', 'Completed the Assumptions & Constraints game — separated assumptions, constraints, and risks.', '🧩'),
  ('Strategy Aligner', 'Completed the Strategy Alignment game — connected a project to organizational strategy.', '🎯')
) as v(name, description, icon)
where not exists (select 1 from public.badges b where b.name = v.name);

-- ============================================================
-- F) PLAY — the only door into `game_attempts`
-- ============================================================

/**
 * Charges for and starts one game attempt. Mirrors create_project() (037)
 * and start_agent_call() (036): authoritative price read, graceful jsonb
 * refusal, spend_coins() as the only debit path, one transaction.
 *
 * Variant-specific entitlement, enforced here (not just hidden in the
 * UI) because this function is reachable directly over PostgREST RPC by
 * any authenticated client, same as every other SECURITY DEFINER
 * function in this codebase:
 *   - 'project': p_project_id must belong to the caller.
 *   - 'generic': the caller must have a PASSED attempt on the single
 *     Level 1 course-final quiz. Looked up dynamically by
 *     (pmp_level = 1 and lesson_id is null) — never a hardcoded quiz id,
 *     per the owner's explicit instruction to verify it, not guess it.
 *     A scenario/statement is not "assigned" here in the SQL sense for
 *     game 3 (client fetches an active statement page separately); for
 *     games 1/2/4/5, if the client omits p_scenario_id an active
 *     scenario for that game_key is auto-picked.
 */
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
  v_quiz_passed boolean;
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
    select exists (
      select 1
        from public.quiz_attempts qa
        join public.quizzes q on q.id = qa.quiz_id
       where qa.user_id = v_uid
         and qa.passed = true
         and q.pmp_level = 1
         and q.lesson_id is null
    ) into v_quiz_passed;

    if not coalesce(v_quiz_passed, false) then
      return jsonb_build_object('allowed', false, 'reason', 'quiz_not_passed');
    end if;

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

-- ============================================================
-- G) COMPLETE — validates completion server-side, awards the badge
-- ============================================================

/**
 * Validates the attempt's own game-specific completion criteria and, on
 * success, marks it completed and awards the badge (ON CONFLICT DO
 * NOTHING on user_badges — repeat completions never duplicate a badge).
 * Repeat calls on an attempt that doesn't yet meet criteria are free
 * (already paid for at play_game() time) and simply re-validate.
 *
 * `project_vs_operations_race` is the one branch that grades against
 * `game_spotter_answer_keys` — see header comment, same isolation 028
 * already proved necessary for quizzes. No correct_type is ever
 * returned to the caller.
 *
 * `charter_builder` + variant='project' reads the REAL project_charters
 * row rather than trusting p_payload — see header comment on why paying
 * for this game does not re-charge for the underlying (already-free)
 * edit.
 */
create or replace function public.complete_game_attempt(p_attempt_id uuid, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt record;
  v_completed boolean := false;
  v_score numeric;
  v_badge_name text;
  v_stakeholder_count int;
  v_category_count int;
  v_item_count int;
  v_total int;
  v_correct int;
  v_answer jsonb;
  v_statement_id uuid;
  v_submitted_type text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_attempt from public.game_attempts
   where id = p_attempt_id and user_id = v_uid;
  if v_attempt is null then
    return jsonb_build_object('completed', false, 'reason', 'attempt_not_found');
  end if;

  if v_attempt.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true, 'score', v_attempt.score);
  end if;

  if v_attempt.game_key = 'charter_builder' then
    if v_attempt.variant = 'project' then
      v_completed := exists (
        select 1 from public.project_charters
         where project_id = v_attempt.project_id and is_approved = true
      );
    else
      v_completed :=
        coalesce(p_payload ->> 'vision', '') <> ''
        and coalesce(p_payload ->> 'objectives', '') <> ''
        and coalesce(p_payload ->> 'deliverables', '') <> ''
        and coalesce(p_payload ->> 'sponsorName', '') <> ''
        and jsonb_array_length(coalesce(p_payload -> 'coreTeam', '[]'::jsonb)) >= 1
        and jsonb_array_length(coalesce(p_payload -> 'assumptions', '[]'::jsonb)) >= 1
        and jsonb_array_length(coalesce(p_payload -> 'constraints', '[]'::jsonb)) >= 1
        and coalesce((p_payload ->> 'approved')::boolean, false);
    end if;
    v_badge_name := 'Charter Master';

  elsif v_attempt.game_key = 'stakeholder_detective' then
    select count(*) into v_stakeholder_count
      from jsonb_array_elements(coalesce(p_payload -> 'stakeholders', '[]'::jsonb)) s
     where coalesce(s ->> 'quadrant', '') <> '' and coalesce(s ->> 'justification', '') <> '';
    v_completed := v_stakeholder_count >= 3;
    v_badge_name := 'Stakeholder Analyst';

  elsif v_attempt.game_key = 'assumptions_constraints' then
    select count(distinct s ->> 'category'), count(*)
      into v_category_count, v_item_count
      from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) s
     where (s ->> 'category') in ('assumption', 'constraint', 'risk')
       and coalesce(s ->> 'text', '') <> '';
    v_completed := v_item_count >= 4 and v_category_count >= 3;

    -- Brief's explicit requirement: project variant items also become
    -- real decision_log rows, the same table 037 built.
    if v_completed and v_attempt.variant = 'project' then
      insert into public.decision_log (project_id, situation, decision, reason, category)
      select
        v_attempt.project_id,
        coalesce(s ->> 'text', ''),
        'classified_as_' || (s ->> 'category'),
        'assumptions_constraints_game',
        s ->> 'category'
      from jsonb_array_elements(p_payload -> 'items') s
      where (s ->> 'category') in ('assumption', 'constraint', 'risk')
        and coalesce(s ->> 'text', '') <> '';
    end if;
    v_badge_name := 'Critical Thinker';

  elsif v_attempt.game_key = 'strategy_alignment' then
    -- No pass/fail grading — identical philosophy to the existing
    -- language tasks: a genuine submission earns feedback, not a
    -- correctness gate.
    v_completed := length(trim(coalesce(p_payload ->> 'response', ''))) >= 20;
    v_badge_name := 'Strategy Aligner';

  elsif v_attempt.game_key = 'project_vs_operations_race' then
    v_total := 0;
    v_correct := 0;
    for v_answer in select * from jsonb_array_elements(coalesce(p_payload -> 'answers', '[]'::jsonb))
    loop
      v_statement_id := (v_answer ->> 'statementId')::uuid;
      v_submitted_type := v_answer ->> 'type';
      v_total := v_total + 1;
      if exists (
        select 1 from public.game_spotter_answer_keys k
         where k.statement_id = v_statement_id and k.correct_type = v_submitted_type
      ) then
        v_correct := v_correct + 1;
      end if;
    end loop;

    if v_total = 0 then
      v_score := 0;
    else
      v_score := round((v_correct::numeric / v_total) * 10000) / 100;
    end if;
    v_completed := v_total >= 5 and v_score >= 80;
    v_badge_name := 'Project Spotter';
  end if;

  if not v_completed then
    return jsonb_build_object('completed', false, 'reason', 'criteria_not_met', 'score', v_score);
  end if;

  update public.game_attempts
     set status = 'completed', payload = p_payload, score = v_score, completed_at = now()
   where id = p_attempt_id;

  insert into public.user_badges (user_id, badge_id)
  select v_uid, b.id from public.badges b where b.name = v_badge_name
  on conflict (user_id, badge_id) do nothing;

  return jsonb_build_object('completed', true, 'already_completed', false, 'score', v_score, 'badge', v_badge_name);
end;
$$;

revoke execute on function public.complete_game_attempt(uuid, jsonb) from public, anon;
grant execute on function public.complete_game_attempt(uuid, jsonb) to authenticated;

-- ============================================================
-- H) SEED CONTENT — one real bilingual scenario per scenario-based game,
-- sharing one fictitious case study (a neighborhood café's second-branch
-- expansion) so the generic-variant experience reads as one coherent
-- thread across games, plus a statement bank for the auto-graded game.
-- ============================================================

-- Dollar-quoted string literals below (tag "json"), not single-quoted:
-- the English text has real apostrophes ("branch's", "governorate's")
-- that broke a single-quoted literal on first run (ERROR 42601) —
-- dollar-quoting makes the string immune to any apostrophe inside it,
-- so this can't recur no matter what content gets added here later.
insert into public.game_generic_scenarios (game_key, payload) values
(
  'charter_builder',
  $json${
    "project_name_ar": "توسعة مقهى الشروق — فرع ثانٍ",
    "project_name_en": "Sunrise Café — Second Branch Expansion",
    "brief_ar": "مقهى الشروق يعمل منذ 4 سنوات في فرعه الوحيد، ويحقق أرباحًا مستقرة. المالكة ليلى قررت فتح فرع ثانٍ في حي مجاور خلال 6 أشهر، بميزانية محدودة، بعد ملاحظة طلب متكرر من زبائن يسكنون هناك.",
    "brief_en": "Sunrise Café has run one profitable branch for 4 years. The owner, Layla, decided to open a second branch in a nearby neighborhood within 6 months, on a tight budget, after repeatedly hearing demand from customers who live there.",
    "sponsor_name": "Layla — Owner",
    "suggested_objectives_ar": "افتتاح الفرع الثاني خلال 6 أشهر بميزانية لا تتجاوز 300,000 دولار، مع الحفاظ على جودة القهوة والخدمة نفسها في الفرع الأول.",
    "suggested_objectives_en": "Open the second branch within 6 months on a budget capped at $300,000, while matching the first branch's coffee and service quality."
  }$json$::jsonb
),
(
  'stakeholder_detective',
  $json${
    "project_name_ar": "توسعة مقهى الشروق — فرع ثانٍ",
    "project_name_en": "Sunrise Café — Second Branch Expansion",
    "candidate_stakeholders_ar": ["ليلى (المالكة)", "يوسف (كبير الباريستا)", "مالك العقار الجديد", "مكتب التراخيص بالبلدية", "موظفو الفرع الأول (يخشون النقل)", "المورد الحالي للبن", "مقهى منافس بجوار الموقع الجديد", "الزبائن الدائمون"],
    "candidate_stakeholders_en": ["Layla (Owner)", "Youssef (Head Barista)", "Landlord of the new location", "Municipality licensing office", "Existing branch staff (worried about being transferred)", "Current coffee-bean supplier", "A competing café near the new site", "Loyal regular customers"]
  }$json$::jsonb
),
(
  'assumptions_constraints',
  $json${
    "project_name_ar": "توسعة مقهى الشروق — فرع ثانٍ",
    "project_name_en": "Sunrise Café — Second Branch Expansion",
    "hints_ar": ["افتراض: حركة المشاة في الموقع الجديد تطابق التوقعات", "قيد: الميزانية لا تتجاوز 300,000 دولار", "خطر: تأخر تصريح البلدية عن الموعد المخطط"],
    "hints_en": ["Assumption: foot traffic at the new location matches projections", "Constraint: budget capped at $300,000", "Risk: the municipality permit is delayed past the planned date"]
  }$json$::jsonb
),
(
  'strategy_alignment',
  $json${
    "project_name_ar": "توسعة مقهى الشروق — فرع ثانٍ",
    "project_name_en": "Sunrise Café — Second Branch Expansion",
    "org_strategy_ar": "أن يصبح مقهى الشروق العلامة الأكثر تميزًا للقهوة المختصة في المحافظة خلال 3 سنوات.",
    "org_strategy_en": "For Sunrise Café to become the governorate's most recognized specialty-coffee brand within 3 years.",
    "prompt_ar": "بجملة أو جملتين، اشرح كيف تخدم توسعة الفرع الثاني هذا الهدف الاستراتيجي تحديدًا.",
    "prompt_en": "In one or two sentences, explain how the second-branch expansion specifically serves this strategic goal."
  }$json$::jsonb
)
on conflict do nothing;

insert into public.game_spotter_statements (id, text_ar, text_en) values
  ('a1000000-0000-4000-8000-000000000001', 'بناء جسر جديد في المدينة', 'Building a new bridge in the city'),
  ('a1000000-0000-4000-8000-000000000002', 'خدمة تنظيف الشوارع اليومية', 'Daily street cleaning service'),
  ('a1000000-0000-4000-8000-000000000003', 'إطلاق تطبيق مصرفي جديد عبر الجوال', 'Launching a new mobile banking app'),
  ('a1000000-0000-4000-8000-000000000004', 'تجهيز كشوف الرواتب الشهرية', 'Processing monthly payroll'),
  ('a1000000-0000-4000-8000-000000000005', 'تنظيم حفل الشركة السنوي لأول مرة', 'Organizing the company''s annual gala for the first time'),
  ('a1000000-0000-4000-8000-000000000006', 'الرد على تذاكر دعم العملاء', 'Answering customer support tickets'),
  ('a1000000-0000-4000-8000-000000000007', 'ترحيل نظام بريد الشركة إلى مزوّد جديد', 'Migrating the company''s email system to a new provider'),
  ('a1000000-0000-4000-8000-000000000008', 'تعبئة رفوف المتجر كل صباح', 'Restocking store shelves every morning'),
  ('a1000000-0000-4000-8000-000000000009', 'تطوير لقاح لسلالة فيروس جديدة', 'Developing a vaccine for a new virus strain'),
  ('a1000000-0000-4000-8000-000000000010', 'تشغيل النسخ الاحتياطي الليلي للخوادم', 'Running the nightly server backup'),
  ('a1000000-0000-4000-8000-000000000011', 'تجديد المقر الرئيسي للشركة', 'Renovating the company headquarters'),
  ('a1000000-0000-4000-8000-000000000012', 'الصيانة الدورية الروتينية للمعدات', 'Handling routine equipment maintenance'),
  ('a1000000-0000-4000-8000-000000000013', 'نقل المستودع إلى موقع جديد', 'Relocating the warehouse to a new site'),
  ('a1000000-0000-4000-8000-000000000014', 'استقبال شحنات الموردين يوميًا', 'Receiving supplier deliveries every day')
on conflict (id) do nothing;

insert into public.game_spotter_answer_keys (statement_id, correct_type) values
  ('a1000000-0000-4000-8000-000000000001', 'project'),
  ('a1000000-0000-4000-8000-000000000002', 'operation'),
  ('a1000000-0000-4000-8000-000000000003', 'project'),
  ('a1000000-0000-4000-8000-000000000004', 'operation'),
  ('a1000000-0000-4000-8000-000000000005', 'project'),
  ('a1000000-0000-4000-8000-000000000006', 'operation'),
  ('a1000000-0000-4000-8000-000000000007', 'project'),
  ('a1000000-0000-4000-8000-000000000008', 'operation'),
  ('a1000000-0000-4000-8000-000000000009', 'project'),
  ('a1000000-0000-4000-8000-000000000010', 'operation'),
  ('a1000000-0000-4000-8000-000000000011', 'project'),
  ('a1000000-0000-4000-8000-000000000012', 'operation'),
  ('a1000000-0000-4000-8000-000000000013', 'project'),
  ('a1000000-0000-4000-8000-000000000014', 'operation')
on conflict (statement_id) do nothing;

-- ============================================================
-- I) SELF-CHECK
-- ============================================================

do $$
declare
  v_attempts_policies int;
  v_scenarios_policies int;
  v_statements_policies int;
  v_keys_policies int;
  v_pricing_rows int;
  v_badges_rows int;
  v_leaked int;
  v_fn1 int;
  v_fn2 int;
begin
  select count(*) into v_attempts_policies
    from pg_policies where schemaname = 'public' and tablename = 'game_attempts';
  if v_attempts_policies <> 1 then
    raise exception 'game_attempts must have exactly 1 policy (owner select only), found %', v_attempts_policies;
  end if;

  select count(*) into v_scenarios_policies
    from pg_policies where schemaname = 'public' and tablename = 'game_generic_scenarios';
  if v_scenarios_policies <> 1 then
    raise exception 'game_generic_scenarios must have exactly 1 policy, found %', v_scenarios_policies;
  end if;

  select count(*) into v_statements_policies
    from pg_policies where schemaname = 'public' and tablename = 'game_spotter_statements';
  if v_statements_policies <> 1 then
    raise exception 'game_spotter_statements must have exactly 1 policy, found %', v_statements_policies;
  end if;

  select count(*) into v_keys_policies
    from pg_policies where schemaname = 'public' and tablename = 'game_spotter_answer_keys';
  if v_keys_policies <> 0 then
    raise exception 'game_spotter_answer_keys must have ZERO policies, found %', v_keys_policies;
  end if;

  select count(*) into v_leaked
    from public.game_spotter_statements s
   where not exists (select 1 from public.game_spotter_answer_keys k where k.statement_id = s.id);
  if v_leaked > 0 then
    raise exception '% statement(s) have no answer key row', v_leaked;
  end if;

  select count(*) into v_pricing_rows from public.pricing_units where key like 'game_%';
  if v_pricing_rows <> 10 then
    raise exception 'expected 10 game_%% pricing_units rows, found %', v_pricing_rows;
  end if;

  select count(*) into v_badges_rows from public.badges
   where name in ('Charter Master', 'Stakeholder Analyst', 'Project Spotter', 'Critical Thinker', 'Strategy Aligner');
  if v_badges_rows <> 5 then
    raise exception 'expected 5 game badges seeded, found %', v_badges_rows;
  end if;

  select count(*) into v_fn1 from pg_proc where proname = 'play_game';
  select count(*) into v_fn2 from pg_proc where proname = 'complete_game_attempt';
  if v_fn1 = 0 then raise exception 'play_game() was not created'; end if;
  if v_fn2 = 0 then raise exception 'complete_game_attempt() was not created'; end if;

  raise notice '038 OK: game_attempts/game_generic_scenarios/game_spotter_* created, 10 pricing rows, 5 badges seeded, play_game()/complete_game_attempt() installed';
end $$;
