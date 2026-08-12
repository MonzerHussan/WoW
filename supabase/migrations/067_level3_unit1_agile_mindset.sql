-- ============================================================
-- WOW - World of Work — Migration 067
-- Level 3 content, part 2 — two things:
--
-- A) A REAL BUG FIX in submit_lesson_entity_decision() (066): the
-- owner's approved design for the Executive Board scenario was "one
-- entity PER board member (character: ceo/cfo/cto/sponsor/
-- ops_director) plus a separate effect on organization.
-- planning_maturity" — but 066's function only ever applied ONE
-- choice's delta to ONE scenario-level entity, so the board scenario's
-- choices ended up jamming ceo_trust/cfo_trust/cto_trust as different
-- KEYS inside a single entity_type='organization' row instead of five
-- separate character entities. Live-testing 066 itself surfaced this
-- exact shape in its own output but it wasn't connected to the
-- approved design until writing this file. Fixed by adding an
-- OPTIONAL `extra_deltas` array to a choice — the scenario-level
-- entity_type/entity_key (used untouched by every existing Sarah
-- scenario) stays the PRIMARY entity, and extra_deltas lets one choice
-- also nudge any number of OTHER entities. Backward compatible: no
-- existing scenario needs its shape changed except the one that was
-- actually wrong.
--
-- The Unit 0 lesson's `content` is UPDATED in place (not a new lesson)
-- to correct the Board scenario's choices to the approved shape — this
-- is a direct data correction on already-live content, the same class
-- of fix as 018/050/061's own self-check bug fixes: nothing published
-- to real learners depended on the wrong shape (only this session's
-- own disposable test accounts touched it), so there is no live
-- learner data being invalidated.
--
-- B) Level 3, Unit 1 — "Agile Mindset & Scrum Leadership" (5 hours),
-- content authored by the owner directly. Both of its decision
-- scenarios are entity_type='character'/entity_key='sarah' — the exact
-- same convention as Unit 0, confirmed against 066 before writing this
-- (not guessed) per the owner's own explicit request to verify.
-- ============================================================

-- ------------------------------------------------------------
-- A1. submit_lesson_entity_decision — add extra_deltas support.
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
  v_extra jsonb;
  v_extra_item jsonb;
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

  -- Primary entity (scenario-level) — skipped if this specific choice
  -- has no effect on it (e.g. a board-briefing choice that only moves
  -- individual members, not the org's own planning_maturity).
  if v_delta is not null and v_delta <> '{}'::jsonb then
    v_result := public.apply_entity_memory_event(
      v_uid, v_entity_type, v_entity_key,
      'lesson:' || p_lesson_id::text || ':' || p_scenario_key,
      v_delta, p_choice_key,
      v_choice ->> 'feedback_ar', v_choice ->> 'feedback_en'
    );
  end if;

  -- Secondary entities this same choice also affects (e.g. individual
  -- board members alongside the org's aggregate metric) — lets one
  -- authored decision move more than one entity_memory row, per the
  -- owner's confirmed hybrid design for the Executive Board.
  v_extra := v_choice -> 'extra_deltas';
  if v_extra is not null then
    for v_extra_item in select * from jsonb_array_elements(v_extra)
    loop
      perform public.apply_entity_memory_event(
        v_uid,
        v_extra_item ->> 'entity_type',
        v_extra_item ->> 'entity_key',
        'lesson:' || p_lesson_id::text || ':' || p_scenario_key,
        v_extra_item -> 'delta',
        p_choice_key,
        null, null
      );
    end loop;
  end if;

  return jsonb_build_object(
    'submitted', true,
    'entityType', v_entity_type,
    'entityKey', v_entity_key,
    'state', coalesce(v_result -> 'state', '{}'::jsonb),
    'feedbackAr', v_choice ->> 'feedback_ar',
    'feedbackEn', v_choice ->> 'feedback_en'
  );
end;
$$;

-- ------------------------------------------------------------
-- A2. Correct Unit 0's Board scenario to the approved per-member shape.
-- ------------------------------------------------------------
update public.lessons
   set content = jsonb_set(
     content,
     '{entity_decisions}',
     jsonb_build_array(
       content -> 'entity_decisions' -> 0,  -- Sarah scenario, untouched
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
             'delta', jsonb_build_object('org_planning_maturity', 5),
             'extra_deltas', jsonb_build_array(
               jsonb_build_object('entity_type', 'character', 'entity_key', 'ceo', 'delta', jsonb_build_object('trust', 8)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', 8))
             ),
             'feedback_ar', 'الأفضل: ملخص مركَّز بيرضي مين محتاج القرار الاستراتيجي بسرعة (CEO وSponsor) وبيعكس نضج تخطيطي حقيقي — بالظبط "وضّح الأولويات اللي هتبدأ بيها فورًا، مش كل حاجة سوا".',
             'feedback_en', 'Best: a focused summary satisfies whoever needs the strategic call fast (CEO and Sponsor) and reflects real planning maturity — exactly "clarify your immediate priorities, not everything at once."'
           ),
           jsonb_build_object(
             'key', 'B',
             'label_ar', 'تفاصيل تقنية كاملة عن الـWBS.',
             'label_en', 'Full technical WBS detail.',
             'extra_deltas', jsonb_build_array(
               jsonb_build_object('entity_type', 'character', 'entity_key', 'cto', 'delta', jsonb_build_object('trust', 8)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'cfo', 'delta', jsonb_build_object('trust', -5)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'ceo', 'delta', jsonb_build_object('trust', -5))
             ),
             'feedback_ar', 'جزئي: بيرضي CTO لكن بيضيّع وقت الـCFO والـCEO في 10 دقائق مفروض تتصرف فيها بذكاء — "مجلس متعدد الأعضاء = توقعات متضاربة بالتصميم".',
             'feedback_en', 'Partial: satisfies the CTO but wastes CFO/CEO time in a 10-minute slot meant to be spent wisely — "a multi-member board means conflicting expectations by design."'
           ),
           jsonb_build_object(
             'key', 'C',
             'label_ar', 'تركيز كامل على التكلفة والميزانية.',
             'label_en', 'Full focus on cost and budget.',
             'extra_deltas', jsonb_build_array(
               jsonb_build_object('entity_type', 'character', 'entity_key', 'cfo', 'delta', jsonb_build_object('trust', 8)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'cto', 'delta', jsonb_build_object('trust', -5))
             ),
             'feedback_ar', 'جزئي: بيرضي CFO لكن بيتجاهل الجودة والابتكار اللي CTO بيقيسه — نفس مشكلة "مفيش عرض واحد يرضي الخمسة".',
             'feedback_en', 'Partial: satisfies the CFO but ignores the quality/innovation lens the CTO measures — the same "no single pitch satisfies all five" problem.'
           ),
           jsonb_build_object(
             'key', 'D',
             'label_ar', 'اعتذار عن نقص الوقت وتأجيل العرض.',
             'label_en', 'Apologize for the time constraint and postpone the presentation.',
             'delta', jsonb_build_object('org_planning_maturity', -4),
             'extra_deltas', jsonb_build_array(
               jsonb_build_object('entity_type', 'character', 'entity_key', 'ceo', 'delta', jsonb_build_object('trust', -4)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'cfo', 'delta', jsonb_build_object('trust', -4)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'cto', 'delta', jsonb_build_object('trust', -4)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', -4)),
               jsonb_build_object('entity_type', 'character', 'entity_key', 'ops_director', 'delta', jsonb_build_object('trust', -4))
             ),
             'feedback_ar', 'الأسوأ: أضاع الفرصة على الخمسة أعضاء مع بعض، وبيوحي بعدم استعداد فعلي — عكس "التسليم الناجح = نقل السياق، مش بس المستندات".',
             'feedback_en', 'Worst: wastes the opportunity with all five members at once, and signals real unpreparedness — the opposite of "a successful handoff means transferring context, not just documents."'
           )
         )
       )
     )
   )
 where title = 'Lesson 0.1: Delivery Kickoff';

-- ------------------------------------------------------------
-- B. Level 3, Unit 1 — Agile Mindset & Scrum Leadership
-- ------------------------------------------------------------
do $$
declare
  v_course_id uuid;
  v_mod1 uuid := uuid_generate_v4();
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '067 failed: Level 3 course not found — run 066 first';
  end if;

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod1, v_course_id, 'Unit 1: Agile Mindset & Scrum Leadership', 1);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod1, 'Lesson 1.1: Agile Mindset & Scrum Leadership', 1, 300, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'sprint_blocker',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'situation_ar', 'Sarah جت لك في نص الـSprint: "إحنا عالقين — الـAPI اللي الفريق التاني وعدنا بيه لسه مش جاهز، وده بيوقف شغلنا."',
          'situation_en', 'Sarah comes to you mid-sprint: "We''re stuck — the API the other team promised isn''t ready, and it''s blocking our work."',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'إيه اللي محتاجينه مني عشان أشيل العائق ده؟ أنا هكلم الفريق التاني دلوقتي.',
              'label_en', 'What do you need from me to remove this obstacle? I''ll talk to the other team right now.',
              'delta', jsonb_build_object('trust', 8, 'respect', 6),
              'feedback_ar', 'الأفضل: قيادة خادمة حقيقية — بتشيل العائق التنظيمي وتسيب الفريق يحل المشكلة التقنية بنفسه، بالظبط "القائد الخادم بيشيل العوائق، مش بيحل كل مشكلة بنفسه".',
              'feedback_en', 'Best: real servant leadership — you clear the organizational blocker and let the team solve the technical problem itself, exactly "a servant leader removes obstacles, not solves every problem personally."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'خدوا حل بديل مؤقت وكملوا، هحلها لوحدي بعدين.',
              'label_en', 'Use a temporary workaround and keep going, I''ll fix it myself later.',
              'delta', jsonb_build_object('trust', 2, 'cooperation', -3),
              'feedback_ar', 'نية طيبة، تنفيذ ناقص: بتحل المشكلة بدل ما تمكّن الفريق، وده بيقلّل التعاون حتى لو الثقة اتحسّنت شوية — عكس جزئي للقيادة الخادمة.',
              'feedback_en', 'Good intent, incomplete execution: you solve it instead of enabling the team, which lowers cooperation even though trust ticks up slightly — a partial reversal of servant leadership.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'ده مش مشكلتي، اتفاهموا إنتوا مع الفريق التاني.',
              'label_en', 'That''s not my problem, sort it out with the other team yourselves.',
              'delta', jsonb_build_object('trust', -7, 'respect', -6),
              'feedback_ar', 'الأسوأ تقريبًا: تخلّي كامل عن دور إزالة العوائق — بالظبط عكس أساس القيادة الخادمة.',
              'feedback_en', 'Nearly worst: a total abdication of the obstacle-removal role — the direct opposite of servant leadership''s foundation.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تجاهل الموضوع لحد اجتماع الأسبوع الجاي.',
              'label_en', 'Ignore it until next week''s meeting.',
              'delta', jsonb_build_object('trust', -6, 'stress', 8),
              'feedback_ar', 'ضعيف: تأخير غير ضروري لعائق فعلي بيوقف شغل الفريق — بيزوّد التوتر بلا داعي بدل ما يتحل بسرعة.',
              'feedback_en', 'Weak: an unnecessary delay on a real blocker stopping the team''s work — raises stress for no reason instead of resolving it quickly.'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'daily_became_status_report',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'situation_ar', 'لاحظت إن الفريق في الـDaily بقى بيتكلم معاك إنت بس ("خلّصت X، هعمل Y")، مش مع بعض. تتصرف إزاي؟',
          'situation_en', 'You notice the team''s Daily Standup has become reports to you only, not to each other. What do you do?',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'تعيد صياغة الاجتماع بسؤال مباشر: "مين محتاج مساعدة من حد في الفريق؟"',
              'label_en', 'Reframe the meeting with a direct question: "Who needs help from someone on the team?"',
              'delta', jsonb_build_object('cooperation', 8, 'respect', 5),
              'feedback_ar', 'الأفضل: بيعيد توجيه الـDaily للغرض الحقيقي منها — تعاون بين الفريق، مش تقرير حالة للمدير — بالظبط "Daily Standup اللي بيتحول لتقرير حالة للمدير فقد الغرض منه".',
              'feedback_en', 'Best: redirects the Daily back to its real purpose — team collaboration, not a manager status report — exactly "a Daily Standup that becomes a manager status report has lost its purpose."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تسيب الوضع زي ما هو، المهم المعلومة بتوصلك.',
              'label_en', 'Leave it as is, what matters is that the information reaches you.',
              'delta', jsonb_build_object('cooperation', -4),
              'feedback_ar', 'ضعيف: قبول صامت لاجتماع فقد غرضه — الفريق لسه بيتكلم معاك إنت بس، مش مع بعض.',
              'feedback_en', 'Weak: silent acceptance of a meeting that lost its purpose — the team still talks to you only, not to each other.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'تلغي الـDaily خالص لأنها "بقت شكلية".',
              'label_en', 'Cancel the Daily entirely because it "became formal theater."',
              'delta', jsonb_build_object('cooperation', -6, 'planning_maturity', -3),
              'feedback_ar', 'أسوأ من تركه: إلغاء الأداة بدل إصلاح استخدامها بيفقد الفريق أي تزامن يومي، وبيقلّل النضج التخطيطي مش يزوّده.',
              'feedback_en', 'Worse than leaving it: cancelling the tool instead of fixing how it''s used loses the team any daily sync at all, and lowers planning maturity instead of raising it.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تطلب تقرير مكتوب بدل الاجتماع الشفهي.',
              'label_en', 'Request a written report instead of the verbal meeting.',
              'delta', jsonb_build_object('cooperation', -8, 'trust', -3),
              'feedback_ar', 'الأسوأ: بيستبدل التعاون الحي بتقرير كتابي — تعميق للمشكلة (مراقبة) مش حل ليها.',
              'feedback_en', 'Worst: replaces live collaboration with a written report — deepens the actual problem (surveillance) instead of solving it.'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Agile Mindset & Scrum Leadership',
        'body', 'In Module 0 you met your team and board. Now: how will you lead them day to day? This module is about the transformation most often skipped in becoming an agile leader: it''s not learning Scrum tools (Sprint, Daily Standup, Retrospective) — those take an hour to learn. The hard part is the mindset shift from "I assign tasks and monitor execution" to "I''m here to remove obstacles for a team capable of managing itself."

Four Agile Manifesto values summarize the core difference: individuals & interactions over processes & tools — a short, real Daily beats a detailed Jira report nobody reads; working software over comprehensive documentation — a working first draft of a feature clarifies more than 20 pages of specs; customer collaboration over contract negotiation — a weekly update with the stakeholder matters more than a rigid, unchanging "scope sign-off"; responding to change over following a rigid plan — a Sprint plan that changed because of new information is a success, not a commitment failure.

The common trap: much "agile transformation" in companies is cosmetic — Daily Standup becomes a daily status report to the manager (surveillance, not collaboration), Sprint Planning becomes top-down task assignment. You''re doing Scrum but not actually agile if every decision still runs through you alone.

"Servant Leadership" (Robert Greenleaf) inverts the traditional authority pyramid: the leader isn''t at the top directing those below — the leader is at the base, supporting the team that delivers actual value. As a Scrum Master (or agile team leader), your core job: (1) remove obstacles — not solve the technical problem yourself, but clear organizational blockers preventing the team from solving it; (2) protect the team''s time from excess meetings and outside interruptions; (3) ask questions, not dictate answers — "what do you think we should do?" instead of "do this"; (4) celebrate fast failure — an experiment that failed in a Sprint and taught the team something is a win, not a punishment. The real difference in a practical situation: the team hits a technical blocker mid-sprint. A traditional manager says "use the workaround I mentioned from the start." A servant leader asks "what do you need from me to solve this yourselves?"

Rule points: 1) Performing Scrum rituals without a mindset shift is theater, not real agile transformation. 2) The four Manifesto values aren''t rejecting process/documentation — they''re a priority order, not elimination. 3) A servant leader removes obstacles, not solves every problem personally. 4) Asking the team "what do you think?" builds stronger real ownership than any direct order. 5) A Daily Standup that becomes a manager status report has lost its purpose. 6) Changing in response to new information is agile success, not a plan violation. 7) Celebrating fast, learned-from failure builds a safe experimentation culture. 8) Protecting the team''s time from interruptions is core leadership, not a side detail.'
      ),
      'ar', jsonb_build_object(
        'title', 'العقلية الرشيقة وقيادة Scrum',
        'body', 'في الوحدة 0 قابلت فريقك ومجلسك التنفيذي. دلوقتي السؤال: هتقودهم إزاي يوم بيوم؟ الوحدة دي بتتكلم عن أكتر تحوّل يتم تجاهله في تحول أي مدير مشروع لقائد رشيق: مش تعلّم أدوات Scrum (Sprint، Daily Standup، Retrospective) — دي سهلة تتعلّمها في ساعة. الصعب هو تحوّل العقلية من "أنا اللي بوزّع المهام وبراقب التنفيذ" لـ"أنا هنا عشان أشيل العوائق من قدام فريق قادر يدير نفسه".

أربع قيم من بيان أجايل بتلخّص الفرق الجوهري: الأفراد والتفاعلات فوق العمليات والأدوات — اجتماع Daily قصير حقيقي أهم من تقرير Jira مفصّل محدش هيقراه؛ البرنامج الشغّال فوق التوثيق الشامل — نسخة أولية شغّالة من ميزة بتوضّح أكتر من 20 صفحة مواصفات؛ التعاون مع العميل فوق التفاوض على العقد — تحديث أسبوعي مع صاحب المصلحة أهم من "توقيع نطاق" جامد لا يتغيّر؛ الاستجابة للتغيير فوق اتباع خطة ثابتة — خطة Sprint اتغيّرت بسبب معلومة جديدة = نجاح، مش فشل في الالتزام.

الفخ الشائع: كتير من "التحول الرشيق" في الشركات بيكون شكلي — Daily Standup بيتحول لتقرير حالة يومي للمدير (رقابة، مش تعاون)، Sprint Planning بيتحول لتوزيع مهام من فوق لتحت. أنت تعمل Scrum لكنك مش رشيق فعليًا لو القرارات لسه كلها بتتاخد من عندك لوحدك.

مصطلح "Servant Leadership" (روبرت جرينليف) بيقلب هرم السلطة التقليدي: القائد مش في القمة بيوجّه للي تحته — القائد في القاعدة بيدعم الفريق اللي بيسلّم القيمة الفعلية. كـScrum Master (أو قائد فريق رشيق)، شغلك الأساسي: (1) يشيل العوائق — مش يحل المشكلة التقنية بنفسه، لكن يشيل أي حاجز تنظيمي بيمنع الفريق من حلها هو؛ (2) يحمي وقت الفريق من الاجتماعات الزايدة والمقاطعات الخارجية؛ (3) يسأل أسئلة، مش يملي إجابات — "إيه رأيكم إحنا نعمل إيه؟" بدل "اعملوا كده"؛ (4) يحتفل بالفشل السريع — تجربة فشلت في Sprint وعلّمت الفريق حاجة = نجاح، مش لازم عقاب. الفرق الحقيقي في موقف عملي: الفريق واجه عائق تقني نص الـSprint. مدير تقليدي: "استخدموا الحل البديل اللي قلته من الأول". قائد خادم: "إيه اللي محتاجينه مني عشان تحلوها إنتم؟"

نقاط قواعدية: 1) عمل طقوس Scrum بلا تغيير في العقلية = مسرحية، مش تحول رشيق حقيقي. 2) القيمة الأربعة في بيان أجايل مش رفض للعمليات/التوثيق — هي أولوية، مش إلغاء. 3) القائد الخادم بيشيل العوائق، مش بيحل كل مشكلة بنفسه. 4) سؤال الفريق "إيه رأيكم؟" بيبني ملكية حقيقية أقوى من أي أمر مباشر. 5) Daily Standup اللي بيتحول لتقرير حالة للمدير فقد الغرض منه. 6) التغيير استجابةً لمعلومة جديدة نجاح في الرشاقة، مش خرق للخطة. 7) الاحتفال بالفشل السريع المتعلَّم منه يبني ثقافة تجربة آمنة. 8) حماية وقت الفريق من المقاطعات جزء من دور القيادة، مش تفصيل ثانوي.'
      )
    )
  );

  raise notice '067 OK: Unit 0 board scenario corrected to per-member entities + Unit 1 module/lesson planted';
end $$;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_course_id uuid;
  v_unit0_lesson_id uuid;
  v_board_choice_a jsonb;
  v_extra_count int;
  v_unit1_module_id uuid;
  v_unit1_lesson_id uuid;
  v_unit1_scenarios int;
  v_fn_def text;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '067 failed: Level 3 course not found';
  end if;

  select id into v_unit0_lesson_id from public.lessons where title = 'Lesson 0.1: Delivery Kickoff';
  select c into v_board_choice_a
    from public.lessons l,
         jsonb_array_elements(l.content -> 'entity_decisions') s,
         jsonb_array_elements(s -> 'choices') c
   where l.id = v_unit0_lesson_id
     and s ->> 'scenario_key' = 'board_first_briefing'
     and c ->> 'key' = 'A';
  if v_board_choice_a is null then
    raise exception '067 failed: board_first_briefing choice A not found after correction';
  end if;
  select jsonb_array_length(v_board_choice_a -> 'extra_deltas') into v_extra_count;
  if v_extra_count <> 2 then
    raise exception '067 failed: expected 2 extra_deltas on board choice A (ceo, sponsor), found %', v_extra_count;
  end if;

  select pg_get_functiondef(oid) into v_fn_def
    from pg_proc where proname = 'submit_lesson_entity_decision';
  if v_fn_def not ilike '%extra_deltas%' then
    raise exception '067 failed: submit_lesson_entity_decision() does not reference extra_deltas';
  end if;

  select id into v_unit1_module_id from public.modules
   where course_id = v_course_id and title = 'Unit 1: Agile Mindset & Scrum Leadership';
  if v_unit1_module_id is null then
    raise exception '067 failed: Unit 1 module not found';
  end if;

  select id into v_unit1_lesson_id from public.lessons where module_id = v_unit1_module_id;
  if v_unit1_lesson_id is null then
    raise exception '067 failed: Unit 1 lesson not found';
  end if;

  select jsonb_array_length(content -> 'entity_decisions') into v_unit1_scenarios
    from public.lessons where id = v_unit1_lesson_id;
  if v_unit1_scenarios <> 2 then
    raise exception '067 failed: expected 2 entity_decisions scenarios in Unit 1, found %', v_unit1_scenarios;
  end if;

  raise notice '067 OK: Unit 0 board scenario now uses per-member entities (extra_deltas), Unit 1 module/lesson with 2 Sarah scenarios planted.';
end $$;
