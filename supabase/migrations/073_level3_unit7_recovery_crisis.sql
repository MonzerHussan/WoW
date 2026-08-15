-- ============================================================
-- WOW - World of Work — Migration 073
-- Level 3, Unit 7 — "Project Recovery & Crisis Leadership" (6 hours),
-- content authored by the owner directly. Last regular unit before
-- Final Boss.
--
-- Uses only characters/entities that already exist (sarah, ceo,
-- sponsor, cfo, organization/org) — no new characters. Both scenarios
-- are critical project decisions, so both carry log_decision: true
-- (same category as Units 2/4/5/6 — see 070's header for the scope
-- rule).
--
-- Scenario 1 (early warning signs): primary entity character/sarah,
-- with organization/org's org_planning_maturity as an extra_delta —
-- same pattern as Units 4-6.
--
-- Scenario 2 (board recovery negotiation): the owner's brief describes
-- comparable-weight effects on THREE board members (ceo, sponsor, cfo)
-- on every choice — the same "one primary + extra_deltas for the
-- others" shape as Unit 0's board_first_briefing scenario (067) and
-- Unit 4's bad_news_to_board scenario (070). Primary entity is
-- character/ceo (listed first in the brief, highest-weight delta on
-- every choice); sponsor and cfo are extra_deltas.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod7 uuid := uuid_generate_v4();
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '073 failed: Level 3 course not found — run 066-072 first';
  end if;

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod7, v_course_id, 'Unit 7: Project Recovery & Crisis Leadership', 7);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod7, 'Lesson 7.1: Project Recovery & Crisis Leadership', 1, 360, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'early_warning_signs',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'log_decision', true,
          'situation_ar', 'لاحظت انحراف جدول بسيط بيكبر تدريجيًا 3 سباقات متتالية، والفريق هدى ملحوظ. لسه مفيش "أزمة رسمية" حد أعلنها.',
          'situation_en', 'You notice a small schedule variance growing over 3 consecutive sprints, and the team is noticeably quieter. No "official crisis" has been declared yet.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'تفتح الموضوع صراحة مع الفريق دلوقتي، قبل ما يبقى أزمة معلَنة.',
              'label_en', 'Open the topic honestly with the team now, before it becomes a declared crisis.',
              'delta', jsonb_build_object('trust', 8),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', 7))
              ),
              'feedback_ar', 'الأفضل: اعتراف مبكر بمشكلة وقت لسه فيه مساحة تصرف — بالظبط "الاعتراف المبكر بمشكلة بيسيب مساحة تصرف؛ الاعتراف المتأخر بيسيبك بلا خيارات".',
              'feedback_en', 'Best: early admission of a problem while there is still room to act — exactly "early admission leaves room to act; late admission leaves you with no options."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تستنى Sprint كمان تتأكد إن الاتجاه حقيقي قبل ما "تقلق حد".',
              'label_en', 'Wait one more sprint to confirm the trend is real before "worrying anyone."',
              'delta', jsonb_build_object('trust', -2),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -5))
              ),
              'feedback_ar', 'ضعيف: الانتظار Sprint كمان "عشان متقلقش حد" بيأجل الاعتراف بعلامة واضحة بالفعل — أغلب الأزمات المفاجئة كانت علاماتها ظاهرة أسابيع قبل الاعتراف بيها، وده بالظبط النمط ده.',
              'feedback_en', 'Weak: waiting another sprint "so as not to worry anyone" delays acknowledging an already-clear sign — most sudden crises had visible signs weeks before admission, and this is exactly that pattern.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'تطمّن الفريق إن "كل حاجة تمام" عشان "متزودش القلق".',
              'label_en', 'Reassure the team "everything''s fine" so as not to "add to the worry."',
              'delta', jsonb_build_object('trust', -7),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -6))
              ),
              'feedback_ar', 'ضعيف جدًا: طمأنة الفريق بـ"كل حاجة تمام" مع وجود علامات واضحة عكس هدوء القائد الحقيقي — هدوء القائد وقت الأزمة ثقة مبنية على خطة، مش إنكار للمشكلة، وده إنكار صريح.',
              'feedback_en', 'Very weak: reassuring the team "everything''s fine" while clear signs exist is the opposite of real leader calm — a leader''s calm during crisis is plan-grounded confidence, not denial, and this is outright denial.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تتجاهل الموضوع لحد ما حد تاني يثيره رسميًا.',
              'label_en', 'Ignore the topic until someone else raises it officially.',
              'delta', jsonb_build_object('trust', -9),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -8))
              ),
              'feedback_ar', 'الأسوأ: تجاهل الموضوع لحد ما حد تاني يثيره رسميًا يضمن إن الاعتراف هيحصل متأخر جدًا، وقت مفيش فيه خيارات — عكس مباشر لمبدأ الاعتراف المبكر.',
              'feedback_en', 'Worst: ignoring it until someone else raises it formally guarantees the admission happens too late, when there are no options left — a direct violation of the early-admission principle.'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'board_recovery_negotiation',
          'entity_type', 'character',
          'entity_key', 'ceo',
          'log_decision', true,
          'situation_ar', 'المشروع دلوقتي متأخر رسميًا. لازم تقدّم خطة إنقاذ للمجلس الكامل.',
          'situation_en', 'The project is now officially behind. You must present a recovery plan to the full board.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'تقييم صادق بالأرقام الحقيقية + خطة Stop/Reset/Rebuild واضحة بضمانات.',
              'label_en', 'An honest assessment with real numbers plus a clear Stop/Reset/Rebuild plan with safeguards.',
              'delta', jsonb_build_object('trust', 8),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', 8)),
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cfo', 'delta', jsonb_build_object('trust', 6))
              ),
              'feedback_ar', 'الأفضل: تقييم صادق بالأرقام الحقيقية + خطة Stop/Reset/Rebuild واضحة بضمانات — بالظبط "الإنقاذ الحقيقي = وقف صادق، إعادة ضبط واقعية، إعادة بناء بضمانات".',
              'feedback_en', 'Best: an honest assessment with real numbers plus a clear Stop/Reset/Rebuild plan with safeguards — exactly "real recovery = honest stop, realistic reset, rebuild with safeguards."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تعد بتعويض التأخير بالكامل "بجهد إضافي" بلا خطة محددة.',
              'label_en', 'Promise to fully make up the delay with "extra effort," no specific plan.',
              'delta', jsonb_build_object('trust', -6),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', -5)),
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cfo', 'delta', jsonb_build_object('trust', -4))
              ),
              'feedback_ar', 'ضعيف: وعد بتعويض التأخير "بجهد إضافي" بلا خطة محددة مجرد وعد جديد بلا أساس — عكس "إعادة ضبط" الحقيقية اللي لازم تكون تفاوض واقعي، مش وعد متفائل.',
              'feedback_en', 'Weak: promising to make up the delay with "extra effort" and no concrete plan is just another baseless promise — the opposite of a real "reset," which must be a realistic negotiation, not an optimistic promise.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'تقلل من حجم التأخير الفعلي أمام المجلس.',
              'label_en', 'Minimize the actual size of the delay in front of the board.',
              'delta', jsonb_build_object('trust', -9),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', -9)),
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cfo', 'delta', jsonb_build_object('trust', -8))
              ),
              'feedback_ar', 'الأسوأ: تقليل حجم التأخير الفعلي أمام المجلس تلاعب مباشر بالمعلومة في أخطر لحظة ممكنة — لو كنت بتجمّل الأخبار طول الوقت، مفاوضة الإنقاذ هتبقى أصعب بكتير، وده بالظبط اللحظة اللي بتثبت فيها كده.',
              'feedback_en', 'Worst: minimizing the actual delay in front of the board is direct manipulation of information at the worst possible moment — if you''ve been sugar-coating news all along, recovery negotiation becomes much harder, and this is exactly the moment that proves it.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تطلب مهلة "تفكير" بلا خطة أو موعد واضح للرد.',
              'label_en', 'Ask for "thinking time" with no plan or clear date to respond.',
              'delta', jsonb_build_object('trust', -5),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sponsor', 'delta', jsonb_build_object('trust', -6)),
                jsonb_build_object('entity_type', 'character', 'entity_key', 'cfo', 'delta', jsonb_build_object('trust', -5))
              ),
              'feedback_ar', 'ضعيف: طلب مهلة تفكير بلا خطة أو موعد واضح للرد بيوحي بغياب خطة حقيقية وقت المجلس محتاج بالظبط العكس — هدوء القائد وقت الأزمة لازم يكون مبني على خطة، مش تأجيل قرار.',
              'feedback_en', 'Weak: asking for "thinking time" with no plan or clear response date suggests the absence of a real plan exactly when the board needs the opposite — a leader''s calm during crisis must be grounded in a plan, not a deferred decision.'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Project Recovery & Crisis Leadership',
        'body', 'This is the last module before Final Boss, and the real test of everything you''ve learned so far: transparency with the board (Module 4), managing relationships under pressure (Module 3), reading data correctly (Module 6). A troubled project isn''t a moment to learn a new skill — it''s the moment you use all your skills together, under maximum pressure.

Most "sudden crises" aren''t sudden at all — their signs were visible weeks before anyone officially admitted it: schedule variance growing sprint after sprint, not shrinking (see the monitoring principles from Module 6); the team becoming quieter and less proactive (a morale signal, Module 3); stakeholders repeatedly "surprised" by updates — a sign communication wasn''t transparent enough to begin with (Module 4). The harder decision: admitting the problem before it becomes an official crisis, while there''s still room to act, instead of waiting until no one can deny it anymore.

Recovery Framework — Stop / Reset / Rebuild: Stop (an honest assessment with no spin — what''s the real situation, actually?); Reset (negotiate a new realistic schedule/scope/budget with stakeholders — with Module 4''s own honesty, not a new baseless promise); Rebuild (a new plan with safeguards against repeating the same failure). The "trust account" concept: if you''ve been transparent with the board all along (like Module 4''s decisions), you have trust capital to spend now. If you''ve been sugar-coating news the whole way, recovery negotiation will be much harder.

A leader''s calm during a crisis is not hiding concern or pretending everything''s fine. It''s confidence grounded in a real plan — the team feels the difference between "no one''s worried because there''s no problem" and "the leader is worried but has a clear plan and believes in it." The first is deception, the second is real leadership.

Rule points: 1) Most sudden crises had visible signs weeks before admission. 2) Early admission leaves room to act; late admission leaves you with no options. 3) Real recovery = honest stop, realistic reset, rebuild with safeguards. 4) Accumulated transparency is trust capital spent during crisis. 5) Hiding bad news along the way makes recovery negotiation much harder. 6) A leader''s calm during crisis is plan-grounded confidence, not denial. 7) A recovery plan with no safeguards against repeating the root cause just delays the crisis. 8) Crisis leadership uses every skill learned together, not one skill in isolation.'
      ),
      'ar', jsonb_build_object(
        'title', 'إنقاذ المشاريع والقيادة وقت الأزمات',
        'body', 'هذه آخر وحدة قبل Final Boss، وهي الاختبار الحقيقي لكل حاجة اتعلمتها لحد دلوقتي: الشفافية مع المجلس (الوحدة 4)، إدارة العلاقات تحت ضغط (الوحدة 3)، القراءة الصحيحة للبيانات (الوحدة 6). مشروع متعثّر مش لحظة تتعلم فيها مهارة جديدة — هي لحظة تستخدم فيها كل المهارات اللي عندك سوا، تحت أقصى ضغط.

أغلب "الأزمات المفاجئة" مش مفاجئة فعليًا — كانت علاماتها ظاهرة أسابيع قبل ما حد يعترف بيها رسميًا: انحراف الجدول بيكبر Sprint بعد Sprint، مش بيتقلص (راجع مبادئ المراقبة من الوحدة 6)؛ الفريق بقى أهدى وأقل مبادرة (مؤشر معنويات، الوحدة 3)؛ أصحاب المصلحة بقوا "بيتفاجئوا" بتحديثات متكررة — علامة إن التواصل مش شفاف كفاية من الأصل (الوحدة 4). القرار الأصعب: الاعتراف بالمشكلة قبل ما تبقى أزمة رسمية، وقت لسه فيه مساحة تتصرف فيها، بدل ما تستنى لحد ما محدش يقدر ينكرها.

إطار الإنقاذ — وقف / إعادة ضبط / إعادة بناء: وقف (Stop): تقييم صادق بلا تجميل — إيه الوضع الحقيقي فعليًا؟ إعادة ضبط (Reset): تفاوض جدول/نطاق/ميزانية واقعي جديد مع أصحاب المصلحة — بصراحة الوحدة 4 نفسها، مش وعد جديد بلا أساس. إعادة بناء (Rebuild): خطة جديدة فيها ضمانات ضد تكرار نفس الفشل. مفهوم "رصيد الثقة": لو كنت شفاف مع المجلس طول الطريق (زي قرارات الوحدة 4)، عندك رصيد ثقة تصرفه دلوقتي. لو كنت بتجمّل الأخبار طول الوقت، مفاوضة الإنقاذ هتبقى أصعب بكتير.

هدوء القائد وقت الأزمة مش إخفاء القلق أو التظاهر إن كل حاجة تمام. هو ثقة مبنية على خطة حقيقية — الفريق بيحس بالفرق بين "محدش قلقان لأن مفيش مشكلة" و"القائد قلقان بس عنده خطة واضحة وواثق فيها". الأول تضليل، الثاني قيادة حقيقية.

نقاط قواعدية: 1) أغلب الأزمات المفاجئة كانت علاماتها ظاهرة أسابيع قبل الاعتراف بيها. 2) الاعتراف المبكر بمشكلة بيسيب مساحة تصرف؛ الاعتراف المتأخر بيسيبك بلا خيارات. 3) الإنقاذ الحقيقي = وقف صادق، إعادة ضبط واقعية، إعادة بناء بضمانات. 4) الشفافية المتراكمة (الوحدة 4) رصيد ثقة بتصرفه وقت الأزمة. 5) إخفاء أخبار سيئة طول الطريق بيخلي مفاوضة الإنقاذ أصعب بكتير. 6) هدوء القائد وقت الأزمة ثقة مبنية على خطة، مش إنكار للمشكلة. 7) خطة إنقاذ بلا ضمانات ضد تكرار السبب الجذري مجرد تأجيل للأزمة. 8) القيادة وقت الأزمة تستخدم كل مهارة اتعلمتها سوا، مش مهارة واحدة معزولة.'
      )
    )
  );

  raise notice '073 OK: Unit 7 module/lesson planted (course %)', v_course_id;
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
   where course_id = v_course_id and title = 'Unit 7: Project Recovery & Crisis Leadership';
  if v_module_id is null then
    raise exception '073 failed: Unit 7 module not found';
  end if;

  select id into v_lesson_id from public.lessons where module_id = v_module_id;
  if v_lesson_id is null then
    raise exception '073 failed: Unit 7 lesson not found';
  end if;

  select jsonb_array_length(content -> 'entity_decisions') into v_scenarios
    from public.lessons where id = v_lesson_id;
  if v_scenarios <> 2 then
    raise exception '073 failed: expected 2 entity_decisions scenarios, found %', v_scenarios;
  end if;

  select count(*) into v_flagged
    from public.lessons l, jsonb_array_elements(l.content -> 'entity_decisions') s
   where l.id = v_lesson_id and (s ->> 'log_decision')::boolean is true;
  if v_flagged <> 2 then
    raise exception '073 failed: expected both Unit 7 scenarios flagged log_decision=true, found %', v_flagged;
  end if;

  raise notice '073 OK: Unit 7 planted with 2 scenarios, both log_decision=true.';
end $$;
