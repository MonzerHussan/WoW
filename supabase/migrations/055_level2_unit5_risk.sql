-- ============================================================
-- WOW - World of Work — Migration 055
-- Level 2 content, Unit 5 — "Risk Management" (8 hours), Lesson 5.1
-- ("Naming the Danger Before It Names You"). New module under the same
-- Level 2 course (047/048/051/053/054), same authoring pattern.
-- `review_status = 'approved'` set directly (052's lesson learned).
--
-- This unit's real deliverable (a project_risks table + register UI,
-- top-3 display on the project workspace) is a SEPARATE, larger piece —
-- design sent for review, not built here. This migration only plants
-- the lesson's reading content.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod5 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '055 failed: Level 2 course not found — run 047/048/051/053/054 first';
  end if;

  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- MODULE — Unit 5
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod5, v_course_id, 'Unit 5: Risk Management', 5);

  -- ============================================================
  -- UNIT 5 — LESSON 5.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (v_mod5, 'Lesson 5.1: Naming the Danger Before It Names You', 1, 480, false, 'approved',
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Risk register', 'ar', 'سجل المخاطر'),
       jsonb_build_object('en', 'Probability', 'ar', 'الاحتمالية'),
       jsonb_build_object('en', 'Impact', 'ar', 'التأثير'),
       jsonb_build_object('en', 'Risk score / exposure', 'ar', 'درجة المخاطرة / التعرّض'),
       jsonb_build_object('en', 'Avoid', 'ar', 'تجنّب'),
       jsonb_build_object('en', 'Mitigate', 'ar', 'تخفيف'),
       jsonb_build_object('en', 'Transfer', 'ar', 'نقل'),
       jsonb_build_object('en', 'Accept', 'ar', 'قبول'),
       jsonb_build_object('en', 'Risk owner', 'ar', 'مالك المخاطرة'),
       jsonb_build_object('en', 'Risk trigger', 'ar', 'مُحفّز المخاطرة')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Expressing Probability',
       'title_ar', 'التعبير عن درجة الاحتمالية',
       'explanation_ar', 'تدرّج في التعبير عن درجة اليقين باحتمالية حدوث شيء، أدق من "maybe/probably" البسيطة، ومفيد جدًا في تسجيل المخاطر بدقة. "bound to" للاحتمال شبه المؤكَّد. "likely to" لاحتمال عالٍ لكن غير مؤكَّد. "liable to" للتعبير عن التعرّض لمخاطر سلبية تحديدًا. "stands a chance of" لاحتمال معقول لكن غير مؤكَّد، غالبًا بصيغة إيجابية. "unlikely to" لاحتمال منخفض. الفرق بينها وبين "maybe" العادية: كل صيغة من دول تحدد درجة يقين مختلفة بدقة، بينما "maybe" غامضة بلا تدرّج.',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'If we don''t fix this dependency, we''re bound to miss the deadline.', 'ar', 'لو ما صلحناش التبعية دي، هنفوّت الديدلاين شبه المؤكَّد.'),
         jsonb_build_object('en', 'This vendor is likely to deliver late, based on their history.', 'ar', 'المورّد ده احتمال كبير يسلّم متأخر، بناءً على تاريخه.'),
         jsonb_build_object('en', 'A project this complex is liable to face scope creep.', 'ar', 'مشروع بالتعقيد ده عرضة لزحف النطاق.'),
         jsonb_build_object('en', 'The team stands a chance of finishing early if resources hold.', 'ar', 'الفريق عنده احتمال معقول يخلص بدري لو الموارد استقرت.'),
         jsonb_build_object('en', 'This risk is unlikely to materialize before Phase 2 ends.', 'ar', 'المخاطرة دي احتمال ضعيف تتحقق قبل ما المرحلة التانية تخلص.')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'Naming the Danger Before It Names You',
       'body', 'A risk and a problem are not the same thing, even though people use the words interchangeably under pressure. A risk is an uncertain event that HASN''T happened yet — and it can be positive or negative, though most of what you''ll manage day to day is the negative kind. A problem is something that has already happened; at that point you''re no longer managing risk, you''re managing consequences. Every risk gets scored on two dimensions: Probability (how likely is it to happen) and Impact (how bad — or good — would it be if it did). Multiply the two and you get a Risk Score (also called Exposure), which is what actually tells you which risks deserve your attention first — a high-probability, low-impact risk and a low-probability, catastrophic one can land at a similar score, and both need a plan, just very different plans. Speaking of plans: there are four standard response strategies. Avoid changes the plan itself so the risk simply can''t happen anymore. Mitigate reduces either the probability or the impact, without eliminating the risk entirely. Transfer moves the risk to a third party — insurance, a subcontractor, a fixed-price clause — someone else now carries it. Accept means acknowledging the risk consciously and choosing to live with it, sometimes with a contingency plan ready, sometimes without one if the exposure is genuinely low. Go back to the Assumptions and Constraints you logged in Level 1 — a good number of them were actually risks that never got named as such. An assumption that turns out wrong IS a risk; you just hadn''t scored it yet.'
     ),
     'ar', jsonb_build_object(
       'title', 'سمِّ الخطر قبل ما يسمّيك',
       'body', 'المخاطرة والمشكلة مش نفس الحاجة، رغم إن الناس تستخدم الكلمتين بالتبادل تحت الضغط. المخاطرة حدث غير مؤكَّد لسه ما حصلش — وممكن يكون إيجابي أو سلبي، رغم إن أغلب اللي هتديره يوميًا هو النوع السلبي. المشكلة حاجة حصلت بالفعل؛ في اللحظة دي أنت مش بتدير مخاطرة، أنت بتدير نتائج. كل مخاطرة تتقيّم على بُعدين: الاحتمالية (Probability — قد إيه احتمال حدوثها) والتأثير (Impact — قد إيه هتكون وحشة، أو كويسة، لو حصلت). اضرب الاتنين في بعض وهتطلع لك درجة المخاطرة (Risk Score، وتُسمى كمان Exposure)، وهي اللي فعليًا تقولك أي المخاطر تستاهل اهتمامك الأول — مخاطرة عالية الاحتمالية قليلة التأثير ومخاطرة نادرة كارثية ممكن يوصلوا لدرجة متقاربة، والاتنين محتاجين خطة، بس خطط مختلفة جدًا. وبالحديث عن الخطط: فيه أربع استراتيجيات استجابة قياسية. تجنّب (Avoid) يغيّر الخطة نفسها عشان المخاطرة تبقى مستحيلة تحصل خالص. تخفيف (Mitigate) يقلّل إما الاحتمالية أو التأثير، بلا ما يلغي المخاطرة تمامًا. نقل (Transfer) ينقل المخاطرة لطرف تالت — تأمين، مقاول من الباطن، بند سعر ثابت — حد تاني يحملها دلوقتي. قبول (Accept) يعني الاعتراف بالمخاطرة بوعي واختيار تعيش معاها، أحيانًا بخطة احتياطية جاهزة، وأحيانًا من غيرها لو التعرّض فعلًا منخفض. ارجع للافتراضات والقيود اللي سجّلتها في المستوى الأول — عدد كبير منها كانت فعليًا مخاطر لم تُصنَّف كده وقتها. الافتراض اللي يطلع غلط هو مخاطرة أصلًا — بس ما كنتش قيّمتها لسه.'
     )
   ));

  raise notice '055 OK: Unit 5 / Lesson 5.1 planted under Level 2 course %', v_course_id;
end $$;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_course_id uuid;
  v_modules int;
  v_lessons int;
  v_not_approved int;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '055 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 6 then
    raise exception '055 failed: expected 6 modules (Unit 0-5), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 6 then
    raise exception '055 failed: expected 6 lessons total (0.1 through 5.1), found %', v_lessons;
  end if;

  select count(*) into v_not_approved from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id
     and l.review_status is distinct from 'approved';
  if v_not_approved > 0 then
    raise exception '055 failed: % Level 2 lesson(s) not approved (would be invisible to students)', v_not_approved;
  end if;

  raise notice '055 OK: 6 modules, 6 lessons, all approved, for Level 2 course %', v_course_id;
end $$;
