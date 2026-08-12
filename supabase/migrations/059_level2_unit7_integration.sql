-- ============================================================
-- WOW - World of Work — Migration 059
-- Level 2 content, Unit 7 — "Integration & Change Control" (5 hours),
-- Lesson 7.1 ("One Plan, Not Seven Documents"). New module under the
-- same Level 2 course (047/048/051/053/054/055/057), same authoring
-- pattern. `review_status = 'approved'` set directly (052's lesson
-- learned).
--
-- No new UI component — reuses LessonReflectionForm as this unit's
-- exercise. This is the LAST core-content unit (0-7); only the Final
-- Boss (9 scenarios) remains to complete Level 2's content.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod7 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '059 failed: Level 2 course not found — run 047/048/051/053/054/055/057 first';
  end if;

  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- MODULE — Unit 7
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod7, v_course_id, 'Unit 7: Integration & Change Control', 7);

  -- ============================================================
  -- UNIT 7 — LESSON 7.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (v_mod7, 'Lesson 7.1: One Plan, Not Seven Documents', 1, 300, false, 'approved',
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Change request', 'ar', 'طلب تغيير'),
       jsonb_build_object('en', 'Change Control Board (CCB)', 'ar', 'مجلس ضبط التغيير'),
       jsonb_build_object('en', 'Impact assessment', 'ar', 'تقييم الأثر'),
       jsonb_build_object('en', 'Integrated change control', 'ar', 'ضبط التغيير المتكامل'),
       jsonb_build_object('en', 'Re-baseline', 'ar', 'إعادة خط الأساس'),
       jsonb_build_object('en', 'Configuration management', 'ar', 'إدارة التكوين'),
       jsonb_build_object('en', 'Project management plan', 'ar', 'خطة إدارة المشروع')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Causative Verbs: have/get something done',
       'title_ar', 'الأفعال السببية: have/get something done',
       'explanation_ar', 'تصف فعلًا يحصل بمعرفة شخص تاني بناءً على طلبك أو تفويضك — بالظبط آلية إدارة التغيير الرسمية: إنت مش بتعدّل الخطة بنفسك، إنت بتطلب والمخوَّل ينفّذ. الصيغة: have/get + الشيء + تصريف ثالث. الفرق عن المبني للمجهول العادي (اتغطى آخر المستوى الأول): المبني للمجهول يصف حدثًا حصل بلا تركيز على مين طلبه، أما الصيغة السببية دي فتؤكد إن الفاعل الأصلي (إنت) هو اللي طلب أو فوّض التنفيذ، لا مجرد وصف حدث.',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'We had the schedule revised after the client''s request.', 'ar', 'خلّينا الجدول يتنقّح بعد طلب العميل.'),
         jsonb_build_object('en', 'The Sponsor got the budget re-baselined last week.', 'ar', 'الراعي خلّى الميزانية تتعاد خط أساسها الأسبوع اللي فات.'),
         jsonb_build_object('en', 'I''m having the impact assessment reviewed before I approve this.', 'ar', 'أنا خلّيت تقييم الأثر يتراجع قبل ما أوافق على ده.')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'One Plan, Not Seven Documents',
       'body', 'Every unit before this one produced its own deliverable: a Scope Statement, a schedule, a cost baseline, a quality plan, a Risk Register, maybe a sprint backlog. Integration is where those stop being separate documents and become one Project Management Plan — and, just as importantly, where any change to any single part has to go through a formal process instead of a quiet edit nobody else sees. A Change Request is exactly that: a written, formal ask — never a verbal decision made in a hallway. Before anyone approves it, an Impact Assessment checks what that one change would actually do to scope, schedule, and cost together — a change that looks small in isolation can quietly break something you approved three units ago. The Change Control Board (CCB) is whoever is actually authorized to approve or reject the request — on a small project, that might be you and the Sponsor; on a large one, a formal committee. And once a significant change is approved, a Re-baseline formally updates your plan''s baseline — the new version becomes the standard you''re measured against from that point forward, not a silent overwrite of the old one. The core message of integration is simple to state and easy to skip under pressure: even a small change in one part of the plan has to be checked against every other part before it''s accepted.'
     ),
     'ar', jsonb_build_object(
       'title', 'خطة واحدة، لا سبع وثائق',
       'body', 'كل وحدة قبل دي أنتجت مخرجها الخاص: بيان نطاق، جدول زمني، خط أساس تكلفة، خطة جودة، سجل مخاطر، وربما Backlog سبرنت. التكامل هو اللحظة اللي فيها المخرجات دي تبطل وثائق منفصلة وتبقى خطة إدارة مشروع واحدة — وبنفس الأهمية، اللحظة اللي فيها أي تغيير على أي جزء واحد لازم يمر بعملية رسمية بدل تعديل هادئ محدش شايفه. طلب التغيير (Change Request) هو بالظبط كده: طلب مكتوب رسمي — أبدًا قرار شفهي في الممر. قبل ما حد يوافق عليه، تقييم الأثر (Impact Assessment) يفحص إيه اللي التغيير ده هيعمله فعليًا في النطاق والجدول والتكلفة مع بعض — تغيير يبان صغير لوحده ممكن يكسر بصمت حاجة كنت اعتمدتها من تلات وحدات فاتت. مجلس ضبط التغيير (Change Control Board — CCB) هو مين المخوَّل فعليًا يوافق أو يرفض الطلب — في مشروع صغير، ممكن يكون إنت والراعي؛ في مشروع كبير، لجنة رسمية. وبمجرد ما تغيير مهم يتوافَق عليه، إعادة خط الأساس (Re-baseline) تحدّث خط أساس خطتك رسميًا — النسخة الجديدة تبقى المعيار اللي هتُقاس عليه من هنا فصاعدًا، لا استبدال صامت للقديمة. الرسالة الجوهرية للتكامل بسيطة تُقال وسهلة تُتجاهل تحت الضغط: حتى تغيير صغير في جزء واحد من الخطة لازم يتفحص أثره على كل الأجزاء التانية قبل ما يُقبل.'
     )
   ));

  raise notice '059 OK: Unit 7 / Lesson 7.1 planted under Level 2 course %', v_course_id;
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
    raise exception '059 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 8 then
    raise exception '059 failed: expected 8 modules (Unit 0-7), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 8 then
    raise exception '059 failed: expected 8 lessons total (0.1 through 7.1), found %', v_lessons;
  end if;

  select count(*) into v_not_approved from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id
     and l.review_status is distinct from 'approved';
  if v_not_approved > 0 then
    raise exception '059 failed: % Level 2 lesson(s) not approved (would be invisible to students)', v_not_approved;
  end if;

  raise notice '059 OK: 8 modules, 8 lessons, all approved, for Level 2 course % — Units 0-7 core content complete', v_course_id;
end $$;
