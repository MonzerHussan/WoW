-- ============================================================
-- WOW - World of Work — Migration 048
-- Level 2 content, Unit 1 — "Scope Management" (6 hours), Lesson 1.1
-- ("Defining What's In (and Out)"). Adds a new module + lesson under
-- the SAME Level 2 course 047 created (looked up by title, same pattern
-- 047's own self-check uses).
--
-- The lesson body itself is authored here from the owner's content
-- outline (not a full verbatim paragraph this round, unlike Unit 0) —
-- expanding "Charter scope is approximate → Scope Statement is precise
-- → WBS is hierarchical decomposition down to Charter deliverables as
-- roots" into full EN/AR prose matching the established tone.
--
-- This unit's real deliverable (a learner-built WBS in project_wbs_items
-- + a decision_log reflection via LessonReflectionForm) is NOT wired
-- into this lesson yet — the interactive WBS-builder component is still
-- a pending design (sent for review separately, not built), and wiring
-- either exercise into the live lesson page requires resolving "which
-- of the learner's projects" first (deferred alongside the unlock-
-- condition system per the owner's own Unit 0 decision). This migration
-- only plants the lesson's reading content.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod1 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '048 failed: Level 2 course not found — run 047 first';
  end if;

  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- MODULE — Unit 1
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod1, v_course_id, 'Unit 1: Scope Management', 1);

  -- ============================================================
  -- UNIT 1 — LESSON 1.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod1, 'Lesson 1.1: Defining What''s In (and Out)', 1, 360, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Scope creep', 'ar', 'زحف النطاق'),
       jsonb_build_object('en', 'Work package', 'ar', 'حزمة عمل'),
       jsonb_build_object('en', 'Decomposition', 'ar', 'تجزئة'),
       jsonb_build_object('en', 'Scope baseline', 'ar', 'خط أساس النطاق'),
       jsonb_build_object('en', 'Acceptance criteria', 'ar', 'معايير القبول'),
       jsonb_build_object('en', 'Out of scope', 'ar', 'خارج النطاق'),
       jsonb_build_object('en', 'Requirements traceability', 'ar', 'تتبّع المتطلبات')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Exception & Condition Connectors',
       'title_ar', 'روابط الاستثناء والشرط',
       'explanation_ar', 'أربع أدوات أساسية للتعبير عن الاستثناء والشرط في سياق تحديد النطاق. "unless" (إلا إذا) شرط سلبي يعني نفس معنى "if...not" لكن بصياغة أوضح واحترافية أكثر — "This is out of scope unless the Sponsor approves a change request" تساوي "...if the Sponsor does not approve...". "provided that" و"as long as" (بشرط أن) يضعان شرطًا إيجابيًا لازمًا لتحقق نتيجة. "except for" (باستثناء) تُستخدم لاستبعاد عنصر واحد من قاعدة عامة. الفرق الجوهري بين "unless" و"if": "unless" يقلب الشرط تلقائيًا (عكس if...not)، فاستخدامه في جملة فيها نفي بالفعل يُنتج ازدواج نفي مربك — لا تكتب "unless the budget is not approved"، اكتب إما "unless the budget is approved" أو "if the budget is not approved".',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'This is out of scope unless the Sponsor approves a change request.', 'ar', 'هذا خارج النطاق إلا إذا وافق الراعي على طلب تغيير.'),
         jsonb_build_object('en', 'We will deliver on time, provided that resources are confirmed by Friday.', 'ar', 'سنُسلِّم في الموعد، بشرط تأكيد الموارد بحلول الجمعة.'),
         jsonb_build_object('en', 'All modules are in scope, except for the mobile app, which is Phase 2.', 'ar', 'كل الوحدات ضمن النطاق، باستثناء تطبيق الموبايل الذي يخص المرحلة الثانية.'),
         jsonb_build_object('en', 'As long as the scope statement is signed, the team can start estimating.', 'ar', 'طالما بيان النطاق موقَّع، يمكن للفريق البدء بالتقدير.')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'Defining What''s In (and Out)',
       'body', 'Your Charter''s scope is a sketch, not a blueprint. It names your deliverables in broad strokes — enough to get approval, not enough to hand a task to anyone. A Scope Statement fixes that: it states precisely what is included, what is explicitly excluded, and the acceptance criteria that prove a deliverable is actually done — not just delivered. From there, you build a Work Breakdown Structure (WBS): a hierarchical decomposition where each level breaks the one above it into smaller work packages, continuing until you reach a level small enough to estimate confidently and assign to one person or team. Your Charter''s own deliverables are not a separate step here — they are the roots of your WBS. Everything else you add underneath is simply that same scope, broken down until it becomes buildable.'
     ),
     'ar', jsonb_build_object(
       'title', 'تحديد ما هو داخل النطاق (وما هو خارجه)',
       'body', 'نطاق ميثاقك مجرد رسم تخطيطي، لا مخطط تفصيلي. يذكر مخرجاتك بخطوط عريضة — يكفي لاعتماده، لا يكفي لتكليف أحد بمهمة منه. بيان النطاق (Scope Statement) يصحح هذا: يحدد بدقة ما هو مُدرَج، وما هو مُستبعَد صراحة، ومعايير القبول التي تثبت أن المخرج اكتمل فعلًا لا أنه سُلِّم فقط. من هناك، تبني هيكل تجزئة العمل (WBS): تفصيل هرمي، كل مستوى فيه يقسّم المستوى الذي فوقه إلى حزم عمل أصغر، ويستمر هذا حتى تصل لمستوى صغير بما يكفي لتقديره بثقة وتكليف شخص أو فريق واحد به. مخرجات ميثاقك نفسها ليست خطوة منفصلة هنا — هي جذور الـWBS بالضبط. كل ما تضيفه تحتها هو نفس النطاق، مُفصَّلًا حتى يصبح قابلًا للتنفيذ.'
     )
   ));

  raise notice '048 OK: Unit 1 / Lesson 1.1 planted under Level 2 course %', v_course_id;
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
    raise exception '048 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 2 then
    raise exception '048 failed: expected 2 modules (Unit 0 + Unit 1), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 2 then
    raise exception '048 failed: expected 2 lessons total (0.1 + 1.1), found %', v_lessons;
  end if;

  raise notice '048 OK: 2 modules, 2 lessons confirmed for Level 2 course %', v_course_id;
end $$;
