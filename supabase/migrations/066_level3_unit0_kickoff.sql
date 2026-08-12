-- ============================================================
-- WOW - World of Work — Migration 066
-- Level 3 (Project Delivery & Agile Leadership) course content, Unit 0
-- — "Delivery Kickoff" (2 hours). Content authored by the owner
-- directly and pasted for planting, same division of labor as every
-- prior unit: Claude Code applies and verifies, does not invent the
-- pedagogical content. Mirrors migration 047's exact shape (fresh
-- `courses` row, one `modules` row, `content`/`translations` jsonb) —
-- with `review_status = 'approved'` set directly on the INSERT this
-- time (047/048/051 all skipped this and had to be backfilled later,
-- 052 — not repeating that here).
--
-- Also builds the generic engine for lesson-embedded Entity Memory
-- decision points (`lesson_entity_decisions` + `submit_lesson_
-- entity_decision()`), and wires up both scenarios: Scenario 1 (the
-- first meeting with Sarah, entity_type='character') and Scenario 2
-- (the first Executive Board briefing) — the owner confirmed a hybrid
-- entity model for the board: each of the 5 members is tracked as its
-- own `character` entity (ceo/cfo/cto/sponsor/ops_director, each with
-- its own `*_trust` metric — this is what makes a future "convince 4 of
-- 5" Final Boss threshold computable from real accumulated data), AND
-- major decisions also nudge the aggregate `organization` entity's
-- `org_planning_maturity` indicator when they reflect real planning
-- maturity, not just individual relationship management.
--
-- Deltas are never taken from the client: submit_lesson_entity_
-- decision() reads the authored choice/delta from the lesson's own
-- `content` (never `draft_content` — the live/published version only)
-- server-side, matching the same never-trust-client-state discipline
-- used for scores/prices/completion everywhere else in this project.
-- ============================================================

-- ------------------------------------------------------------
-- A. lesson_entity_decisions — records which choice a learner made for
-- a given lesson-embedded scenario, and is the anti-replay guard (one
-- decision per user/lesson/scenario, same unique-constraint pattern as
-- language_task_submissions, 017) — a learner cannot re-pick a better
-- answer after seeing the consequence of a worse one.
-- ------------------------------------------------------------
create table if not exists public.lesson_entity_decisions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  scenario_key text not null,
  choice_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id, scenario_key)
);

alter table public.lesson_entity_decisions enable row level security;

drop policy if exists "Lesson entity decisions: owner reads own" on public.lesson_entity_decisions;
create policy "Lesson entity decisions: owner reads own"
  on public.lesson_entity_decisions for select
  using (user_id = auth.uid());

-- No INSERT policy for anyone — only submit_lesson_entity_decision()
-- (below) writes here, so the delta actually applied can never be
-- something other than what this row's choice_key implies.

-- ------------------------------------------------------------
-- B. submit_lesson_entity_decision — the only path from "a learner
-- picked A/B/C/D" to an actual Entity Memory change. Looks up the
-- scenario/choice inside lessons.content->'entity_decisions' (authored
-- data, content.manage-controlled) and applies EXACTLY that choice's
-- pre-authored delta via apply_entity_memory_event() (064) — the
-- client only ever sends which key it picked, never a delta value.
-- ------------------------------------------------------------
create or replace function public.submit_lesson_entity_decision(
  p_lesson_id uuid,
  p_scenario_key text,
  p_choice_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_content jsonb;
  v_scenario jsonb;
  v_choice jsonb;
  v_entity_type text;
  v_entity_key text;
  v_delta jsonb;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.lesson_entity_decisions
     where user_id = v_uid and lesson_id = p_lesson_id and scenario_key = p_scenario_key
  ) then
    return jsonb_build_object('submitted', false, 'reason', 'already_decided');
  end if;

  select content into v_content from public.lessons where id = p_lesson_id;
  if v_content is null then
    return jsonb_build_object('submitted', false, 'reason', 'lesson_not_found');
  end if;

  select s into v_scenario
    from jsonb_array_elements(coalesce(v_content -> 'entity_decisions', '[]'::jsonb)) s
   where s ->> 'scenario_key' = p_scenario_key;
  if v_scenario is null then
    return jsonb_build_object('submitted', false, 'reason', 'scenario_not_found');
  end if;

  select c into v_choice
    from jsonb_array_elements(v_scenario -> 'choices') c
   where c ->> 'key' = p_choice_key;
  if v_choice is null then
    return jsonb_build_object('submitted', false, 'reason', 'choice_not_found');
  end if;

  v_entity_type := v_scenario ->> 'entity_type';
  v_entity_key := v_scenario ->> 'entity_key';
  v_delta := v_choice -> 'delta';

  insert into public.lesson_entity_decisions (user_id, lesson_id, scenario_key, choice_key)
  values (v_uid, p_lesson_id, p_scenario_key, p_choice_key);

  v_result := public.apply_entity_memory_event(
    v_uid, v_entity_type, v_entity_key,
    'lesson:' || p_lesson_id::text || ':' || p_scenario_key,
    v_delta, p_choice_key,
    v_choice ->> 'feedback_ar', v_choice ->> 'feedback_en'
  );

  return jsonb_build_object(
    'submitted', true,
    'entityType', v_entity_type,
    'entityKey', v_entity_key,
    'state', v_result -> 'state',
    'feedbackAr', v_choice ->> 'feedback_ar',
    'feedbackEn', v_choice ->> 'feedback_en'
  );
end;
$$;

revoke execute on function public.submit_lesson_entity_decision(uuid, text, text) from public, anon;
grant execute on function public.submit_lesson_entity_decision(uuid, text, text) to authenticated;

-- ============================================================
-- C. COURSE + UNIT 0 + LESSON 0.1
-- ============================================================
do $$
declare
  v_course_id uuid := uuid_generate_v4();
  v_mod0 uuid := uuid_generate_v4();
begin
  insert into public.courses (id, title, track, summary, owner_type, owner_id, language, is_published)
  values (
    v_course_id,
    'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث',
    'education',
    'Certified Project Delivery & Agile Leadership Professional. Builds directly on Level 2''s approved plan (WBS, schedule, risk register, EVM-based budget). 40-46 content hours across eight delivery/leadership dimensions plus a Mega Delivery Simulation Final Boss. Professional title on completion: Delivery Leadership Specialist.',
    null, null,
    'ar',
    true
  );

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod0, v_course_id, 'Unit 0: Delivery Kickoff', 0);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod0, 'Lesson 0.1: Delivery Kickoff', 1, 120, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'sarah_timeline_question',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'situation_ar', 'Sarah بتسألك مباشرة: "هل الجدول الزمني ده واقعي، ولا مفروض علينا من الإدارة؟"',
          'situation_en', 'Sarah asks you directly: "Is this timeline realistic, or was it imposed on us by management?"',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'الجدول واقعي، وأنا جاهز أراجعه معاكِ لو فيه جزء قلقانة منه.',
              'label_en', 'The timeline is realistic, and I''m ready to review it with you if any part worries you.',
              'delta', jsonb_build_object('trust', 6, 'respect', 4),
              'feedback_ar', 'الأفضل: شفافية + استعداد فعلي للمراجعة — بالظبط مبدأ "الشفافية عن حدود الخطة أهم من الثقة الزايدة".',
              'feedback_en', 'Best: transparency plus real willingness to review — exactly the "transparency about the plan''s limits matters more than overconfidence" principle.'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'الجدول معتمد من الإدارة، وده اللي عندنا نشتغل بيه.',
              'label_en', 'The timeline is approved by management, and that''s what we have to work with.',
              'delta', jsonb_build_object('trust', -3, 'stress', 5),
              'feedback_ar', 'ضعيف: صحيح لكنه بيوضّح دورك كسلطة منفِّذة بس، لا قائد بيدافع عن فريقه أو يراجع معاه — بيزوّد التوتر بدل ما يقلّله.',
              'feedback_en', 'Weak: accurate, but frames you as an enforcer, not a leader reviewing with the team — raises stress instead of lowering it.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'أكيد واقعي 100%، متقلقيش.',
              'label_en', 'Absolutely realistic, don''t worry.',
              'delta', jsonb_build_object('trust', -5),
              'feedback_ar', 'الأسوأ تقريبًا: ثقة زايدة بلا دليل فعلي مشكلة قيادية دلوقتي، مش بس لو انكشفت لاحقًا — Sarah بتحس بالفرق بين إجابة مدروسة وتطمين سطحي فورًا، وده بالظبط عكس مبدأ "الشفافية عن حدود الخطة أهم من الثقة الزايدة".',
              'feedback_en', 'Nearly worst: overconfidence with no real evidence is a leadership problem right now, not just if it''s exposed later — Sarah feels the difference between a considered answer and a surface-level reassurance immediately. The direct opposite of "transparency about the plan''s limits matters more than overconfidence."'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تجاهل السؤال والانتقال لموضوع تاني.',
              'label_en', 'Ignore the question and move to another topic.',
              'delta', jsonb_build_object('trust', -8, 'respect', -6),
              'feedback_ar', 'الأسوأ: تجاهل سؤال مباشر في أول لقاء بيلغي مبدأ "الاستماع الفعّال في أول لقاء يوفّر وقت تصحيح أكتر بكتير لاحقًا" تمامًا.',
              'feedback_en', 'Worst: ignoring a direct question in the first meeting fully negates "active listening in the first meeting saves far more correction time later."'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'board_first_briefing',
          'entity_type', 'organization',
          'entity_key', 'org',
          'situation_ar', 'في أول اجتماع، عندك 10 دقائق بس. تقدّم إيه الأول؟',
          'situation_en', 'In the first meeting, you only have 10 minutes. What do you present first?',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'ملخص تنفيذي بصفحة واحدة (القيمة، المخاطر الرئيسية، الأولوية القادمة).',
              'label_en', 'A one-page executive summary (value, key risks, next priority).',
              'delta', jsonb_build_object('org_planning_maturity', 5, 'ceo_trust', 8, 'sponsor_trust', 8),
              'feedback_ar', 'الأفضل: ملخص مركَّز بيرضي مين محتاج القرار الاستراتيجي بسرعة (CEO وSponsor) وبيعكس نضج تخطيطي حقيقي — بالظبط "وضّح الأولويات اللي هتبدأ بيها فورًا، مش كل حاجة سوا".',
              'feedback_en', 'Best: a focused summary satisfies whoever needs the strategic call fast (CEO and Sponsor) and reflects real planning maturity — exactly "clarify your immediate priorities, not everything at once."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تفاصيل تقنية كاملة عن الـWBS.',
              'label_en', 'Full technical WBS detail.',
              'delta', jsonb_build_object('cto_trust', 8, 'cfo_trust', -5, 'ceo_trust', -5),
              'feedback_ar', 'جزئي: بيرضي CTO لكن بيضيّع وقت الـCFO والـCEO في 10 دقائق مفروض تتصرف فيها بذكاء — "مجلس متعدد الأعضاء = توقعات متضاربة بالتصميم".',
              'feedback_en', 'Partial: satisfies the CTO but wastes CFO/CEO time in a 10-minute slot meant to be spent wisely — "a multi-member board means conflicting expectations by design."'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'تركيز كامل على التكلفة والميزانية.',
              'label_en', 'Full focus on cost and budget.',
              'delta', jsonb_build_object('cfo_trust', 8, 'cto_trust', -5),
              'feedback_ar', 'جزئي: بيرضي CFO لكن بيتجاهل الجودة والابتكار اللي CTO بيقيسه — نفس مشكلة "مفيش عرض واحد يرضي الخمسة".',
              'feedback_en', 'Partial: satisfies the CFO but ignores the quality/innovation lens the CTO measures — the same "no single pitch satisfies all five" problem.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'اعتذار عن نقص الوقت وتأجيل العرض.',
              'label_en', 'Apologize for the time constraint and postpone the presentation.',
              'delta', jsonb_build_object('ceo_trust', -4, 'cfo_trust', -4, 'cto_trust', -4, 'sponsor_trust', -4, 'ops_director_trust', -4, 'org_planning_maturity', -4),
              'feedback_ar', 'الأسوأ: أضاع الفرصة على الخمسة أعضاء مع بعض، وبيوحي بعدم استعداد فعلي — عكس "التسليم الناجح = نقل السياق، مش بس المستندات".',
              'feedback_en', 'Worst: wastes the opportunity with all five members at once, and signals real unpreparedness — the opposite of "a successful handoff means transferring context, not just documents."'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Delivery Kickoff',
        'body', 'You finished Level 2 with a complete project plan: a real WBS, schedule, risk register, and an EVM-based budget. But the best plan in the world is worth nothing without a team to execute it and a board to approve it. This module isn''t about new tools — it''s about the moment you shift from "a person with a plan" to "a leader with a real team and real stakeholders expecting results."

The most dangerous moment in any project isn''t its launch — it''s the handoff from planning to execution. Most projects that fail don''t fail because the plan was wrong, but because context was lost at handoff: why decisions were made, what was tried and failed, what risks the original team was worried about. As a leader receiving a project, your first responsibility is making sure the team and the board understand the same plan you do — not just see it.

You''ll meet your team for the first time in this module. The first character you''ll meet: Sarah — Senior Developer. Like any real professional relationship, the first impression isn''t final, but it sets the starting point. Decisions you make in this meeting start recording in Entity Memory — a system that remembers your interaction with each character across every module up to Final Boss, not resetting each time. First-meeting leadership principles: (1) Listen before you speak. (2) Be transparent about the plan''s limits. (3) Clarify your role, not your authority.

The Executive Board isn''t a single sponsor like Level 2 — there are now 5 members, each seeing the project from a completely different angle: the CEO (long-term strategic value), the CFO (cost/ROI), the CTO (technical quality/innovation), the Sponsor (achieving project goals), and the Ops Director (continuity/efficiency). The key point: no single pitch satisfies all five. Your job isn''t to convince them all the plan is perfect — it''s to manage conflicting expectations clearly, and explain what you''ll deliver first, and why.

Rule points: 1) A successful handoff means transferring context, not just documents. 2) A first impression with any character sets a starting point, not a final result. 3) Transparency about the plan''s limits matters more than overconfidence. 4) A multi-member board means conflicting expectations by design, not an exception. 5) Managing conflicting expectations is the top leadership skill at this stage. 6) Clarify your immediate priorities — not everything at once. 7) Decisions in this module build real trust/respect that accumulates later. 8) Active listening in the first meeting saves far more correction time later.'
      ),
      'ar', jsonb_build_object(
        'title', 'انطلاقة التسليم',
        'body', 'خلّصت مستوى 2 وعندك خطة مشروع كاملة: WBS حقيقي، جدول زمني، سجل مخاطر، وميزانية بمنهجية EVM. لكن الخطة الأفضل في العالم قيمتها صفر لو مالهاش فريق ينفّذها ومجلس يوافق عليها. الوحدة دي مش عن أدوات جديدة — هي عن اللحظة اللي بتتحول فيها من "شخص عنده خطة" لـ"قائد عنده فريق وأصحاب مصلحة حقيقيين بيتوقعوا منه نتائج".

أخطر لحظة في أي مشروع مش لحظة إطلاقه — هي لحظة تسليمه من فريق التخطيط لفريق التنفيذ. أغلب المشاريع اللي تفشل، تفشل مش لأن الخطة كانت غلط، لكن لأن حد ما نقلش السياق كامل وقت التسليم: ليه القرارات دي اتاخدت، إيه اللي اتجرّب وفشل، وإيه المخاطر اللي الفريق الأصلي كان قلقان منها. كقائد بتستلم مشروع، أول مسؤولية عندك: تتأكد إن الفريق والمجلس التنفيذي فاهمين نفس الخطة اللي إنت فاهمها — مش بس شايفينها.

هتقابل فريقك لأول مرة في الوحدة دي. أول شخصية هتتعرف عليها: Sarah — Senior Developer. زي أي علاقة مهنية حقيقية، الانطباع الأول مش نهائي، لكنه بيحدد نقطة البداية. القرارات اللي هتاخدها في اللقاء ده هتبدأ تسجّل في Entity Memory — نظام بيتذكر تفاعلك مع كل شخصية عبر كل الوحدات لحد Final Boss، مش بيبدأ من الصفر كل مرة. مبادئ أول لقاء بقيادة فعّالة: (1) اسمع قبل ما تتكلم. (2) كن شفاف عن حدود الخطة. (3) وضّح دورك، مش سلطتك.

المجلس التنفيذي مش راعي واحد زي مستوى 2 — دلوقتي 5 أعضاء، كل واحد بيشوف المشروع من زاوية مختلفة تمامًا: CEO (القيمة الاستراتيجية طويلة الأجل)، CFO (التكلفة والعائد المالي)، CTO (الجودة والابتكار التقني)، Sponsor (تحقيق أهداف المشروع)، Ops Director (الاستمرارية والكفاءة). النقطة الأهم: مفيش عرض واحد يرضي الخمسة. مهمتك مش تقنعهم كلهم إن الخطة مثالية — مهمتك تدير التوقعات المتضاربة بوضوح، وتوضح إيه اللي هتقدّمه الأول وليه.

نقاط قواعدية: 1) التسليم الناجح = نقل السياق، مش بس المستندات. 2) أول انطباع مع أي شخصية بيحدد نقطة بداية، مش نتيجة نهائية. 3) الشفافية عن حدود الخطة أهم من الثقة الزايدة. 4) مجلس متعدد الأعضاء = توقعات متضاربة بالتصميم، مش استثناء. 5) إدارة التوقعات المتضاربة أهم مهارة قيادية في هذه المرحلة. 6) وضّح الأولويات اللي هتبدأ بيها فورًا، مش كل حاجة سوا. 7) القرارات في هذه الوحدة بتبني رصيد ثقة/احترام حقيقي يتراكم لاحقًا. 8) الاستماع الفعّال في أول لقاء يوفّر وقت تصحيح أكتر بكتير لاحقًا.'
      )
    )
  );

  raise notice '066 OK: Level 3 course % created with Unit 0 / Lesson 0.1 + Sarah and Board decision scenarios planted', v_course_id;
end $$;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_course_id uuid;
  v_modules int;
  v_lessons int;
  v_lesson_id uuid;
  v_review_status text;
  v_scenarios int;
  v_fn int;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '066 failed: Level 3 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 1 then
    raise exception '066 failed: expected 1 module (Unit 0), found %', v_modules;
  end if;

  select l.id, count(*) over (), l.review_status into v_lesson_id, v_lessons, v_review_status
    from public.lessons l join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 1 then
    raise exception '066 failed: expected 1 lesson (0.1), found %', v_lessons;
  end if;
  if v_review_status <> 'approved' then
    raise exception '066 failed: lesson review_status expected ''approved'', found %', v_review_status;
  end if;

  select jsonb_array_length(content -> 'entity_decisions') into v_scenarios
    from public.lessons where id = v_lesson_id;
  if v_scenarios <> 2 then
    raise exception '066 failed: expected 2 entity_decisions scenarios (Sarah + Board), found %', v_scenarios;
  end if;

  select count(*) into v_fn from pg_proc where proname = 'submit_lesson_entity_decision';
  if v_fn <> 1 then
    raise exception '066 failed: submit_lesson_entity_decision() not found';
  end if;

  raise notice '066 OK: 1 module, 1 lesson (approved), 2 entity-decision scenarios, submit_lesson_entity_decision() installed. Course %', v_course_id;
end $$;
