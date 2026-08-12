-- ============================================================
-- WOW - World of Work — Migration 053
-- Level 2 content, Unit 3 — "Cost Management (EVM)" (8 hours), Lesson
-- 3.1 ("Reading the Numbers Before They Read You"). New module under
-- the same Level 2 course (047/048/051), same authoring pattern.
--
-- `review_status` is set to 'approved' DIRECTLY in this insert — 052
-- had to backfill this after the fact for 047/048/051 (the RESTRICTIVE
-- "Lessons: pending shared-curriculum review hidden from students"
-- policy, 015c, hides anything else from ordinary enrolled students).
-- Not repeating that miss here.
--
-- No new UI component — reuses LessonReflectionForm (CPI/SPI + response
-- reasoning → decision_log) and the already-built, already-verified EVM
-- Simulator game as this unit's closing evaluation, same pattern Unit 2
-- established.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod3 uuid := uuid_generate_v4();
  v_skill_planning uuid;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تخطيط ومراقبة المشاريع — المستوى الثاني';
  if v_course_id is null then
    raise exception '053 failed: Level 2 course not found — run 047/048/051 first';
  end if;

  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';

  -- ============================================================
  -- MODULE — Unit 3
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod3, v_course_id, 'Unit 3: Cost Management (EVM)', 3);

  -- ============================================================
  -- UNIT 3 — LESSON 3.1
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (v_mod3, 'Lesson 3.1: Reading the Numbers Before They Read You', 1, 480, false, 'approved',
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en', 'Planned Value (PV)', 'ar', 'القيمة المخطَّطة'),
       jsonb_build_object('en', 'Earned Value (EV)', 'ar', 'القيمة المكتسبة'),
       jsonb_build_object('en', 'Actual Cost (AC)', 'ar', 'التكلفة الفعلية'),
       jsonb_build_object('en', 'Cost Variance (CV)', 'ar', 'انحراف التكلفة'),
       jsonb_build_object('en', 'Schedule Variance (SV)', 'ar', 'انحراف الجدول'),
       jsonb_build_object('en', 'Cost Performance Index (CPI)', 'ar', 'مؤشر أداء التكلفة'),
       jsonb_build_object('en', 'Schedule Performance Index (SPI)', 'ar', 'مؤشر أداء الجدول'),
       jsonb_build_object('en', 'Estimate at Completion (EAC)', 'ar', 'التقدير عند الإكمال')
     ),
     'skill_id', v_skill_planning,
     'grammar_point', jsonb_build_object(
       'title_en', 'Modal Verbs of Deduction',
       'title_ar', 'أفعال الاستنتاج الشرطية',
       'explanation_ar', 'دي مختلفة تمامًا عن "must" الإلزام اللي اتغطى في المستوى الأول — هنا الاستخدام للاستنتاج من دليل رقمي فعلي، وهو بالظبط اللي EVM تتطلبه. "must be" تُستخدم لاستنتاج شبه مؤكَّد مبني على دليل قوي قدامك. "might be"/"could be" تُستخدما لاحتمال لا يقين — أكتر من تفسير ممكن يكون صحيح. "can''t be" تُستخدم لاستبعاد كامل مبني على دليل يناقض الاحتمال ده صراحة. الفرق الجوهري عن "must" العادي: مفيش هنا أمر ولا واجب — دي درجة يقين مبنية على أرقام فعلية قدامك، لا تعليمة لحد يفعل حاجة.',
       'examples', jsonb_build_array(
         jsonb_build_object('en', 'CPI is 0.75 — costs must be significantly over budget.', 'ar', 'CPI طلع 0.75 — التكلفة لازم تكون فوق الميزانية بشكل كبير.'),
         jsonb_build_object('en', 'This delay might be a resourcing issue, or it could be a scope change we missed.', 'ar', 'التأخير ده ممكن يكون مشكلة موارد، أو ممكن يكون تغيير نطاق فاتنا.'),
         jsonb_build_object('en', 'With SPI at 1.1, we can''t be behind schedule.', 'ar', 'بـSPI عند 1.1، مستحيل نكون متأخرين عن الجدول.')
       )
     )
   ),
   jsonb_build_object(
     'en', jsonb_build_object(
       'title', 'Reading the Numbers Before They Read You',
       'body', 'Three numbers turn "I feel like we''re behind" into an actual, defensible statement. Planned Value (PV) is what your plan says should be done by today — a number pulled straight from your schedule, not from how things actually went. Earned Value (EV) is the value of what has ACTUALLY been completed so far, measured the same way. Actual Cost (AC) is what you have really spent to get there. From these three, everything else follows. Cost Variance (CV = EV − AC) tells you whether you are over or under budget in absolute terms. Schedule Variance (SV = EV − PV) tells you the same for time. But the two numbers that matter most are ratios, not differences: Cost Performance Index (CPI = EV / AC) and Schedule Performance Index (SPI = EV / PV). The rule is almost embarrassingly simple once you know it: below 1 means a problem — costs are running high, or the schedule is slipping. Above 1 means you are doing better than planned. Exactly 1 means you are precisely on track. When CPI or SPI comes back below 1, you already met the tools for responding to it in the last unit: Crashing (add resources, usually at higher cost) or Fast Tracking (run tasks in parallel, usually at higher risk). These indices are not just diagnosis — they are what tells you whether reaching for one of those tools is actually justified, or premature.'
     ),
     'ar', jsonb_build_object(
       'title', 'قراءة الأرقام قبل ما هي تقرأك',
       'body', 'ثلاثة أرقام بتحوّل "حاسس إننا متأخرين" لجملة فعلية قابلة للدفاع عنها. القيمة المخطَّطة (PV) هي اللي خطتك بتقول لازم يكون اتعمل لحد النهارده — رقم مسحوب مباشرة من جدولك الزمني، مش من إزاي الأمور سارت فعليًا. القيمة المكتسبة (EV) هي قيمة اللي اتعمل فعليًا لحد دلوقتي، بنفس طريقة القياس. التكلفة الفعلية (AC) هي اللي صرفته فعلًا عشان توصل لهنا. من التلاتة دول، كل حاجة تانية بتتبع. انحراف التكلفة (CV = EV − AC) بيقولك لو أنت فوق أو تحت الميزانية بالقيمة المطلقة. انحراف الجدول (SV = EV − PV) بيقولك نفس الحاجة للوقت. لكن أهم رقمين هما نسبتان، لا فروق: مؤشر أداء التكلفة (CPI = EV / AC) ومؤشر أداء الجدول (SPI = EV / PV). القاعدة بسيطة تقريبًا لما تعرفها: أقل من 1 يعني مشكلة — التكلفة عالية، أو الجدول بيتأخر. أكتر من 1 يعني أداء أحسن من المخطط. بالظبط 1 يعني أنت بالضبط على المسار الصح. لما CPI أو SPI يطلعوا أقل من 1، أنت خدت الأدوات اللازمة للاستجابة من الوحدة اللي فاتت: الإسراع (Crashing — إضافة موارد، غالبًا بتكلفة أعلى) أو المسارات المتوازية (Fast Tracking — تنفيذ مهام بالتوازي، غالبًا بمخاطرة أعلى). المؤشرات دي مش تشخيص بس — هي اللي بتقولك هل اللجوء لأداة من دول مبرَّر فعلًا، ولا سابق لأوانه.'
     )
   ));

  raise notice '053 OK: Unit 3 / Lesson 3.1 planted under Level 2 course %', v_course_id;
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
    raise exception '053 failed: Level 2 course row not found';
  end if;

  select count(*) into v_modules from public.modules where course_id = v_course_id;
  if v_modules <> 4 then
    raise exception '053 failed: expected 4 modules (Unit 0-3), found %', v_modules;
  end if;

  select count(*) into v_lessons from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id;
  if v_lessons <> 4 then
    raise exception '053 failed: expected 4 lessons total (0.1, 1.1, 2.1, 3.1), found %', v_lessons;
  end if;

  select count(*) into v_not_approved from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.course_id = v_course_id
     and l.review_status is distinct from 'approved';
  if v_not_approved > 0 then
    raise exception '053 failed: % Level 2 lesson(s) not approved (would be invisible to students)', v_not_approved;
  end if;

  raise notice '053 OK: 4 modules, 4 lessons, all approved, for Level 2 course %', v_course_id;
end $$;
