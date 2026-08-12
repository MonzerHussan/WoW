-- ============================================================
-- WOW - World of Work — Migration 070
-- Level 3, Unit 4 — "Stakeholder Communication" (6 hours), content
-- authored by the owner directly. Also builds the FIRST real bridge
-- between lesson-embedded Entity Memory decisions and `decision_log`
-- (037, Living Project) — confirmed by direct code inspection before
-- writing this that no such bridge existed before now (submit_lesson_
-- entity_decision, 066/067, only ever wrote to lesson_entity_decisions
-- and entity_memory_*; the owner's own phrase describing this as
-- "already working since Module 0" was a real, corrected misconception,
-- not something to silently build around).
--
-- Design (owner-approved): a per-scenario `log_decision: true` flag,
-- opt-in, not retroactive to every scenario. Scope explicitly decided
-- by the owner: Unit 2's two scenarios (board pressure during
-- planning, mid-sprint scope request — real project trade-off
-- decisions) AND this unit's two scenarios get the flag; Units 0, 1,
-- 3 (relationship/EI-building scenarios, not project decisions) do
-- NOT. Unit 2's own lesson content is patched with a small, targeted
-- jsonb_set touching only the new flag — its actual pedagogical
-- content (§1-5, both scenarios' text/deltas/feedback) is untouched.
--
-- decision_log has no AR/EN split (037's schema: plain `situation`/
-- `decision`/`reason` text) — writes use the _ar fields, matching this
-- project's existing decision_log content convention (the reflection-
-- form write path has always stored the Arabic text a learner typed).
-- project_id is resolved the same way render_narrative_document (065)
-- already does: the learner's most recently created project. A
-- learner with no Living Project yet simply doesn't get a decision_log
-- row — the Entity Memory side of the decision still succeeds either
-- way; a missing project must never block a lesson decision.
-- ============================================================

-- ------------------------------------------------------------
-- A. submit_lesson_entity_decision — add decision_log bridge.
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
  v_project_id uuid;
  v_logged boolean := false;
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

  if v_delta is not null and v_delta <> '{}'::jsonb then
    v_result := public.apply_entity_memory_event(
      v_uid, v_entity_type, v_entity_key,
      'lesson:' || p_lesson_id::text || ':' || p_scenario_key,
      v_delta, p_choice_key,
      v_choice ->> 'feedback_ar', v_choice ->> 'feedback_en'
    );
  end if;

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

  if coalesce((v_scenario ->> 'log_decision')::boolean, false) then
    select id into v_project_id from public.projects
     where owner_id = v_uid order by created_at desc limit 1;

    if v_project_id is not null then
      insert into public.decision_log (project_id, situation, decision, reason, category)
      values (
        v_project_id,
        v_scenario ->> 'situation_ar',
        v_choice ->> 'label_ar',
        coalesce(v_choice ->> 'feedback_ar', ''),
        p_scenario_key
      );
      v_logged := true;
    end if;
  end if;

  return jsonb_build_object(
    'submitted', true,
    'entityType', v_entity_type,
    'entityKey', v_entity_key,
    'state', coalesce(v_result -> 'state', '{}'::jsonb),
    'feedbackAr', v_choice ->> 'feedback_ar',
    'feedbackEn', v_choice ->> 'feedback_en',
    'loggedToDecisionLog', v_logged
  );
end;
$$;

-- ------------------------------------------------------------
-- B. Small, targeted patch: flag Unit 2's two existing scenarios as
-- decision-log-worthy — content/deltas/feedback untouched.
-- ------------------------------------------------------------
update public.lessons
   set content = jsonb_set(
     content,
     '{entity_decisions}',
     (
       select jsonb_agg(
         case when s ->> 'scenario_key' in ('board_pressure_during_planning', 'mid_sprint_scope_request')
              then jsonb_set(s, '{log_decision}', 'true'::jsonb, true)
              else s
         end
       )
       from jsonb_array_elements(content -> 'entity_decisions') s
     )
   )
 where title = 'Lesson 2.1: Sprint Planning & Execution';

-- ------------------------------------------------------------
-- C. Level 3, Unit 4 — Stakeholder Communication
-- ------------------------------------------------------------
do $$
declare
  v_course_id uuid;
  v_mod4 uuid := uuid_generate_v4();
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '070 failed: Level 3 course not found — run 066-069 first';
  end if;

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod4, v_course_id, 'Unit 4: Stakeholder Communication', 4);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod4, 'Lesson 4.1: Stakeholder Communication', 1, 360, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'bad_news_to_board',
          'entity_type', 'character',
          'entity_key', 'ceo',
          'log_decision', true,
          'situation_ar', 'مخاطرة كانت في سجل مستوى 2 تحققت فعليًا — تأخير أسبوعين متوقع. لازم تبلّغ المجلس.',
          'situation_en', 'A risk from the Level 2 register has materialized — a two-week delay is now expected. You must inform the board.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'تبلّغهم فورًا بوضوح: "المخاطرة X تحققت، الأثر أسبوعين، وده خطة التخفيف."',
              'label_en', 'Inform them immediately and clearly: "Risk X materialized, the impact is two weeks, and here''s the mitigation plan."',
              'delta', jsonb_build_object('trust', 7),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', 8))
              ),
              'feedback_ar', 'الأفضل: بلاغ واضح وفوري مع خطة تخفيف — بالظبط "الأخبار السيئة لازم توصل واضحة، مش مصفّاة لتبان أحسن مما هي".',
              'feedback_en', 'Best: a clear, immediate report with a mitigation plan — exactly "bad news must arrive clear, not filtered to look better than it is."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تستنى لحد الاجتماع الدوري القادم عشان "ماتزعجهمش دلوقتي".',
              'label_en', 'Wait for the next regular meeting so as not to "worry them right now."',
              'delta', jsonb_build_object('trust', -5),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', -6))
              ),
              'feedback_ar', 'ضعيف: تأخير بلاغ مخاطرة متحققة بيقلل وقت رد الفعل المتاح للمجلس، وبيوحي بإخفاء غير مقصود.',
              'feedback_en', 'Weak: delaying a materialized-risk report shrinks the board''s available reaction time, and suggests unintentional concealment.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'تبلّغهم لكن تقلّل من حجم الأثر ("أسبوع بس تقريبًا، مش مؤكد").',
              'label_en', 'Inform them but downplay the impact ("just about a week, not confirmed").',
              'delta', jsonb_build_object('trust', -8),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', -8))
              ),
              'feedback_ar', 'الأسوأ تقريبًا: تصفية الخبر ليبان أحسن تلاعب مباشر بالمعلومة — عكس "الأخبار السيئة لازم توصل واضحة".',
              'feedback_en', 'Nearly worst: filtering the news to look better is direct manipulation of the information — the opposite of "bad news must arrive clear."'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تنتظر يسألوا هم بنفسهم قبل ما تقول حاجة.',
              'label_en', 'Wait for them to ask before you say anything.',
              'delta', jsonb_build_object('trust', -9),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', -7))
              ),
              'feedback_ar', 'الأسوأ: صمت كامل عن مخاطرة متحققة بيدمّر الثقة بشكل كامل لما يكتشفوا إنك كنت عارف ومقلتش.',
              'feedback_en', 'Worst: total silence on a materialized risk destroys trust completely once they discover you knew and said nothing.'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'cfo_cto_conflict',
          'entity_type', 'character',
          'entity_key', 'cfo',
          'log_decision', true,
          'situation_ar', 'CFO عايز تقليل تكلفة 15%. CTO عايز استثمار إضافي في الجودة التقنية. الاتنين بيضغطوا في نفس الاجتماع.',
          'situation_en', 'The CFO wants a 15% cost cut. The CTO wants additional investment in technical quality. Both push in the same meeting.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'القيد الحقيقي هو الميزانية المتبقية. خلونا نحدد سوا: إيه بند التكلفة اللي أقل تأثيرًا على الجودة الحرجة؟',
              'label_en', 'The real constraint is the remaining budget. Let''s identify together: which cost item has the least impact on critical quality?',
              'delta', jsonb_build_object('trust', 6),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cto', 'delta', jsonb_build_object('trust', 6)),
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', 5))
              ),
              'feedback_ar', 'الأفضل: تحديد القيد الحقيقي والسؤال المباشر عن الأولوية — بالظبط "حدد القيد الحقيقي... اسأل عن الأولوية الحقيقية بدل ما تفترضها".',
              'feedback_en', 'Best: identifying the real constraint and directly asking about priority — exactly "identify the real constraint... ask about the real priority instead of assuming it."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'توافق على تقليل التكلفة فورًا عشان CFO أعلى سلطة مالية.',
              'label_en', 'Agree to the cost cut immediately because the CFO has higher financial authority.',
              'delta', jsonb_build_object('trust', 7),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cto', 'delta', jsonb_build_object('trust', -8))
              ),
              'feedback_ar', 'ضعيف: قرار بالسلطة مش بالمنطق — بيرضي طرف واحد فورًا ويكسر ثقة التاني بلا نقاش حقيقي للقيد الفعلي.',
              'feedback_en', 'Weak: deciding by authority, not reasoning — satisfies one side immediately and breaks the other''s trust with no real discussion of the actual constraint.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'توعد الاتنين بإرضائهم بالكامل بلا تفاصيل ("هنشوف حل يريحكم").',
              'label_en', 'Promise both you''ll satisfy them fully with no details ("we''ll find something that works for you").',
              'delta', jsonb_build_object('trust', -4),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cto', 'delta', jsonb_build_object('trust', -4))
              ),
              'feedback_ar', 'الأسوأ: وعد غامض بلا مقايضة واضحة — بالظبط "حل وسط غامض بيرضي محدش فعليًا".',
              'feedback_en', 'Worst: a vague promise with no clear trade-off — exactly "a vague compromise satisfies no one."'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تأجل القرار بلا موعد محدد.',
              'label_en', 'Postpone the decision with no set date.',
              'delta', jsonb_build_object('trust', -6),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cto', 'delta', jsonb_build_object('trust', -6)),
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -3))
              ),
              'feedback_ar', 'ضعيف: تأجيل بلا موعد بيسيب القيد الحقيقي بلا حل ويقلّل النضج التخطيطي — عكس مبدأ حسم القيد بدري.',
              'feedback_en', 'Weak: an open-ended postponement leaves the real constraint unresolved and lowers planning maturity — the opposite of resolving the constraint early.'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Stakeholder Communication',
        'body', 'In Module 0 you introduced yourself to the board. Now the harder question: how do you communicate with them continuously, especially when the news isn''t all good? And when two of them want contradictory things at once? This module covers two linked skills: communicating with different stakeholders, and negotiating when their interests collide.

The same status update must reach each board member framed differently — not because you''re hiding anything, but because each is asking a different question about the same reality: the CEO asks "how does this affect long-term strategy?" (link the update to the big strategic goal); the CFO asks "what will this cost, and do we stay on budget?" (numbers, plan variance, direct financial impact); the CTO asks "is the technical solution sound and sustainable?" (enough quality/architecture detail to make a technical judgment); the Sponsor asks "will the project still achieve the goal we agreed on?" (direct link to the charter''s approved objectives); the Ops Director asks "how does this affect ongoing operations?" (operational impact, delivery schedule, continuity). This is not manipulation: the underlying content (the truth) is one and the same for all five. The difference is framing — which angle helps each person understand the same fact''s impact on their priority. It becomes manipulation only if you change the underlying facts per person; it''s effective communication if you only change the lens.

When two board members want contradictory things (e.g., CFO wants cost reduction, CTO wants extra quality investment), the worst response is a vague compromise that satisfies no one. Better: identify the real constraint ("budget is X, time is Y — what mix is actually feasible?"), offer the trade-off explicitly ("10% more quality investment means either two extra weeks or cutting scope elsewhere" — clear options, not an impossible promise to please everyone), and ask "what constraint actually matters most?" instead of assuming.

Every negotiation or communication decision you make here must be logged as it happens, not reconstructed from memory at project end. A good decision log entry contains: the situation that prompted it, the decision itself, the reasoning, and the alternatives considered and rejected, and why. This decision log isn''t bureaucracy — it''s the source the final Decision Log report is built from, and it''s what shows your thinking process as a leader to anyone reviewing your performance later.

Rule points: 1) Changing the frame per listener is effective communication; changing the underlying facts is manipulation. 2) A vague compromise satisfies no one — an explicit trade-off is clearer and more honest. 3) Identify the real constraint (time/cost/scope) before trying to reconcile two interests. 4) Ask about the real priority instead of assuming it on others'' behalf. 5) Log a decision as it happens, not weeks later from memory. 6) The reasoning behind a decision matters more than its outcome to anyone reviewing it later. 7) Bad news must arrive clear, not "filtered" to look better than it is. 8) Successful negotiation leaves both sides feeling heard, even if neither got everything they wanted.'
      ),
      'ar', jsonb_build_object(
        'title', 'التواصل مع أصحاب المصلحة',
        'body', 'في الوحدة 0 قدّمت نفسك للمجلس. دلوقتي السؤال الأصعب: إزاي تكلّمهم باستمرار، خصوصًا لما الأخبار مش كلها كويسة؟ ولما اتنين منهم عايزين حاجتين متعارضتين في نفس الوقت؟ الوحدة دي عن مهارتين مترابطتين: التواصل مع أصحاب مصلحة مختلفين، والتفاوض لما مصالحهم تتصادم.

نفس تحديث الحالة لازم يوصل لكل عضو مجلس بصياغة مختلفة، مش لأنك بتخفي حاجة، لكن لأن كل واحد بيسأل سؤال مختلف عن نفس الواقع: CEO — "ده بيأثر على الاستراتيجية طويلة المدى إزاي؟" (ربط التحديث بالهدف الاستراتيجي الكبير)؛ CFO — "ده هيكلّف قد إيه، وهل هنلتزم بالميزانية؟" (أرقام، انحراف عن الخطة، أثر مالي مباشر)؛ CTO — "الحل التقني سليم ومستدام؟" (تفاصيل جودة/معمارية كافية للحكم الفني)؛ Sponsor — "المشروع لسه هيحقق الهدف اللي اتفقنا عليه؟" (ربط مباشر بالأهداف المعتمدة في الميثاق)؛ Ops Director — "ده هيأثر على العمليات الجارية إزاي؟" (أثر تشغيلي، جدول تسليم، استمرارية). هذا مش تلاعب: المحتوى الحقيقي (الحقيقة) واحد لكل الخمسة. الاختلاف في الإطار (Framing) اللي بيخلّي كل واحد يفهم أثر نفس الحقيقة على أولويته هو. تلاعب لو غيّرت الحقيقة نفسها لكل واحد؛ تواصل فعّال لو غيّرت بس زاوية العرض.

لما عضوين في المجلس عايزين حاجتين متضادتين (مثلًا CFO عايز تقليل تكلفة، CTO عايز استثمار إضافي في الجودة)، أسوأ رد فعل هو "حل وسط غامض" يرضي محدش فعليًا. البديل الأفضل: حدد القيد الحقيقي — مش "الاتنين عايزين حاجات مختلفة"، لكن "الميزانية المتاحة X، والوقت المتاح Y — أي مزيج منهم ممكن فعليًا؟"؛ اعرض المقايضة صراحة — "لو زوّدنا استثمار الجودة بـ10%، هنحتاج نمدّ الجدول أسبوعين أو نقلل نطاق ميزة تانية" (خيارات واضحة، مش وعد مستحيل بإرضاء الكل)؛ اسأل: "إيه أهم قيد فعليًا؟" بدل ما تفترض — أحيانًا الطرفين بيقدروا يتفقوا على الأولوية الحقيقية لو سألتهم مباشرة بدل ما تحلّها بالنيابة عنهم.

كل قرار تفاوض أو تواصل مهم بتاخده هنا لازم يتسجّل وقت حدوثه، مش يُعاد بناؤه من الذاكرة آخر المشروع. سجل قرار جيد بيحتوي: الموقف اللي أدى للقرار، القرار نفسه، السبب (مش بس "ده اللي قررته")، والبدائل اللي اتفكر فيها ورُفضت وليه. سجل القرارات ده مش بيروقراطية — هو المصدر اللي بيتبني منه تقرير Decision Log النهائي في مخرجات المستوى، وهو اللي بيوضّح طريقة تفكيرك كقائد لأي حد بيراجع أداءك لاحقًا — مش بس "إيه اللي حصل" لكن "ليه اتخدت القرار ده تحديدًا".

نقاط قواعدية: 1) تغيير الإطار حسب المستمع تواصل فعّال؛ تغيير الحقيقة نفسها تلاعب. 2) حل وسط غامض بيرضي محدش فعليًا — المقايضة الصريحة أوضح وأصدق. 3) حدد القيد الحقيقي (وقت/تكلفة/نطاق) قبل ما تحاول توفّق بين مصلحتين. 4) اسأل عن الأولوية الحقيقية بدل ما تفترضها نيابةً عن الطرفين. 5) سجل القرار وقت حدوثه، مش بعد أسابيع من الذاكرة. 6) سبب القرار أهم من نتيجته لأي حد بيراجعه لاحقًا. 7) الأخبار السيئة لازم توصل واضحة، مش "مصفّاة" لتبان أحسن مما هي. 8) التفاوض الناجح بيسيب الطرفين حاسّين إنهم اتسمعوا، حتى لو محدش أخد كل اللي عايزه.'
      )
    )
  );

  raise notice '070 OK: Unit 4 module/lesson planted with decision_log bridge; Unit 2 scenarios flagged log_decision=true (course %)', v_course_id;
end $$;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_course_id uuid;
  v_unit2_lesson_id uuid;
  v_unit4_module_id uuid;
  v_unit4_lesson_id uuid;
  v_unit4_scenarios int;
  v_unit2_flagged int;
  v_fn_def text;
  v_unit0_scenario jsonb;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '070 failed: Level 3 course not found';
  end if;

  -- Unit 2: both scenarios now flagged.
  select id into v_unit2_lesson_id from public.lessons where title = 'Lesson 2.1: Sprint Planning & Execution';
  select count(*) into v_unit2_flagged
    from public.lessons l, jsonb_array_elements(l.content -> 'entity_decisions') s
   where l.id = v_unit2_lesson_id and (s ->> 'log_decision')::boolean is true;
  if v_unit2_flagged <> 2 then
    raise exception '070 failed: expected 2 Unit 2 scenarios flagged log_decision=true, found %', v_unit2_flagged;
  end if;

  -- Unit 0 must remain untouched (no flag at all).
  select s into v_unit0_scenario
    from public.lessons l, jsonb_array_elements(l.content -> 'entity_decisions') s
   where l.title = 'Lesson 0.1: Delivery Kickoff' and s ->> 'scenario_key' = 'sarah_timeline_question';
  if v_unit0_scenario ? 'log_decision' then
    raise exception '070 failed: Unit 0 scenario unexpectedly has a log_decision key';
  end if;

  -- Unit 4 planted with 2 scenarios, both flagged.
  select id into v_unit4_module_id from public.modules
   where course_id = v_course_id and title = 'Unit 4: Stakeholder Communication';
  if v_unit4_module_id is null then
    raise exception '070 failed: Unit 4 module not found';
  end if;
  select id into v_unit4_lesson_id from public.lessons where module_id = v_unit4_module_id;
  if v_unit4_lesson_id is null then
    raise exception '070 failed: Unit 4 lesson not found';
  end if;
  select jsonb_array_length(content -> 'entity_decisions') into v_unit4_scenarios
    from public.lessons where id = v_unit4_lesson_id;
  if v_unit4_scenarios <> 2 then
    raise exception '070 failed: expected 2 entity_decisions scenarios in Unit 4, found %', v_unit4_scenarios;
  end if;

  select pg_get_functiondef(oid) into v_fn_def
    from pg_proc where proname = 'submit_lesson_entity_decision';
  if v_fn_def not ilike '%decision_log%' then
    raise exception '070 failed: submit_lesson_entity_decision() does not reference decision_log';
  end if;

  raise notice '070 OK: Unit 2 flagged (2/2), Unit 0 untouched, Unit 4 planted (2 scenarios), decision_log bridge installed.';
end $$;
