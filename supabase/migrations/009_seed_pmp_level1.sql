-- ============================================================
-- WOW - World of Work — Seed Script 009
-- PMP Level 1: Certified Project Governance Fundamentals
--
-- Design choice: module-closing elements (optional language task,
-- Career DNA skills note, series episode tie-in, listening suggestion)
-- are embedded inside the LAST lesson of each module's `content` jsonb
-- under a "module_closing" key — no new columns/migration needed for
-- this content-only seed. Vocabulary and toolbox text also live in
-- `content` (language-neutral structure); `translations` holds only the
-- per-language title/body per the structure documented in migration 008.
--
-- This is additive data only — no schema changes. NOT safe to re-run
-- twice (will duplicate rows) since it has no ON CONFLICT guards.
-- Run once.
--
-- PRE-EXECUTION FIXES (verified against live schema before running —
-- two bugs that would have aborted this entire script):
--   1. courses.track is `course_track not null` with no default — the
--      original courses insert omitted it. Added track = 'education'
--      (confirmed with the requester; PMP is a training/certification
--      course, matching the platform's "تعليم" pillar).
--   2. quizzes has no `quiz_purpose` column anywhere in the schema
--      (004 defines quizzes; no later migration adds it) — removed it
--      from the quizzes insert. Not referenced by any application code
--      built in Sprint 3 either.
-- ============================================================

do $$
declare
  v_course_id uuid := uuid_generate_v4();
  v_mod1 uuid := uuid_generate_v4();
  v_mod2 uuid := uuid_generate_v4();
  v_mod3 uuid := uuid_generate_v4();
  v_mod4 uuid := uuid_generate_v4();
  v_mod5 uuid := uuid_generate_v4();
  v_mod6 uuid := uuid_generate_v4();
  v_quiz_id uuid := uuid_generate_v4();

  v_skill_planning uuid;
  v_skill_stakeholder uuid;
  v_skill_leadership uuid;
  v_skill_communication uuid;
begin

  -- Look up existing skill ids seeded in migration 004 (do not re-insert)
  select id into v_skill_planning from public.skills where name = 'تخطيط المشاريع';
  select id into v_skill_stakeholder from public.skills where name = 'إدارة أصحاب المصلحة';
  select id into v_skill_leadership from public.skills where name = 'القيادة';
  select id into v_skill_communication from public.skills where name = 'التواصل';

  -- ============================================================
  -- COURSE
  -- ============================================================
  insert into public.courses (id, title, track, summary, owner_type, owner_id, language, is_published)
  values (
    v_course_id,
    'معتمد أساسيات حوكمة المشاريع — PMP Level 1',
    'education',
    'Certified Project Governance Fundamentals. Aligned to the July 2026 PMP Examination Content Outline (PMBOK 8th Edition). 31 content hours, hybrid assessment, market job titles: Project Coordinator / PMO Assistant.',
    null, null,
    'ar',
    true
  );

  -- ============================================================
  -- MODULES
  -- ============================================================
  insert into public.modules (id, course_id, title, order_index) values
    (v_mod1, v_course_id, 'Module 1: Introduction to Project Management', 1),
    (v_mod2, v_course_id, 'Module 2: Project Charter & Stakeholders', 2),
    (v_mod3, v_course_id, 'Module 3: The Five Process Groups & PMBOK Principles', 3),
    (v_mod4, v_course_id, 'Module 4: Introduction to Agility — Scrum & Kanban', 4),
    (v_mod5, v_course_id, 'Module 5: Business Environment — Strategy, Value, and External Factors', 5),
    (v_mod6, v_course_id, 'Module 6: Extended Leadership Thread', 6);

  -- ============================================================
  -- MODULE 1 — LESSONS
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod1, 'Lesson 1.1: What Is a Project? Why Do Most Fail?', 1, 8, true,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Project','ar','مشروع'),
       jsonb_build_object('en','Operations','ar','عمليات تشغيلية'),
       jsonb_build_object('en','Scope','ar','نطاق'),
       jsonb_build_object('en','Deliverable','ar','مخرج'),
       jsonb_build_object('en','Stakeholder','ar','صاحب مصلحة')
     ),
     'skill_id', v_skill_planning
   ),
   jsonb_build_object(
     'en', jsonb_build_object('title','What Is a Project? Why Do Most Fail?','body','A project is a temporary endeavor — with a defined start and end — undertaken to create a unique product, service, or result. This differs fundamentally from ongoing operations, which repeat continuously with no fixed endpoint. According to PMI''s annual reports, over 70% of projects experience budget or schedule overruns. The most common causes aren''t technical — they''re managerial: unclear scope from day one, missing key stakeholders in decisions, and weak communication between team and client. This is exactly what this level prepares you to prevent.'),
     'ar', jsonb_build_object('title','ما هو المشروع؟ ولماذا يفشل أغلبها؟','body','المشروع جهد مؤقت (له بداية ونهاية محددتين) يُبذل لإنتاج نتيجة فريدة — منتج، خدمة، أو تغيير. هذا يختلف جوهريًا عن العمليات التشغيلية المستمرة التي تتكرر يوميًا بلا نهاية محددة. وفقًا لتقارير PMI السنوية، أكثر من 70% من المشاريع تواجه تجاوزًا في الميزانية أو الجدول الزمني. الأسباب الأكثر شيوعًا ليست تقنية، بل إدارية: نطاق غير واضح منذ البداية، غياب أصحاب المصلحة الرئيسيين عن القرار، وتواصل ضعيف بين الفريق والعميل.')
   )),
  (v_mod1, 'Lesson 1.2: Project Life Cycles — Predictive, Agile, and Hybrid', 2, 10, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Predictive','ar','تنبؤي'),
       jsonb_build_object('en','Agile','ar','مرن'),
       jsonb_build_object('en','Hybrid','ar','هجين'),
       jsonb_build_object('en','Sprint','ar','دورة عمل'),
       jsonb_build_object('en','Requirement','ar','متطلب')
     ), 'skill_id', v_skill_planning),
   jsonb_build_object(
     'en', jsonb_build_object('title','Project Life Cycles — Predictive, Agile, and Hybrid','body','Three models for managing the same project: Predictive plans everything upfront before execution — suited for fixed-requirement projects. Agile breaks work into short cycles (Sprints), adapting continuously. Hybrid blends both. No model is universally best; the choice depends on requirement clarity and expected change.'),
     'ar', jsonb_build_object('title','دورات حياة المشروع — Predictive وAgile وHybrid','body','ثلاثة نماذج لإدارة نفس المشروع: Predictive يخطط كل شيء مسبقًا قبل التنفيذ، مناسب للمشاريع ذات المتطلبات الثابتة. Agile يقسّم العمل لدورات قصيرة ويتكيف باستمرار. Hybrid يمزج الاثنين. لا نموذج أفضل مطلقًا؛ الاختيار يعتمد على وضوح المتطلبات ودرجة التغيير المتوقعة.')
   )),
  (v_mod1, 'Lesson 1.3: Introduction to PMBOK — From Processes to Principles', 3, 12, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Principle','ar','مبدأ'),
       jsonb_build_object('en','Performance Domain','ar','مجال أداء'),
       jsonb_build_object('en','Outcome','ar','نتيجة'),
       jsonb_build_object('en','Guideline','ar','إرشاد'),
       jsonb_build_object('en','Framework','ar','إطار عمل')
     ), 'skill_id', v_skill_planning,
     'module_closing', jsonb_build_object(
       'optional_language_task','Write a 100-word paragraph in English explaining, in your own words, the difference between predictive, agile, and hybrid project life cycles. Submit your draft to your Personal Companion for feedback.',
       'coin_cost', 5,
       'career_dna_skills','Project Fundamentals, Life Cycle Selection, PMBOK Literacy',
       'series_episode','Episode 1 — the pilot episode introducing the series'' recurring project team.',
       'listening_suggestion','Listen to the introductory episode discussing why projects fail.'
     )),
   jsonb_build_object(
     'en', jsonb_build_object('title','Introduction to PMBOK — From Processes to Principles','body','The modern PMBOK Guide (8th Edition, aligned to the July 2026 PMP exam) organizes project management around guiding principles and performance domains focused on outcomes, not rigid procedures. This reflects industry maturity: a successful PM doesn''t just follow a checklist — they understand why they''re doing it.'),
     'ar', jsonb_build_object('title','مقدمة PMBOK — من العمليات إلى المبادئ','body','الإصدار الثامن من PMBOK (المتوافق مع امتحان يوليو 2026) ينظم إدارة المشاريع حول مبادئ توجيهية ومجالات أداء تركز على النتائج لا الإجراءات الجامدة. هذا يعكس نضج الصناعة: مدير المشروع الناجح لا يتبع قائمة تحقق فحسب، بل يفهم لماذا يفعل ما يفعله.')
   ));

  -- ============================================================
  -- MODULE 2 — LESSONS
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod2, 'Lesson 2.1: The Project Charter — The Birth Certificate of a Project', 1, 15, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Charter','ar','ميثاق'),
       jsonb_build_object('en','Sponsor','ar','الراعي'),
       jsonb_build_object('en','Assumption','ar','افتراض'),
       jsonb_build_object('en','Constraint','ar','قيد'),
       jsonb_build_object('en','Authority','ar','صلاحية')
     ),
     'toolbox_en','To develop the Charter, a project manager typically uses: Facilitation techniques (guiding workshops with the sponsor to surface requirements), Data Analysis (reviewing the business case and feasibility data), and Expert Judgment (consulting experienced colleagues or subject-matter experts).',
     'toolbox_ar','لتطوير الميثاق، يستخدم مدير المشروع: التيسير (توجيه ورش عمل مع الراعي)، تحليل البيانات (مراجعة حالة العمل التجارية)، والحكم الخبير (استشارة زملاء ذوي خبرة).',
     'skill_id', v_skill_planning
   ),
   jsonb_build_object(
     'en', jsonb_build_object('title','The Project Charter — The Birth Certificate of a Project','body','The Project Charter is the formal document that authorizes the project''s existence and grants the PM authority to use organizational resources. It contains: purpose, key deliverables, success criteria, key stakeholders, budget estimate, initial risks, Assumptions (things we take to be true) and Constraints (limits we must work within, e.g. "the project cannot exceed $100,000"). Without a signed charter, you have no formal authority — the most common beginner mistake is starting execution before charter approval.'),
     'ar', jsonb_build_object('title','ميثاق المشروع — وثيقة الميلاد','body','الميثاق هو الوثيقة الرسمية التي تُعلن وجود المشروع وتمنح مدير المشروع صلاحية استخدام موارد المؤسسة. يحتوي: الهدف، المخرجات الرئيسية، معايير النجاح، أصحاب المصلحة، الميزانية التقديرية، المخاطر الأولية، الافتراضات، والقيود. بلا ميثاق موقّع، لا صلاحية رسمية — أكبر خطأ للمبتدئين هو البدء بالتنفيذ قبل اعتماد الميثاق.')
   )),
  (v_mod2, 'Lesson 2.2: Who Are the Stakeholders?', 2, 12, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Stakeholder','ar','صاحب مصلحة'),
       jsonb_build_object('en','Regulator','ar','جهة تنظيمية'),
       jsonb_build_object('en','Influence','ar','تأثير'),
       jsonb_build_object('en','Register','ar','سجل'),
       jsonb_build_object('en','Identification','ar','تحديد')
     ), 'skill_id', v_skill_stakeholder),
   jsonb_build_object(
     'en', jsonb_build_object('title','Who Are the Stakeholders?','body','A stakeholder is anyone affected by, or able to affect, the project — not just client and team, but: senior management, suppliers, regulators, sometimes even the local community. The costliest PM mistake is forgetting an influential stakeholder — they surface later with opposition that can halt the entire project.'),
     'ar', jsonb_build_object('title','من هم أصحاب المصلحة؟','body','صاحب المصلحة هو أي فرد أو جهة تتأثر بالمشروع أو تؤثر فيه — ليس فقط العميل والفريق، بل الإدارة العليا والموردون والجهات التنظيمية وأحيانًا المجتمع المحلي. أكبر خطأ هو نسيان صاحب مصلحة مؤثر يظهر لاحقًا بمعارضة قد توقف المشروع.')
   )),
  (v_mod2, 'Lesson 2.3: The Power/Interest Grid', 3, 14, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Power','ar','قوة'),
       jsonb_build_object('en','Interest','ar','اهتمام'),
       jsonb_build_object('en','Quadrant','ar','ربع/فئة'),
       jsonb_build_object('en','Grid','ar','مصفوفة'),
       jsonb_build_object('en','Engagement','ar','إشراك')
     ), 'skill_id', v_skill_stakeholder),
   jsonb_build_object(
     'en', jsonb_build_object('title','The Power/Interest Grid','body','A tool classifying stakeholders on two axes: Power (ability to influence) and Interest (level of concern with outcomes). Four quadrants: high power+high interest = manage closely; high power+low interest = keep satisfied; low power+high interest = keep informed; low power+low interest = monitor with minimal effort.'),
     'ar', jsonb_build_object('title','مصفوفة القوة والاهتمام','body','أداة تصنّف أصحاب المصلحة على محورين: القوة والاهتمام. أربع فئات: قوة عالية واهتمام عالٍ = أدِرهم عن قرب؛ قوة عالية واهتمام منخفض = أرضِهم؛ قوة منخفضة واهتمام عالٍ = أبقهم على اطلاع؛ قوة منخفضة واهتمام منخفض = راقبهم بأقل جهد.')
   )),
  (v_mod2, 'Lesson 2.4: The Stakeholder Engagement Plan', 4, 10, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Engagement Plan','ar','خطة إشراك'),
       jsonb_build_object('en','Channel','ar','قناة تواصل'),
       jsonb_build_object('en','Report','ar','تقرير'),
       jsonb_build_object('en','Frequency','ar','تكرار'),
       jsonb_build_object('en','Surprise','ar','مفاجأة')
     ),
     'skill_id', v_skill_communication,
     'module_closing', jsonb_build_object(
       'optional_language_task','Write a 150–200 word Project Charter in English for your chosen Capstone Scenario. Include: Purpose, 3 Key Deliverables, 1 Assumption, and 1 Constraint. Submit to your Personal Companion for feedback.',
       'coin_cost', 5,
       'career_dna_skills','Charter Drafting, Stakeholder Identification, Stakeholder Analysis, Communication Planning, Risk Awareness',
       'series_episode','Episode 2 — a junior PM handles charter approval under pressure from a difficult stakeholder.',
       'listening_suggestion','Listen to the episode discussing the importance of getting the Charter signed before any work begins.',
       'capstone_task','Draft a Project Charter for your chosen scenario.'
     )),
   jsonb_build_object(
     'en', jsonb_build_object('title','The Stakeholder Engagement Plan','body','After classification, you need an actual plan: who needs weekly reports? Who''s fine with a monthly meeting? What''s the right channel for each group? This plan isn''t a formality — it''s the first line of defense against surprises that derail projects.'),
     'ar', jsonb_build_object('title','خطة إشراك أصحاب المصلحة','body','بعد التصنيف، تحتاج خطة فعلية: من يحتاج تقريرًا أسبوعيًا؟ من يكفيه اجتماع شهري؟ ما القناة الأنسب لكل فئة؟ هذه الخطة ليست شكلية — هي أول خط دفاع ضد المفاجآت التي تُخرج المشروع عن مساره.')
   ));

  -- ============================================================
  -- MODULE 3 — LESSONS
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod3, 'Lesson 3.1: Initiating', 1, 8, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Initiating','ar','البدء'),
       jsonb_build_object('en','Feasibility','ar','جدوى'),
       jsonb_build_object('en','Approval','ar','اعتماد'),
       jsonb_build_object('en','Output','ar','مخرج'),
       jsonb_build_object('en','Decision','ar','قرار')
     ), 'skill_id', v_skill_planning),
   jsonb_build_object(
     'en', jsonb_build_object('title','Initiating — How a Project Officially Begins','body','The decision phase: should we even start this project? Includes initial feasibility, drafting the charter, identifying key stakeholders. Its one decisive output: an approved charter.'),
     'ar', jsonb_build_object('title','البدء — كيف يُولد المشروع رسميًا','body','مرحلة اتخاذ القرار: هل نبدأ هذا المشروع أصلًا؟ تتضمن دراسة الجدوى الأولية، صياغة الميثاق، وتحديد أصحاب المصلحة الرئيسيين. مخرجها الوحيد الحاسم: ميثاق معتمد.')
   )),
  (v_mod3, 'Lesson 3.2: Planning', 2, 12, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Sub-plan','ar','خطة فرعية'),
       jsonb_build_object('en','Schedule','ar','جدول زمني'),
       jsonb_build_object('en','Analysis Paralysis','ar','شلل التحليل'),
       jsonb_build_object('en','Resource','ar','مورد'),
       jsonb_build_object('en','Quality','ar','جودة')
     ), 'skill_id', v_skill_planning),
   jsonb_build_object(
     'en', jsonb_build_object('title','Planning — The Longest and Most Critical Phase','body','Where every sub-plan is built: scope, schedule, cost, quality, risk, resources, communications. Golden rule: every hour invested in planning saves many hours later in execution — but over-planning (analysis paralysis) is a real risk too.'),
     'ar', jsonb_build_object('title','التخطيط — أهم وأطول مرحلة','body','هنا تُبنى كل الخطط الفرعية: النطاق، الجدول، التكلفة، الجودة، المخاطر، الموارد، التواصل. قاعدة ذهبية: كل ساعة تُستثمر بالتخطيط توفر ساعات كثيرة لاحقًا — لكن الإفراط في التخطيط خطر حقيقي أيضًا.')
   )),
  (v_mod3, 'Lesson 3.3: Executing', 3, 9, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Executing','ar','التنفيذ'),
       jsonb_build_object('en','Vendor','ar','مورّد/متعاقد'),
       jsonb_build_object('en','Motivation','ar','تحفيز'),
       jsonb_build_object('en','Coordination','ar','تنسيق'),
       jsonb_build_object('en','Team','ar','فريق')
     ), 'skill_id', v_skill_leadership),
   jsonb_build_object(
     'en', jsonb_build_object('title','Executing — Where Plans Become Real Work','body','Executing the plans: managing the team, coordinating vendors, ensuring quality during work. The biggest challenge here isn''t technical — it''s human: motivating the team and handling unexpected changes.'),
     'ar', jsonb_build_object('title','التنفيذ — حيث يتحول الورق لعمل فعلي','body','تنفيذ الخطط الموضوعة: إدارة الفريق، تنسيق الموردين، ضمان الجودة أثناء العمل. أكبر تحدٍ هنا ليس تقنيًا بل بشريًا — تحفيز الفريق والتعامل مع التغييرات غير المتوقعة.')
   )),
  (v_mod3, 'Lesson 3.4: Monitoring & Controlling', 4, 11, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Monitoring','ar','مراقبة'),
       jsonb_build_object('en','Change Control','ar','ضبط التغيير'),
       jsonb_build_object('en','CCB','ar','مجلس ضبط التغيير'),
       jsonb_build_object('en','Deviation','ar','انحراف'),
       jsonb_build_object('en','Baseline','ar','خط الأساس')
     ),
     'toolbox_en','Key tool: the Change Control Process. Any significant change request is logged, assessed for impact (cost, schedule, risk), and formally approved or rejected — typically by a Change Control Board (CCB) for major projects.',
     'toolbox_ar','الأداة الأساسية: عملية ضبط التغيير. أي طلب تغيير مهم يُسجَّل، يُقيَّم أثره (التكلفة، الجدول، المخاطر)، ويُعتمَد أو يُرفَض رسميًا — غالبًا عبر مجلس ضبط التغيير (CCB) للمشاريع الكبرى.',
     'skill_id', v_skill_planning
   ),
   jsonb_build_object(
     'en', jsonb_build_object('title','Monitoring & Controlling','body','Runs in parallel with execution, not after it: measuring actual performance against plan. Changes are formally managed through a Change Control Process, often requiring approval from a Change Control Board (CCB) for significant deviations — not casual verbal approvals.'),
     'ar', jsonb_build_object('title','المراقبة والتحكم','body','تعمل بالتوازي مع التنفيذ لا بعده: قياس الأداء الفعلي مقابل الخطة. التغييرات تُدار رسميًا عبر عملية ضبط تغيير موثّقة، وغالبًا تحتاج اعتماد مجلس ضبط التغيير (CCB) للانحرافات الكبيرة — لا موافقات شفهية عشوائية.')
   )),
  (v_mod3, 'Lesson 3.5: Closing', 5, 9, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Closing','ar','الإغلاق'),
       jsonb_build_object('en','Lessons Learned','ar','الدروس المستفادة'),
       jsonb_build_object('en','Handover','ar','تسليم'),
       jsonb_build_object('en','Contract Closure','ar','إغلاق العقد'),
       jsonb_build_object('en','Release','ar','تحرير (الفريق)')
     ),
     'skill_id', v_skill_planning,
     'module_closing', jsonb_build_object(
       'optional_language_task','Prepare a 2-minute recorded explanation in English of how you would handle a stakeholder requesting a major change mid-project, referencing the Change Control Process.',
       'coin_cost', 5,
       'career_dna_skills','Process Group Literacy, Change Control Awareness, Closing Discipline',
       'series_episode','Episode 3 — the team faces an unapproved change request and must escalate it to the CCB.',
       'listening_suggestion','Listen to the episode covering a project''s rocky transition from planning into execution.',
       'capstone_task','Prepare a Stakeholder Register for your scenario.'
     )),
   jsonb_build_object(
     'en', jsonb_build_object('title','Closing — The Often-Forgotten Phase','body','Many projects fizzle out instead of formally closing — wasting a valuable opportunity: Lessons Learned. Proper closing includes: formal deliverable handover, contract closure, documenting lessons, and releasing the team.'),
     'ar', jsonb_build_object('title','الإغلاق — المرحلة المنسية غالبًا','body','كثير من المشاريع تتلاشى بدل أن تُغلَق رسميًا — خطأ يفوّت فرصة ثمينة: الدروس المستفادة. الإغلاق الصحيح يشمل: تسليم رسمي للمخرجات، إغلاق العقود، توثيق الدروس، وتحرير الفريق.')
   ));

  -- ============================================================
  -- MODULE 4 — LESSONS
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod4, 'Lesson 4.1: The Agile Mindset', 1, 10, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Agile Manifesto','ar','بيان المرونة'),
       jsonb_build_object('en','Collaboration','ar','تعاون'),
       jsonb_build_object('en','Iteration','ar','تكرار/دورة'),
       jsonb_build_object('en','Adaptability','ar','القابلية للتكيف'),
       jsonb_build_object('en','Rigid Plan','ar','خطة جامدة')
     ), 'skill_id', v_skill_planning),
   jsonb_build_object(
     'en', jsonb_build_object('title','The Agile Mindset — Why Did It Emerge?','body','Agility emerged as a response to traditional models failing to keep pace with rapid change. The Agile Manifesto values: individuals and interactions over processes and tools, working software over comprehensive documentation, customer collaboration over contract negotiation, responding to change over following a rigid plan.'),
     'ar', jsonb_build_object('title','عقلية Agile — لماذا ظهرت أصلًا؟','body','ظهرت المرونة كرد فعل على فشل النماذج التقليدية في مواكبة التغيير السريع. البيان المرن يُقدّم: الأفراد والتفاعلات فوق العمليات، البرنامج العامل فوق التوثيق الشامل، التعاون مع العميل فوق التفاوض، الاستجابة للتغيير فوق اتباع خطة جامدة.')
   )),
  (v_mod4, 'Lesson 4.2: Scrum', 2, 14, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Product Owner','ar','مالك المنتج'),
       jsonb_build_object('en','Scrum Master','ar','مُيسِّر سكرم'),
       jsonb_build_object('en','Sprint','ar','دورة عمل'),
       jsonb_build_object('en','Retrospective','ar','استعراض رجعي'),
       jsonb_build_object('en','Blocker','ar','عائق')
     ), 'skill_id', v_skill_planning),
   jsonb_build_object(
     'en', jsonb_build_object('title','Scrum — Roles and Core Ceremonies','body','A structured agile framework: Product Owner (sets priorities), Scrum Master (removes blockers), Development Team. Works in fixed cycles (Sprints), with four ceremonies: Sprint Planning, Daily Standup, Sprint Review, and Retrospective.'),
     'ar', jsonb_build_object('title','Scrum — الأدوار والطقوس الأساسية','body','إطار عمل مرن ببنية واضحة: مالك المنتج، مُيسِّر سكرم، فريق التطوير. يعمل بدورات ثابتة، بأربع طقوس: تخطيط السبرنت، الوقوف اليومي، مراجعة السبرنت، والاستعراض الرجعي.')
   )),
  (v_mod4, 'Lesson 4.3: Kanban', 3, 10, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Kanban Board','ar','لوحة كانبان'),
       jsonb_build_object('en','WIP Limit','ar','حد العمل الجاري'),
       jsonb_build_object('en','Continuous Flow','ar','تدفق مستمر'),
       jsonb_build_object('en','Ticket','ar','تذكرة'),
       jsonb_build_object('en','Pile-up','ar','تكدّس')
     ),
     'skill_id', v_skill_planning,
     'module_closing', jsonb_build_object(
       'optional_language_task','Record a 2-minute simulated Daily Standup in English for your Capstone scenario: what you did yesterday, what you''ll do today, any blockers.',
       'coin_cost', 5,
       'career_dna_skills','Agile Literacy, Scrum Roles, Kanban Flow Management',
       'series_episode','Episode 4 — the team pilots a Kanban board to clear a backlog of urgent support requests.',
       'listening_suggestion','Listen to an episode contrasting a Scrum team''s standup with a Kanban team''s continuous flow.'
     )),
   jsonb_build_object(
     'en', jsonb_build_object('title','Kanban — Continuous Flow Without Fixed Cycles','body','Unlike Scrum, Kanban has no fixed time cycles — instead a visual board (To Do / In Progress / Done) with a Work-In-Progress limit preventing task pile-up. Suited for support/maintenance teams with continuous ticket flow.'),
     'ar', jsonb_build_object('title','Kanban — التدفق المستمر بلا دورات ثابتة','body','بخلاف Scrum، لا يعتمد Kanban دورات زمنية ثابتة — بل لوحة مرئية مع حد أقصى للمهام قيد التنفيذ يمنع تكدّس العمل. مناسب لفرق الدعم حيث المهام تتدفق باستمرار.')
   ));

  -- ============================================================
  -- MODULE 5 — LESSONS (NEW: Business Environment)
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod5, 'Lesson 5.1: Why Projects Exist — Linking Work to Corporate Strategy', 1, 12, false,
   jsonb_build_object('vocabulary', jsonb_build_array(
       jsonb_build_object('en','Strategy','ar','استراتيجية'),
       jsonb_build_object('en','Program','ar','برنامج'),
       jsonb_build_object('en','Portfolio','ar','محفظة مشاريع'),
       jsonb_build_object('en','Alignment','ar','مواءمة'),
       jsonb_build_object('en','Organizational Goal','ar','هدف تنظيمي')
     ), 'skill_id', v_skill_planning),
   jsonb_build_object(
     'en', jsonb_build_object('title','Why Projects Exist: Linking Work to Corporate Strategy','body','Every project should trace back to an organizational goal — a project that doesn''t serve the strategy is a project that shouldn''t be running. Organizations pursue strategy through three vehicles: operations, projects, and programs. A project manager who can explain "why this project matters to the business" in one sentence is far more valuable than one who can only explain "what we''re building."'),
     'ar', jsonb_build_object('title','لماذا توجد المشاريع أصلًا: ربط العمل بالاستراتيجية','body','كل مشروع يجب أن يعود لهدف تنظيمي — مشروع لا يخدم الاستراتيجية هو مشروع لا يجب أن يستمر. تُحقق المؤسسات استراتيجيتها عبر ثلاث وسائل: العمليات، المشاريع، والبرامج. مدير المشروع القادر على شرح "لماذا هذا المشروع مهم للأعمال" بجملة واحدة أثمن ممن يشرح "ماذا نبني" فقط.')
   )),
  (v_mod5, 'Lesson 5.2: Reading a Business Case, and the Wider External Environment', 2, 14, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Business Case','ar','حالة العمل التجارية'),
       jsonb_build_object('en','Value','ar','قيمة'),
       jsonb_build_object('en','External Factor','ar','عامل خارجي'),
       jsonb_build_object('en','Regulatory Change','ar','تغيير تنظيمي'),
       jsonb_build_object('en','Market Condition','ar','حالة السوق')
     ),
     'skill_id', v_skill_planning,
     'module_closing', jsonb_build_object(
       'optional_language_task','Write a 100-word explanation in English of how one external factor (market, regulatory, or competitor) could affect your Capstone project.',
       'coin_cost', 5,
       'career_dna_skills','Business Environment Awareness, Strategic Alignment, Value Literacy',
       'series_episode','Episode 5 — the team''s project survives a sudden regulatory change by adapting its plan.',
       'listening_suggestion','Listen to an episode where a project manager must justify a project''s value to a skeptical executive committee.'
     )),
   jsonb_build_object(
     'en', jsonb_build_object('title','Reading a Business Case, and the Wider External Environment','body','Before a charter is even written, most organizations require a Business Case justifying WHY this investment makes sense. A PM doesn''t have to write it, but must connect daily decisions back to the value it promised. The Business Environment also includes external factors: market conditions, regulatory changes, and competitor actions can all impact a project''s assumptions and constraints. Level 1 introduces this awareness; Levels 2–4 build deeper skills in compliance, value realization, and sustainability/AI considerations.'),
     'ar', jsonb_build_object('title','قراءة حالة العمل التجارية، والبيئة الخارجية الأوسع','body','قبل كتابة الميثاق، تتطلب أغلب المؤسسات حالة عمل تجارية تبرر لماذا هذا الاستثمار منطقي. لا يلزم مدير المشروع كتابتها، لكن يجب أن يربط قراراته اليومية بالقيمة الموعودة. البيئة التجارية تشمل أيضًا عوامل خارجية: حالة السوق، التغييرات التنظيمية، وتحركات المنافسين. المستوى 1 يقدّم هذا الوعي؛ المستويات 2-4 تعمّق الامتثال وتحقيق القيمة والاستدامة/الذكاء الاصطناعي.')
   ));

  -- ============================================================
  -- MODULE 6 — LESSON (Leadership Thread)
  -- ============================================================
  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, content, translations) values
  (v_mod6, 'Lesson 6.1: Foundational Leadership Communication With Stakeholders', 1, 8, false,
   jsonb_build_object(
     'vocabulary', jsonb_build_array(
       jsonb_build_object('en','Leadership','ar','قيادة'),
       jsonb_build_object('en','Active Listening','ar','استماع فعّال'),
       jsonb_build_object('en','Framing','ar','صياغة الرسالة'),
       jsonb_build_object('en','Concern','ar','مخاوف'),
       jsonb_build_object('en','Empathy','ar','تعاطف')
     ),
     'skill_id', v_skill_leadership,
     'module_closing', jsonb_build_object(
       'optional_language_task','Record a 90-second English message to a stakeholder explaining a project delay, tailored to their power/interest quadrant of your choice.',
       'coin_cost', 5,
       'career_dna_skills','Foundational Leadership, Stakeholder Communication',
       'series_episode','Episode 6 — season finale: the team presents their finished Capstone deliverables to the sponsor.',
       'listening_suggestion','Listen to an episode focused entirely on a tense but well-handled stakeholder conversation.',
       'capstone_task','Submit all deliverables (Charter, Stakeholder Register, and module tasks) for assessor verification.'
     )),
   jsonb_build_object(
     'en', jsonb_build_object('title','Foundational Leadership Communication With Stakeholders','body','Even at this foundational level, leadership starts here: communicating with a stakeholder isn''t just sending a report — it''s actively listening to their concerns and framing the message to match their interest and power level. This thread deepens significantly in Level 3, but it begins now.'),
     'ar', jsonb_build_object('title','التواصل القيادي الأساسي مع أصحاب المصلحة','body','حتى في هذا المستوى التأسيسي، القيادة تبدأ من هنا: التواصل مع صاحب المصلحة ليس مجرد إرسال تقرير — هو الاستماع الفعّال لمخاوفه وصياغة الرسالة بما يناسب مستوى اهتمامه وقوته. هذا الخيط سيتعمّق أكثر في المستوى 3، لكنه يبدأ الآن.')
   ));

  -- ============================================================
  -- FINAL LEVEL ASSESSMENT (single hybrid quiz, course-level)
  -- ============================================================
  insert into public.quizzes (id, course_id, pmp_level, title, assessment_mode, passing_score)
  values (v_quiz_id, v_course_id, 1, 'Level 1 Final Assessment — Certified Project Governance Fundamentals', 'hybrid', 70);

  insert into public.quiz_questions (quiz_id, question, points, order_index) values
  (v_quiz_id, jsonb_build_object('text','What is the fundamental difference between a "project" and an "operation"?','options', jsonb_build_array('A project is more expensive','A project is temporary and produces a unique result, while an operation is ongoing and repetitive','An operation requires a larger team','There is no real difference'), 'correct_index', 1), 1, 1),
  (v_quiz_id, jsonb_build_object('text','A bridge-construction project with fixed, government-approved engineering specs — which model fits best?','options', jsonb_build_array('Predictive','Agile','Hybrid','None of the above'), 'correct_index', 0), 1, 2),
  (v_quiz_id, jsonb_build_object('text','What does the modern PMBOK approach emphasize over rigid, fixed processes?','options', jsonb_build_array('Longer documentation','Principles and outcomes','Stricter deadlines','Larger budgets'), 'correct_index', 1), 1, 3),
  (v_quiz_id, jsonb_build_object('text','Which of the following is an example of a project Constraint?','options', jsonb_build_array('"We assume the vendor will deliver on time."','"The project cannot exceed $100,000."','"The sponsor prefers weekly updates."','"The team has five members."'), 'correct_index', 1), 1, 4),
  (v_quiz_id, jsonb_build_object('text','Which of the following is most often forgotten as a stakeholder?','options', jsonb_build_array('The client','The project team','Regulatory/oversight bodies','The sponsor'), 'correct_index', 2), 1, 5),
  (v_quiz_id, jsonb_build_object('text','An executive with low interest in project details but the authority to cancel it — how do you manage them?','options', jsonb_build_array('Manage closely','Keep satisfied','Keep informed','Monitor with minimal effort'), 'correct_index', 1), 1, 6),
  (v_quiz_id, jsonb_build_object('text','What is the primary goal of a stakeholder engagement plan?','options', jsonb_build_array('To reduce the number of stakeholders','To avoid surprises through appropriately tailored communication','To satisfy legal requirements only','To replace the project charter'), 'correct_index', 1), 1, 7),
  (v_quiz_id, jsonb_build_object('text','What is the single decisive output of the Initiating phase?','options', jsonb_build_array('A detailed schedule','An approved charter','A finished product','A risk register'), 'correct_index', 1), 1, 8),
  (v_quiz_id, jsonb_build_object('text','What is the main risk of excessive planning?','options', jsonb_build_array('Team burnout','Analysis paralysis — delaying execution indefinitely','Higher project cost only','Loss of stakeholder interest'), 'correct_index', 1), 1, 9),
  (v_quiz_id, jsonb_build_object('text','What is typically the biggest challenge during Executing?','options', jsonb_build_array('Technical complexity','Human factors — team motivation and handling change','Budget overruns only','Vendor selection'), 'correct_index', 1), 1, 10),
  (v_quiz_id, jsonb_build_object('text','How are significant project changes formally approved?','options', jsonb_build_array('Through a casual verbal agreement','Through a Change Control Process, often via a CCB','Only by the sponsor alone','They cannot be approved once planning ends'), 'correct_index', 1), 1, 11),
  (v_quiz_id, jsonb_build_object('text','What valuable opportunity is most often lost when a project isn''t formally closed?','options', jsonb_build_array('Final payment','Lessons Learned documentation','Team celebration','Client signature'), 'correct_index', 1), 1, 12),
  (v_quiz_id, jsonb_build_object('text','According to the Agile Manifesto, what is valued over "following a plan"?','options', jsonb_build_array('Following a stricter plan','Responding to change','Reducing documentation to zero','Eliminating customer involvement'), 'correct_index', 1), 1, 13),
  (v_quiz_id, jsonb_build_object('text','Who is primarily responsible for removing blockers in Scrum?','options', jsonb_build_array('Product Owner','Scrum Master','Development Team','Project Sponsor'), 'correct_index', 1), 1, 14),
  (v_quiz_id, jsonb_build_object('text','A technical support team receiving tickets continuously with no defined cycles — which framework fits best?','options', jsonb_build_array('Scrum','Kanban','Waterfall','Hybrid'), 'correct_index', 1), 1, 15),
  (v_quiz_id, jsonb_build_object('text','What is the clearest sign that a project manager understands the Business Environment domain?','options', jsonb_build_array('They can describe every technical task in detail','They can explain how the project connects to organizational strategy','They complete the project under budget','They avoid all stakeholder meetings'), 'correct_index', 1), 1, 16),
  (v_quiz_id, jsonb_build_object('text','Why might a project be completed on time and on budget, yet still be considered a failure?','options', jsonb_build_array('The team was too large','It failed to deliver the value promised in the business case','It used an agile approach','The charter was signed too early'), 'correct_index', 1), 1, 17),
  (v_quiz_id, jsonb_build_object('text','Why does the leadership thread begin at Level 1 instead of being confined to Level 3 only?','options', jsonb_build_array('Because Level 3 has no room for it','Because effective leadership is a continuous skill across the whole project, not an isolated topic','Because it is a legal requirement','Because Level 1 has extra hours to fill'), 'correct_index', 1), 1, 18);

  raise notice 'Seed complete. course_id = %', v_course_id;

end $$;
