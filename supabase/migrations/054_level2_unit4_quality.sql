-- ============================================================
-- WOW - World of Work — Migration 054
-- Level 2 content, Unit 4 — "Quality Management" (6 hours), Lesson 4.1
-- ("Prevention Costs Less Than Regret"). New module under the same
-- Level 2 course (047/048/051/053), same authoring pattern.
-- `review_status = 'approved'` set directly (052's lesson learned).
--
-- No new UI component — reuses LessonReflectionForm as this unit's
-- exercise. Unlike Units 1-3, the scenario itself ("a team member found
-- a defect close to deadline, pressure to ship as-is") is NOT separate
-- lesson content — it IS the reflection prompt shown directly above the
-- answer field, since LessonReflectionForm already renders promptAr/
-- promptEn as the situation before the learner responds. No duplication
-- needed between lesson body and exercise prompt.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod4 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '054 failed: Level 2 course not found — run 047/048/051/053 first';
  end if;

  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- MODULE — Unit 4
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod4, v_course_id, 'Unit 4: Quality Management', 4);

  -- ============================================================
  -- UNIT 4 — LESSON 4.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (v_mod4, 'Lesson 4.1: Prevention Costs Less Than Regret', 1, 360, false, 'approved',
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Quality Assurance (QA)', 'ar', 'ضمان الجودة'),
       jsonb_build_object('en', 'Quality Control (QC)', 'ar', 'مراقبة الجودة'),
       jsonb_build_object('en', 'Cost of Quality (COQ)', 'ar', 'تكلفة الجودة'),
       jsonb_build_object('en', 'Prevention cost', 'ar', 'تكلفة الوقاية'),
       jsonb_build_object('en', 'Appraisal cost', 'ar', 'تكلفة الفحص'),
       jsonb_build_object('en', 'Internal failure cost', 'ar', 'تكلفة الفشل الداخلي'),
       jsonb_build_object('en', 'External failure cost', 'ar', 'تكلفة الفشل الخارجي'),
       jsonb_build_object('en', 'Rework', 'ar', 'إعادة العمل')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Third Conditional: Analyzing a Past That''s Already Over',
       'title_ar', 'الجملة الشرطية الثالثة: تحليل ماضٍ خلص وانتهى',
       'explanation_ar', 'صيغة "If + Past Perfect, would have + تصريف ثالث" تعبّر عن نتيجة افتراضية لموقف ماضٍ لم يحدث — بالظبط طريقة تفكير "الدروس المستفادة" في إدارة الجودة: ننظر لقرار فات وخلص، ونحلل إيه كان ممكن يحصل لو اتصرفنا مختلف. الفرق الجوهري عن First Conditional (المستوى الأول): الأول عن مستقبل ممكن يحصل فعلًا ونقدر نأثر فيه، أما الثالث فعن ماضٍ خلص وانتهى تمامًا — نحلله فقط، لا نقدر نغيّره.',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'If we had tested this module earlier, we would have caught the defect before delivery.', 'ar', 'لو كنا اختبرنا الوحدة دي بدري، كنا هنمسك العيب قبل التسليم.'),
         jsonb_build_object('en', 'The client wouldn''t have complained if QC had caught this.', 'ar', 'العميل ما كانش هيشتكي لو QC مسكت العيب ده.'),
         jsonb_build_object('en', 'We could have avoided the rework if we had followed the checklist.', 'ar', 'كنا نقدر نتفادى إعادة العمل لو كنا اتبعنا قائمة التحقق.')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'Prevention Costs Less Than Regret',
       'body', 'Quality Assurance (QA) and Quality Control (QC) sound interchangeable — they are not, and the difference is the whole point. QA is preventive: the processes you put in place to stop defects from happening in the first place — standards, checklists, reviews built into the workflow itself. QC is inspection: examining the finished product to catch defects that already happened. QA works upstream, QC works downstream, and a mature project needs both, but they are not equally cheap. That is the real lesson of Cost of Quality (COQ). Prevention cost (building QA in) and Appraisal cost (the inspection itself, QC) are relatively cheap — a checklist, a code review, a test pass. Internal Failure cost (catching a defect before it ships) is more expensive — rework, re-testing, delay. External Failure cost (the customer finds it first) is the most expensive by far — reputation damage, emergency fixes, sometimes contractual penalties, on top of everything Internal Failure already costs. The core message of COQ is almost uncomfortably simple: every unit of currency spent on prevention saves multiples of that in failure cost later. A team that treats QA as overhead to be cut under deadline pressure is not saving money — it is deferring a much larger bill to a much worse moment.'
     ),
     'ar', jsonb_build_object(
       'title', 'الوقاية أرخص من الندم',
       'body', 'ضمان الجودة (QA) ومراقبة الجودة (QC) يبانوا زي بعض — مش كده، والفرق هو بيت القصيد. QA وقائي: العمليات اللي تحطها عشان توقف العيوب من الأساس — معايير، قوائم تحقق، مراجعات مبنية جوه سير العمل نفسه. QC فحص: تفحص المنتج النهائي عشان تمسك عيوب حصلت بالفعل. QA يشتغل من فوق (upstream)، QC يشتغل من تحت (downstream)، والمشروع الناضج محتاج الاتنين، لكن مش بنفس التكلفة. دي الرسالة الحقيقية لتكلفة الجودة (COQ). تكلفة الوقاية (Prevention — بناء QA) وتكلفة الفحص (Appraisal — QC نفسه) رخيصة نسبيًا — قائمة تحقق، مراجعة كود، اختبار. تكلفة الفشل الداخلي (Internal Failure — اكتشاف عيب قبل التسليم) أغلى — إعادة عمل، إعادة اختبار، تأخير. تكلفة الفشل الخارجي (External Failure — العميل هو اللي يكتشفه أول) الأغلى بكثير — ضرر بالسمعة، إصلاحات طارئة، أحيانًا غرامات تعاقدية، فوق كل تكلفة الفشل الداخلي أصلًا. الرسالة الجوهرية لـCOQ بسيطة لحد الحرج: كل وحدة عملة تصرفها في الوقاية توفّر أضعافها في تكلفة الفشل لاحقًا. الفريق اللي يتعامل مع QA كأنها عبء ممكن يتقطع تحت ضغط الديدلاين مش بيوفّر فلوس — هو بس بيأجّل فاتورة أكبر بكثير لوقت أسوأ بكثير.'
     )
   ));

  raise notice '054 OK: Unit 4 / Lesson 4.1 planted under Level 2 course %', v_course_id;
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
    raise exception '054 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 5 then
    raise exception '054 failed: expected 5 modules (Unit 0-4), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 5 then
    raise exception '054 failed: expected 5 lessons total (0.1, 1.1, 2.1, 3.1, 4.1), found %', v_lessons;
  end if;

  select count(*) into v_not_approved from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id
     and l.review_status is distinct from 'approved';
  if v_not_approved > 0 then
    raise exception '054 failed: % Level 2 lesson(s) not approved (would be invisible to students)', v_not_approved;
  end if;

  raise notice '054 OK: 5 modules, 5 lessons, all approved, for Level 2 course %', v_course_id;
end $$;
