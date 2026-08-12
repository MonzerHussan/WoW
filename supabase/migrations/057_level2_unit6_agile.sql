-- ============================================================
-- WOW - World of Work — Migration 057
-- Level 2 content, Unit 6 — "Agile Tools" (6 hours), Lesson 6.1
-- ("Watching the Work Shrink"). New module under the same Level 2
-- course (047/048/051/053/054/055), same authoring pattern.
-- `review_status = 'approved'` set directly (052's lesson learned).
--
-- The unit's closing exercise (Burndown Reader) is a SEPARATE migration
-- (058) — pure content reuse of the existing kb_scoring_rules engine
-- (046), no new schema. This migration only plants the lesson's
-- reading content.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod6 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '057 failed: Level 2 course not found — run 047/048/051/053/054/055 first';
  end if;

  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- MODULE — Unit 6
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod6, v_course_id, 'Unit 6: Agile Tools', 6);

  -- ============================================================
  -- UNIT 6 — LESSON 6.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (v_mod6, 'Lesson 6.1: Watching the Work Shrink', 1, 360, false, 'approved',
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Sprint', 'ar', 'سبرنت'),
       jsonb_build_object('en', 'Backlog', 'ar', 'قائمة الأعمال المتراكمة (Backlog)'),
       jsonb_build_object('en', 'User story', 'ar', 'قصة المستخدم'),
       jsonb_build_object('en', 'Velocity', 'ar', 'السرعة (Velocity)'),
       jsonb_build_object('en', 'Burndown chart', 'ar', 'مخطط الإنجاز المتبقي (Burndown Chart)'),
       jsonb_build_object('en', 'Retrospective', 'ar', 'الاجتماع الاستعادي (Retrospective)'),
       jsonb_build_object('en', 'Sprint planning', 'ar', 'تخطيط السبرنت'),
       jsonb_build_object('en', 'Definition of done', 'ar', 'تعريف الاكتمال (Definition of Done)')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Present Perfect Continuous for Ongoing Iteration',
       'title_ar', 'المضارع التام المستمر للتكرار الجاري',
       'explanation_ar', 'مختلفة عن Present Perfect البسيط (اتغطى بداية المستوى الأول) — هنا التركيز على الاستمرارية والتكرار نفسه كعملية جارية، وهو جوهر الفكر الرشيق (Agile). البسيط يركّز على النتيجة النهائية ("We have finished 3 sprints")، أما المستمر فيركّز على العملية نفسها وهي مستمرة ("We have been running sprints"). الصيغة: have/has been + الفعل + ing.',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'We have been running two-week sprints since Module 6 started.', 'ar', 'بنشغّل سبرنتات أسبوعين من أول ما الوحدة 6 بدأت.'),
         jsonb_build_object('en', 'The team has been adjusting the backlog every sprint based on feedback.', 'ar', 'الفريق بيعدّل الـBacklog كل سبرنت بناءً على التغذية الراجعة.'),
         jsonb_build_object('en', 'Velocity has been improving steadily over the last three sprints.', 'ar', 'الـVelocity بتتحسّن باستمرار عبر آخر تلات سبرنتات.')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'Watching the Work Shrink',
       'body', 'Everything you''ve built through Units 1-5 — WBS, schedule, cost tracking, quality, risk — is predictive planning: you plan up front, then execute against that plan. Agile tools don''t replace that. They complement it, especially when requirements are likely to shift mid-project. (You''ll see exactly how the two blend into one deliberate approach — Hybrid — in Level 3.) A Sprint is a short, fixed-length work cycle, usually two weeks, at the end of which the team has something potentially shippable. The Backlog is the full list of everything the project might need, ranked by priority — it''s never "done," only reprioritized. A User Story describes a need from the end user''s own point of view, not a technical task list — it''s the difference between "add a login button" and "as a returning customer, I want to log in quickly so I don''t lose my saved cart." Velocity is how many story points a team reliably completes per sprint — not a target to hit, but a planning input based on real history. And a Burndown Chart tracks remaining work day by day across a sprint: an ideal line slopes straight down to zero, and any real deviation from it is visible immediately — which is exactly what makes it useful as an early-warning tool, not just a status report.'
     ),
     'ar', jsonb_build_object(
       'title', 'مراقبة تقلّص العمل',
       'body', 'كل حاجة بنيتها عبر الوحدات 1-5 — WBS، الجدول، تتبع التكلفة، الجودة، المخاطر — تخطيط تنبؤي: تخطط مقدمًا، ثم تنفّذ حسب الخطة دي. أدوات Agile مش بديل عن كده. هي مكمّلة له، خصوصًا لما المتطلبات يكون احتمال تتغيّر في نص المشروع. (هتشوف بالظبط إزاي الاتنين بيندمجوا في أسلوب واحد متعمَّد — Hybrid — في المستوى الثالث.) السبرنت دورة عمل قصيرة ثابتة المدة، عادة أسبوعين، في نهايتها الفريق عنده حاجة قابلة للتسليم فعليًا. الـBacklog هي قائمة كل حاجة المشروع ممكن يحتاجها، مرتّبة بالأولوية — أبدًا "خلصت"، بس بتتغيّر أولويتها. الـUser Story توصف احتياج من منظور المستخدم النهائي نفسه، مش قائمة مهام تقنية — الفرق بين "ضيف زرار تسجيل دخول" و"كعميل عائد، عايز أسجّل دخول بسرعة عشان ما أضيّعش عربة التسوق المحفوظة." الـVelocity هي عدد نقاط القصة اللي الفريق بيخلّصها بثبات كل سبرنت — مش هدف لازم توصله، بس مدخل تخطيط مبني على تاريخ حقيقي. وBurndown Chart بيتتبّع العمل المتبقي يوم بيوم عبر السبرنت: الخط المثالي بينزل مستقيم للصفر، وأي انحراف حقيقي عنه بيبان فورًا — وده بالظبط اللي يخلّيه أداة إنذار مبكر، مش بس تقرير حالة.'
     )
   ));

  raise notice '057 OK: Unit 6 / Lesson 6.1 planted under Level 2 course %', v_course_id;
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
    raise exception '057 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 7 then
    raise exception '057 failed: expected 7 modules (Unit 0-6), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 7 then
    raise exception '057 failed: expected 7 lessons total (0.1 through 6.1), found %', v_lessons;
  end if;

  select count(*) into v_not_approved from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id
     and l.review_status is distinct from 'approved';
  if v_not_approved > 0 then
    raise exception '057 failed: % Level 2 lesson(s) not approved (would be invisible to students)', v_not_approved;
  end if;

  raise notice '057 OK: 7 modules, 7 lessons, all approved, for Level 2 course %', v_course_id;
end $$;
