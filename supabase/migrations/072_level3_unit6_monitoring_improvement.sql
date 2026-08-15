-- ============================================================
-- WOW - World of Work — Migration 072
-- Level 3, Unit 6 — "Monitoring & Continuous Improvement" (5 hours),
-- content authored by the owner directly.
--
-- Uses only characters that already exist (ahmed, sarah) — no new
-- characters. Both scenarios are real project decisions responding to
-- performance data, so both carry log_decision: true (same category as
-- Units 2/4/5 — see 070's header for the scope rule).
--
-- Scenario 1 (rising defect rate): primary entity character/ahmed,
-- with organization/org's org_planning_maturity as an extra_delta on
-- every choice — same pattern as Units 4/5.
--
-- Scenario 2 (retrospective with no outcome): primary entity
-- character/sarah. Choice D's "cooperation -6" targets sarah HERSELF
-- (the team lead's own relationship metric, not a different entity),
-- so unlike the extra_deltas pattern used elsewhere, it belongs in the
-- scenario's own primary `delta` object alongside `trust` — no
-- extra_deltas entry needed since there's no second entity involved.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod6 uuid := uuid_generate_v4();
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '072 failed: Level 3 course not found — run 066-071 first';
  end if;

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod6, v_course_id, 'Unit 6: Monitoring & Continuous Improvement', 6);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod6, 'Lesson 6.1: Monitoring & Continuous Improvement', 1, 300, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'rising_defect_rate',
          'entity_type', 'character',
          'entity_key', 'ahmed',
          'log_decision', true,
          'situation_ar', 'لاحظت اتجاه صاعد في معدل العيوب عبر آخر 3 سباقات (0.5% → 1.2% → 2%)، لسه رقم "صغير" لكن الاتجاه واضح. Ahmed بيقول "الرقم لسه مقبول، مش لازم نوقف عشانه."',
          'situation_en', 'You notice a rising defect-rate trend over the last 3 sprints (0.5% -> 1.2% -> 2%). Ahmed says "the number''s still acceptable, no need to stop for it."',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', '"الاتجاه أهم من الرقم — خلينا نخصص وقت الـRetrospective الجاية نفهم السبب الجذري."',
              'label_en', '"The trend matters more than the number — let''s set aside time in the next retrospective to understand the root cause."',
              'delta', jsonb_build_object('trust', 6),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', 5))
              ),
              'feedback_ar', 'الأفضل: تعطي الاتجاه وزنه الحقيقي وتخصص وقت لفهم السبب الجذري بدل تجاهل رقم لسه "صغير" — بالظبط "الاتجاه عبر الوقت أهم من الرقم اللحظي المعزول".',
              'feedback_en', 'Best: giving the trend its real weight and setting aside time to understand the root cause instead of dismissing a still-"small" number — exactly "trend over time matters more than an isolated instantaneous number."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'توافق مع Ahmed وتسيب الموضوع لحد ما "يبقى فعلًا مشكلة".',
              'label_en', 'Agree with Ahmed and leave it until it "actually becomes a problem."',
              'delta', jsonb_build_object('trust', 2),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -6))
              ),
              'feedback_ar', 'ضعيف: الانتظار لحد ما "يبقى فعلًا مشكلة" بيسيب اتجاه صاعد واضح بلا تدخل — عكس مبدأ إن الاتجاه أهم من الرقم اللحظي، وبيقلل النضج التخطيطي لأن القرار مبني على تجاهل بيانات واضحة.',
              'feedback_en', 'Weak: waiting until it "actually becomes a problem" leaves a clearly rising trend unaddressed — the opposite of trend-over-number, and it lowers planning maturity because the decision ignores clear data.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'توقف الـSprint فورًا للتحقيق.',
              'label_en', 'Stop the sprint immediately to investigate.',
              'delta', jsonb_build_object('trust', -4, 'stress', 6),
              'feedback_ar', 'ضعيف: وقف الـSprint فورًا لرقم لسه صغير رد فعل مبالغ فيه بيرفع ضغط الفريق بلا داعٍ — التحسين المستمر عادة منظّمة (فهم السبب الجذري في وقته المناسب، الـRetrospective)، مش رد فعل أزمة.',
              'feedback_en', 'Weak: stopping the sprint immediately over a still-small number is an overreaction that needlessly raises team stress — continuous improvement is an organized habit (root-cause understanding at its proper time, the retrospective), not a crisis reaction.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تحدّث اللوحة بس تصفّي الرقم عشان "متضخّمش القلق".',
              'label_en', 'Update the dashboard but filter the number so it "doesn''t inflate concern."',
              'delta', jsonb_build_object('trust', -9),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -8))
              ),
              'feedback_ar', 'الأسوأ: تصفية الرقم عشان "ما يضخّمش القلق" هو بالظبط مسرح اللوحات (Dashboard Theater) — مؤشر سيء موثَّق وواضح السبب أفضل من مؤشر مصفّى يبان كويس.',
              'feedback_en', 'Worst: filtering the number so it "doesn''t inflate concern" is exactly Dashboard Theater — a documented bad indicator with a clear cause beats a filtered indicator that looks fine.'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'retrospective_no_outcome',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'log_decision', true,
          'situation_ar', 'في آخر Retrospective، الفريق ذكر نفس المشكلة (اجتماعات كتير مقاطعة الشغل) للمرة التالتة على التوالي، بلا أي فعل اتكتب أو اتنفّذ من المرات اللي فاتت.',
          'situation_en', 'In the last retrospective, the team raised the same issue for the third time in a row, with no action written or done from previous times.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', '"المرة دي هنكتب فعل واحد محدد بمسؤول وموعد، ونراجعه بجد الـRetro الجاية."',
              'label_en', '"This time we''ll write one specific action with an owner and a date, and seriously review it next retro."',
              'delta', jsonb_build_object('trust', 8),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', 6))
              ),
              'feedback_ar', 'الأفضل: فعل واحد محدد بمسؤول وموعد مراجعة — بالظبط "Retrospective بلا أفعال محددة ومسؤولين = شكوى، مش تحسين"، وموعد المراجعة نفسه بيبني مصداقية العملية.',
              'feedback_en', 'Best: one specific action with an owner and a review date — exactly "a retrospective with no specific actions and owners is complaining, not improving," and the review point itself builds process credibility.'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', '"أنا هقلل الاجتماعات." (وعد عام بلا خطة محددة)',
              'label_en', '"I''ll cut down on meetings." (a general promise with no specific plan)',
              'delta', jsonb_build_object('trust', 1),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -3))
              ),
              'feedback_ar', 'ضعيف: وعد عام بلا خطة محددة ("هقلل الاجتماعات") بلا مسؤول أو موعد مش بيختلف فعليًا عن مفيش فعل خالص — نفس نمط الفشل اللي بيتكرر.',
              'feedback_en', 'Weak: a vague promise with no specific plan ("I''ll cut meetings"), no owner, no date — not really different from no action at all, the same failure pattern repeating.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', '"ده مش حاجة أقدر أتحكم فيها، آسف."',
              'label_en', '"That''s not something I can control, sorry."',
              'delta', jsonb_build_object('trust', -7),
              'feedback_ar', 'ضعيف جدًا: "ده مش حاجة أقدر أتحكم فيها" تنازل عن القيادة أمام مشكلة اتكررت 3 مرات بلا أي محاولة حتى — لكن على الأقل بيعترف إن فيه مشكلة قائمة.',
              'feedback_en', 'Very weak: "that''s not something I can control" is an abdication of leadership in front of a problem raised three times running, with no attempt at all — though at least it acknowledges the problem exists.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تنتقل للموضوع الجاي بسرعة بلا أي تعليق.',
              'label_en', 'Quickly move on to the next topic with no comment at all.',
              'delta', jsonb_build_object('trust', -8, 'cooperation', -6),
              'feedback_ar', 'الأسوأ: الانتقال للموضوع الجاي بلا أي تعليق أشد من الاعتراف العاجز — الفريق هيحس إن صوته مش مسموع خالص للمرة التالتة، وده بالظبط اللي "الإيجابية الزايفة... بتمنع التحسين الحقيقي زي ما الشكوى بتمنعه" بيتكلم عنه من زاوية تانية: تجاهل كامل.',
              'feedback_en', 'Worst: moving on with zero comment is harsher than a helpless acknowledgment — the team will feel completely unheard for the third time running, exactly what "false positivity... blocks real improvement just as much as complaining does" describes from another angle: total dismissal.'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Monitoring & Continuous Improvement',
        'body', 'Since Module 0 you''ve heard about Triple Evaluation: Evidence + Rafeeq + Project Data. This module closes the loop on the third part (Project Data) — not just how to calculate SPI/CPI/Velocity (you learned that in Level 2 and Unit 2), but how to use that data continuously to improve performance, not just measure it.

The most dangerous project monitoring habit: Dashboard Theater — a dashboard where every indicator is always green, not because everything is actually fine, but because someone filters the data before it reaches the dashboard. Signs of real monitoring: the trend matters more than the instantaneous number (a stable 5% defect rate is better than a 2% rate that was 0.5% last week — a dangerous rising trend hidden behind a small number); red indicators are allowed and documented (an always-green dashboard is a warning sign, not success); data drives an actual decision, not just gets displayed in a meeting and forgotten.

The Retrospective meeting (end of every sprint) fails in two common ways: a complaint session with no outcome (the team states its problems, nobody writes anything down, the same problems repeat next sprint), or false positivity ("everything was fine!" because nobody wants to open a sensitive topic). An effective retrospective produces: 1-2 specific improvement actions (not generic ones), a clear owner for each action, and a review point at the next retrospective.

Rule points: 1) Trend over time matters more than an isolated instantaneous number. 2) An always-green dashboard is a warning sign, not success. 3) Data with no actual decision built on it is just decoration. 4) A retrospective with no specific actions and owners is complaining, not improving. 5) False positivity in retrospectives blocks real improvement just as much as complaining does. 6) Reviewing whether the previous improvement action was actually done builds process credibility. 7) A documented bad indicator with a clear cause beats a filtered indicator that looks fine. 8) Continuous improvement is an organized habit, not a random reaction only during crises.'
      ),
      'ar', jsonb_build_object(
        'title', 'المراقبة والتحسين المستمر',
        'body', 'من الوحدة 0 وإنت بتسمع عن Triple Evaluation: أدلة + Rafeeq + بيانات مشروع. الوحدة دي بتقفل الحلقة على الجزء التالت (Project Data) — مش بس إزاي تحسب SPI/CPI/Velocity (اتعلمت ده في مستوى 2 والوحدة 2)، لكن إزاي تستخدم البيانات دي باستمرار عشان تحسّن الأداء، مش بس تقيسه.

أخطر عادة في مراقبة المشاريع: مسرح اللوحات (Dashboard Theater) — لوحة قيادة كل مؤشراتها خضراء دايمًا، مش لأن كل حاجة فعلًا تمام، لكن لأن حد بيصفّي البيانات قبل ما توصل للوحة. علامات المراقبة الحقيقية: الاتجاه أهم من الرقم اللحظي (معدل عيوب 5% مستقر أحسن من معدل 2% كان 0.5% الأسبوع اللي فات — اتجاه صاعد خطير مُخفي وراء رقم صغير)؛ المؤشرات الحمراء مسموحة وموثَّقة (لوحة كلها خضراء طول الوقت علامة تحذير، مش نجاح)؛ البيانات بتقود قرار فعلي، مش بس بتتعرض في اجتماع وتتنسى.

اجتماع الـRetrospective (نهاية كل Sprint) بيفشل بطريقتين شائعتين: جلسة شكوى بلا نتيجة (الفريق بيقول مشاكله، محدش بيكتب حاجة، نفس المشاكل بتتكرر الـSprint الجاية)، أو إيجابية زايفة ("كل حاجة كانت تمام!" عشان محدش عايز يفتح موضوع حساس). Retrospective فعّال بيخرج بـ: 1-2 فعل تحسين محدد (مش عام)، مسؤول واضح عن كل فعل، وموعد مراجعة في الـRetrospective الجاية.

نقاط قواعدية: 1) الاتجاه عبر الوقت أهم من الرقم اللحظي المعزول. 2) لوحة قيادة كلها خضراء دايمًا علامة تحذير، مش نجاح. 3) البيانات بلا قرار فعلي مبني عليها مجرد ديكور. 4) Retrospective بلا أفعال محددة ومسؤولين = شكوى، مش تحسين. 5) الإيجابية الزايفة في الـRetrospective بتمنع التحسين الحقيقي زي ما الشكوى بتمنعه. 6) مراجعة تنفيذ فعل التحسين السابق قبل فتح مشاكل جديدة يبني مصداقية العملية. 7) مؤشر سيء موثَّق وواضح السبب أفضل من مؤشر مصفّى يبان كويس. 8) التحسين المستمر عادة منظّمة، مش رد فعل عشوائي وقت الأزمة بس.'
      )
    )
  );

  raise notice '072 OK: Unit 6 module/lesson planted (course %)', v_course_id;
end $$;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_scenarios int;
  v_flagged int;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  select id into v_module_id from public.modules
   where course_id = v_course_id and title = 'Unit 6: Monitoring & Continuous Improvement';
  if v_module_id is null then
    raise exception '072 failed: Unit 6 module not found';
  end if;

  select id into v_lesson_id from public.lessons where module_id = v_module_id;
  if v_lesson_id is null then
    raise exception '072 failed: Unit 6 lesson not found';
  end if;

  select jsonb_array_length(content -> 'entity_decisions') into v_scenarios
    from public.lessons where id = v_lesson_id;
  if v_scenarios <> 2 then
    raise exception '072 failed: expected 2 entity_decisions scenarios, found %', v_scenarios;
  end if;

  select count(*) into v_flagged
    from public.lessons l, jsonb_array_elements(l.content -> 'entity_decisions') s
   where l.id = v_lesson_id and (s ->> 'log_decision')::boolean is true;
  if v_flagged <> 2 then
    raise exception '072 failed: expected both Unit 6 scenarios flagged log_decision=true, found %', v_flagged;
  end if;

  raise notice '072 OK: Unit 6 planted with 2 scenarios, both log_decision=true.';
end $$;
