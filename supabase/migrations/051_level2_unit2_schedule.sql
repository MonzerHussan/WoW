-- ============================================================
-- WOW - World of Work — Migration 051
-- Level 2 content, Unit 2 — "Schedule & Resources" (8 hours), Lesson 2.1
-- ("From Packages to a Timeline"). New module under the same Level 2
-- course (047/048), same authoring pattern.
--
-- No new UI component — the owner's own note: this unit's exercise
-- reuses LessonReflectionForm (critical-path decision → decision_log)
-- and the already-built, already-verified Resource Optimizer game as
-- its closing evaluation activity. Content-only migration.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod2 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '051 failed: Level 2 course not found — run 047/048 first';
  end if;

  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- MODULE — Unit 2
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod2, v_course_id, 'Unit 2: Schedule & Resources', 2);

  -- ============================================================
  -- UNIT 2 — LESSON 2.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod2, 'Lesson 2.1: From Packages to a Timeline', 1, 480, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Critical path', 'ar', 'المسار الحرج'),
       jsonb_build_object('en', 'Float (slack)', 'ar', 'الوقت الفائض (Float/Slack)'),
       jsonb_build_object('en', 'Dependency', 'ar', 'تبعية'),
       jsonb_build_object('en', 'Network diagram', 'ar', 'مخطط الشبكة'),
       jsonb_build_object('en', 'Resource leveling', 'ar', 'تسوية الموارد'),
       jsonb_build_object('en', 'Resource smoothing', 'ar', 'تنعيم الموارد'),
       jsonb_build_object('en', 'Crashing', 'ar', 'الإسراع (Crashing)'),
       jsonb_build_object('en', 'Fast tracking', 'ar', 'المسارات المتوازية (Fast Tracking)')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Double Comparatives for Trade-offs',
       'title_ar', 'صيغة المقارنة المزدوجة للمفاضلات',
       'explanation_ar', 'صيغة "The + مقارنة..., the + مقارنة..." تعبّر عن علاقة تناسبية بين متغيّرين — كل ما اتغيّر الأول، اتغيّر التاني معاه. الفرق الجوهري عن مقارنة عادية (bigger, smaller): المقارنة العادية تقارن شيئين ثابتين ("Task A is bigger than Task B")، لكن الصيغة المزدوجة دي تربط تغيّرين مع بعض في علاقة سبب-نتيجة مستمرة، لا مقارنة لحظية. تُستخدم كثيرًا في قرارات الموارد لأنها تلخّص مفاضلة (Trade-off) كاملة في جملة واحدة.',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'The more resources we assign to Task A, the more we risk starving Task B.', 'ar', 'كل ما خصّصنا موارد أكتر للمهمة A، كل ما زاد خطر تجويع المهمة B من الموارد.'),
         jsonb_build_object('en', 'The earlier we identify the critical path, the easier it is to protect it.', 'ar', 'كل ما حددنا المسار الحرج بدري، كل ما كان أسهل نحميه.'),
         jsonb_build_object('en', 'The tighter the schedule, the less float we have for surprises.', 'ar', 'كل ما كان الجدول أضيق، كل ما قلّ الـFloat المتاح للمفاجآت.')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'From Packages to a Timeline',
       'body', 'Your WBS answers "what needs to happen." Scheduling answers a harder question: "when, and in what order." Two work packages rarely stand alone — one usually needs another finished first. That relationship is a dependency, and the most common type by far is Finish-to-Start: Task B cannot start until Task A finishes. Chain enough of these dependencies together and one path through your project will be longer than any other — that is your Critical Path, the sequence of linked tasks that determines the shortest possible time your project can take. Any delay on a critical-path task delays the whole project, with no exceptions. Tasks NOT on the critical path carry Float (also called Slack): the amount of time they can slip without pushing back your final delivery date. Look at the work packages you actually built in your WBS last unit — some of them depend on others finishing first, and tracing that chain is exactly how you find your own critical path. Two ideas worth meeting now, even though you will not use them until later units. Resource Leveling delays tasks to avoid overloading a resource — and because it can push out task dates, it can change your critical path. Resource Smoothing solves the same overload problem without touching the critical path at all, using only the float already available in non-critical tasks. And when a schedule needs to move faster: Crashing adds resources to compress it (usually at higher cost), while Fast Tracking runs tasks in parallel that were originally planned sequentially (usually at higher risk). You will meet Crashing and Fast Tracking again as real decisions in the EVM Simulator game in the next unit — what you learn about them here is what makes that choice a real one, not a guess.'
     ),
     'ar', jsonb_build_object(
       'title', 'من الحزم إلى جدول زمني',
       'body', 'WBS بتاعك بيجاوب على "إيه المطلوب". الجدولة بتجاوب على سؤال أصعب: "امتى، وبأي ترتيب". نادرًا ما تقف حزمتا عمل منفصلتين تمامًا — غالبًا واحدة محتاجة التانية تخلص الأول. العلاقة دي اسمها تبعية (dependency)، وأشيع نوع بيها هو Finish-to-Start: المهمة B متقدرش تبدأ لحد ما المهمة A تخلص. اربط عدد كافٍ من التبعيات دي مع بعض، وهتلاقي مسار واحد جوه مشروعك أطول من أي مسار تاني — ده هو المسار الحرج (Critical Path)، سلسلة المهام المترابطة اللي تحدّد أقل وقت ممكن ياخده مشروعك. أي تأخير في مهمة على المسار الحرج يؤخّر المشروع كله، بلا استثناء. المهام اللي مش على المسار الحرج عندها Float (أو Slack): قد إيه تقدر تتأخر بلا ما تؤثر على تاريخ التسليم النهائي. بص على حزم العمل اللي بنيتها فعليًا في WBS بتاعك في الوحدة اللي فاتت — بعضها محتاج غيره يخلص الأول، وتتبع السلسلة دي بالظبط هو إزاي تلاقي المسار الحرج بتاعك انت. فكرتان يستاهلوا تتعرف عليهم دلوقتي، رغم إنك مش هتستخدمهم إلا في وحدات جاية. تسوية الموارد (Resource Leveling) تأجّل مهام عشان تتفادى تحميل مورد فوق طاقته — وعشان بتقدر تأخّر تواريخ مهام، ممكن تغيّر المسار الحرج بتاعك. تنعيم الموارد (Resource Smoothing) يحل نفس مشكلة التحميل الزائد بلا ما يمس المسار الحرج خالص، باستخدام الـFloat المتاح بس في المهام غير الحرجة. ولما الجدول يحتاج يتحرّك أسرع: الإسراع (Crashing) يضيف موارد عشان يضغط الجدول (غالبًا بتكلفة أعلى)، بينما المسارات المتوازية (Fast Tracking) ينفّذ مهام بالتوازي كانت مخطَّطة بالتتابع (غالبًا بمخاطرة أعلى). هتقابل Crashing وFast Tracking تاني كقرارات حقيقية في لعبة EVM Simulator بالوحدة الجاية — اللي هتتعلمه عنهم هنا هو اللي هيخلّي الاختيار ده حقيقي، مش تخمين.'
     )
   ));

  raise notice '051 OK: Unit 2 / Lesson 2.1 planted under Level 2 course %', v_course_id;
end $$;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_course_id uuid;
  v_modules int;
  v_lessons int;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '051 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 3 then
    raise exception '051 failed: expected 3 modules (Unit 0 + Unit 1 + Unit 2), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 3 then
    raise exception '051 failed: expected 3 lessons total (0.1 + 1.1 + 2.1), found %', v_lessons;
  end if;

  raise notice '051 OK: 3 modules, 3 lessons confirmed for Level 2 course %', v_course_id;
end $$;
