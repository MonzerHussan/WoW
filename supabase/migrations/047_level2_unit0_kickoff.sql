-- ============================================================
-- WOW - World of Work — Migration 047
-- Level 2 (Project Planning & Control) course content, Unit 0 —
-- "Project Planning Kickoff" (2 hours). Content authored by the owner
-- directly and pasted for planting, same division of labor as 019's own
-- grammar points: Claude Code applies and verifies, does not invent the
-- pedagogical content. Mirrors migration 009's exact shape (one fresh
-- `courses` row, `modules` → `lessons`, `content`/`translations` jsonb)
-- rather than the dead `pmp_levels` table from schema.sql (confirmed
-- unused by any application code during the Level 2 research pass).
--
-- DECISION FLAGGED, NOT SILENTLY MADE: `is_published = true` even
-- though only Unit 0 of ~8 exists so far. The alternative
-- (is_published = false) would make the course invisible under RLS to
-- EVERYONE, including real live-testing through the actual UI — this
-- codebase's whole verification discipline depends on that. No public
-- users exist on this project yet (still Monzer's private testing
-- phase), so a visibly-partial in-progress course carries no real
-- exposure risk today. Flip to false before any real public launch if
-- the remaining units aren't ready by then — revisit explicitly, don't
-- forget silently.
--
-- GAP FLAGGED, NOT BUILT HERE: the brief's own access rule — "do not
-- show this unit to a learner whose project_charters.is_approved isn't
-- true yet" — is NOT enforced anywhere by this migration. No existing
-- mechanism in the LMS gates a module/lesson on an unrelated table's
-- data (existing gates are is_published, enrollment, and
-- is_free_preview only). This needs its own small design decision
-- (ideally a reusable "unlock condition" concept, since more Level 2+
-- units will likely need similar prerequisite gates) rather than a
-- one-off special case bolted onto the general course-fetching code.
-- Not done here — flagged for a follow-up pass before this unit is
-- shown to a real learner.
--
-- ALSO NOT BUILT HERE: the in-lesson exercise itself ("write 3 real
-- sentences about your project's next step, one per future-form,
-- saved to decision_log"). LessonView.tsx (verified generic — renders
-- any course, not Level-1-specific) has no content type for a
-- write-and-save-to-decision_log exercise; grammar_point/vocabulary/
-- module_closing all render already with zero new code, but this
-- exercise type does not exist yet. decision_log's own RLS ("owner
-- adds entries") already permits a learner to insert directly once a
-- UI exists — no new migration needed for THAT part, only a new
-- component.
-- ============================================================

do $$
declare
  v_course_id uuid := uuid_generate_v4();
  v_mod0 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- COURSE
  -- ============================================================
  insert into public.courses (id, title, track, summary, owner_type, owner_id, language, is_published)
  values (
    v_course_id,
    'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني',
    'education',
    'Certified Project Planning & Control Professional. Builds directly on Level 1''s approved Project Charter. 45-50 content hours across seven planning dimensions (Scope, Schedule & Resources, Cost/EVM, Quality, Risk, Agile tools, Integration) plus a Final Boss crisis simulation. Professional title on completion: Project Planning Specialist.',
    null, null,
    'ar',
    true
  );

  -- ============================================================
  -- MODULES (only Unit 0 exists so far — more arrive incrementally)
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod0, v_course_id, 'Unit 0: Project Planning Kickoff', 0);

  -- ============================================================
  -- UNIT 0 — LESSON 0.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod0, 'Lesson 0.1: From Charter to Plan', 1, 120, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Baseline', 'ar', 'خط الأساس'),
       jsonb_build_object('en', 'Milestone', 'ar', 'معلَم'),
       jsonb_build_object('en', 'Contingency', 'ar', 'احتياطي'),
       jsonb_build_object('en', 'Deliverable', 'ar', 'مخرج'),
       jsonb_build_object('en', 'Progressive elaboration', 'ar', 'التفصيل التدريجي'),
       jsonb_build_object('en', 'Rolling wave planning', 'ar', 'التخطيط الموجي المتدحرج')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Future Forms for Plans and Predictions',
       'title_ar', 'صيغ المستقبل للخطط والتوقعات',
       'explanation_ar', 'الفرق بين ثلاث طرق للحديث عن المستقبل يستخدمه أي مدير مشروع كل يوم. "will": قرار لحظي أو توقع مبني على رأي/خبرة، مش خطة مؤكَّدة — مثال: "I think this task will take longer than we estimated." "going to": نية مؤكَّدة أو توقع مبني على دليل حالي واضح — مثال: "We are going to exceed the budget — the invoices already show it." المضارع المستمر (present continuous): ترتيب مؤكَّد بموعد محدد، زي جدول أعمال حقيقي — مثال: "The Sponsor is reviewing the WBS on Thursday." الخطأ الشائع: استخدام "will" لترتيبات مؤكَّدة بالفعل (زي اجتماعات مجدولة) — ده يوحي بعدم يقين مش موجود فعليًا. مدير مشروع محترف يقول "The kickoff meeting is happening next Monday" مش "will happen"، لأنه ترتيب مؤكَّد لا توقع.',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'I think this task will take longer than we estimated.', 'ar', 'أظن أن هذه المهمة ستستغرق وقتًا أطول مما قدّرنا.'),
         jsonb_build_object('en', 'We are going to exceed the budget — the invoices already show it.', 'ar', 'نحن على وشك تجاوز الميزانية — الفواتير تُظهر ذلك بالفعل.'),
         jsonb_build_object('en', 'The Sponsor is reviewing the WBS on Thursday.', 'ar', 'يراجع الراعي هيكل تجزئة العمل يوم الخميس.'),
         jsonb_build_object('en', 'The kickoff meeting is happening next Monday, not "will happen".', 'ar', 'اجتماع الانطلاق يحدث الاثنين القادم — لا "سيحدث".')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'From Charter to Plan',
       'body', 'You finished Level 1 with something real: a Charter. It has a Sponsor, a Core Team, a vision, and objectives. But here is an uncomfortable truth every project manager learns the hard way — a Charter tells you what you are building and why. It does not tell you how you will actually get there. Think of it this way: the Charter is the destination on a map. The Plan is the route — the roads you will take, how long each leg takes, who is driving, and what you will do if a road is closed. In this level, you will build that route across seven dimensions: Scope (exactly what is included, and what is not), Schedule and Resources (who does what, and when), Cost (how you track spending against value), Quality (how you know "done" actually means "good"), Risk (what could go wrong, and your response), Agile tools (how to stay flexible when plans meet reality), and Integration (how all of these become one coherent plan instead of seven disconnected documents). By the end, your Living Project will not just have a Charter — it will have a real, defensible plan. And then, in the Final Boss, that plan will be tested against a crisis you do not get to see coming.'
     ),
     'ar', jsonb_build_object(
       'title', 'من الميثاق إلى الخطة',
       'body', 'أنهيت المستوى الأول بشيء حقيقي: ميثاق. له راعٍ، فريق أساسي، رؤية، وأهداف. لكن هناك حقيقة غير مريحة يتعلمها كل مدير مشروع بالطريقة الصعبة — الميثاق يخبرك بما تبنيه ولماذا. لا يخبرك كيف ستصل فعليًا. فكّر فيها هكذا: الميثاق هو الوجهة على الخريطة. الخطة هي المسار — الطرق التي ستسلكها، مدة كل مرحلة، من يقود، وماذا ستفعل لو أُغلق طريق. في هذا المستوى، ستبني هذا المسار عبر سبعة أبعاد: النطاق (ما المُدرَج بالضبط، وما ليس كذلك)، الجدول والموارد (من يفعل ماذا، ومتى)، التكلفة (كيف تتابع الإنفاق مقابل القيمة)، الجودة (كيف تعرف أن "التمام" يعني فعلًا "الجودة")، المخاطر (ما الذي قد يُخطئ، واستجابتك له)، أدوات الرشاقة (كيف تبقى مرنًا حين تصطدم الخطط بالواقع)، والتكامل (كيف تصبح كل هذه خطة واحدة متماسكة بدل سبع وثائق منفصلة). بنهاية هذا المستوى، لن يكون لمشروعك الحي ميثاق فقط — بل خطة حقيقية قابلة للدفاع عنها. وبعدها، في Final Boss، ستُختبر تلك الخطة أمام أزمة لن تراها قادمة.'
     )
   ));

  raise notice '047 OK: Level 2 course % created with Unit 0 / Lesson 0.1 planted', v_course_id;
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
    raise exception '047 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 1 then
    raise exception '047 failed: expected 1 module (Unit 0), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 1 then
    raise exception '047 failed: expected 1 lesson (0.1), found %', v_lessons;
  end if;

  raise notice '047 OK: 1 module, 1 lesson confirmed for Level 2 course %', v_course_id;
end $$;
