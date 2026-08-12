-- ============================================================
-- WOW - World of Work — Migration 060
-- Level 2 Final Boss — the 9 crisis scenarios' content, planted into
-- the EXISTING kb_scenarios/kb_scoring_rules tables (046).
--
-- CORRECTED: 061 (the scenario_count_min/max + speed engine) already
-- ran against the live DB before this file did — its self-check had a
-- NULL-comparison bug that let it report success while its own
-- Final-Boss-targeting UPDATE silently affected 0 rows (the row didn't
-- exist yet, since 060 hadn't run). That means kb_rule_scopes no longer
-- has a scenario_count column at all — it's scenario_count_min/max
-- now. This insert targets that current schema directly, with the
-- final min=4/max=6 values 061 always intended for Final Boss, so this
-- migration is correct standing alone. Run 061 again after this one —
-- it's fully idempotent (CREATE OR REPLACE function, ON CONFLICT DO
-- NOTHING pricing, WHERE NOT EXISTS badge) and its self-check will now
-- actually find the row and pass for real.
-- ============================================================

insert into public.kb_rule_scopes (rule_scope, label_ar, label_en, passing_score, scenario_count_min, scenario_count_max) values
  ('level2_final_boss', 'Final Boss — محاكي الأزمات', 'Final Boss — Crisis Simulator', 70, 4, 6)
on conflict (rule_scope) do nothing;

insert into public.kb_scenarios (rule_scope, scenario_key, title_ar, title_en, body) values
(
  'level2_final_boss', 'supplier_crisis', 'أزمة مورد', 'Supplier Crisis',
  $json$
  {
    "context_ar": "موردك الرئيسي لمكوّن حرج ينسحب فجأة، والتسليم المرتبط بيه على المسار الحرج مستحق خلال 3 أسابيع.",
    "context_en": "Your main supplier for a critical component suddenly withdraws, and the deliverable tied to it — on the critical path — is due in 3 weeks.",
    "choices": [
      {"key": "A", "label_ar": "راجعت Risk Register فورًا — لقيت مورد بديل كان مُحدَّد مسبقًا كاستجابة Mitigate، فعّلته فورًا وأبلغت الفريق.", "label_en": "Immediately checked the Risk Register — found a pre-identified backup supplier under a Mitigate response, activated it immediately and informed the team."},
      {"key": "B", "label_ar": "صعّدت للـSponsor فورًا بتقييم أثر واضح، وطلبت ميزانية طارئة لمصدر بديل معجَّل مع البحث بالتوازي.", "label_en": "Escalated to the Sponsor immediately with a clear impact assessment, requesting emergency budget for an expedited alternative source while searching in parallel."},
      {"key": "C", "label_ar": "بدأت تبحث عن مورد جديد من الصفر بهدوء، من غير ما تبلّغ حد، على أمل تحل المشكلة قبل ما حد يلاحظ.", "label_en": "Quietly started searching for a new supplier from scratch, without informing anyone, hoping to solve it before anyone notices."},
      {"key": "D", "label_ar": "استمريت في الخطة الأصلية كأن حاجة ما حصلتش، وأجّلت اتخاذ أي قرار لحد ما يبين تأثيره فعليًا.", "label_en": "Continued with the original plan as if nothing happened, deferring any decision until the impact actually shows."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'natural_disaster', 'كارثة طبيعية', 'Natural Disaster',
  $json$
  {
    "context_ar": "موقع العمل اتقفل أو البنية التحتية الرقمية اتعطلت لمدة أسبوع كامل.",
    "context_en": "The work site is closed, or digital infrastructure is down, for a full week.",
    "choices": [
      {"key": "A", "label_ar": "فعّلت خطة استمرارية العمل (لو موجودة)، حوّلت الفريق للعمل عن بُعد أو موقع بديل، وبلّغت كل أصحاب المصلحة بالأثر المتوقع على الجدول فورًا.", "label_en": "Activated the business continuity plan (if any), moved the team to remote work or a backup site, and immediately informed all stakeholders of the expected schedule impact."},
      {"key": "B", "label_ar": "بلّغت أصحاب المصلحة بالتأخير المتوقع، لكن استنيت أسبوع كامل قبل ما تدوّر على أي حل بديل.", "label_en": "Informed stakeholders of the expected delay, but waited a full week before looking for any workaround."},
      {"key": "C", "label_ar": "حاولت تخلي الفريق يشتغل جزئيًا بأدوات بديلة من غير خطة واضحة أو تواصل مع أصحاب المصلحة.", "label_en": "Tried to get the team partially working with makeshift tools, with no clear plan or communication to stakeholders."},
      {"key": "D", "label_ar": "استنيت الأسبوع يعدي من غير أي إجراء أو تواصل، على أساس \"دي قوة قاهرة مفيش حاجة نعملها\".", "label_en": "Waited out the week with no action or communication, on the basis that \"it's force majeure, there's nothing to do\"."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'regulatory_change', 'تغيير تشريعي', 'Regulatory Change',
  $json$
  {
    "context_ar": "قانون جديد صدر وغيّر متطلبات الامتثال والمخرجات المطلوبة من مشروعك.",
    "context_en": "A new law has passed, changing the compliance requirements and deliverables expected of your project.",
    "choices": [
      {"key": "A", "label_ar": "قيّمت أثر القانون على النطاق والمخرجات فورًا، رفعت Change Request رسمي لمجلس التحكم بالتغيير مع التقييم كامل.", "label_en": "Immediately assessed the law's impact on scope and deliverables, filed a formal Change Request to the change control board with the full assessment."},
      {"key": "B", "label_ar": "عدّلت المخرجات بنفسك مباشرة عشان تلتزم بالقانون بسرعة، من غير ما تمر بعملية تغيير رسمية.", "label_en": "Directly modified the deliverables yourself to comply quickly, without going through a formal change process."},
      {"key": "C", "label_ar": "قررت تسيب المخرجات زي ما هي وتتعامل مع أي مخالفة لو حصلت لاحقًا.", "label_en": "Decided to leave the deliverables as-is and deal with any violation if and when it occurs."},
      {"key": "D", "label_ar": "تجاهلت الموضوع تمامًا لأن \"القانون غالبًا هيتأجل تطبيقه\".", "label_en": "Ignored it entirely, assuming \"the law will probably be delayed anyway\"."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'manager_resignation', 'استقالة المدير', 'Manager Resignation',
  $json$
  {
    "context_ar": "مدير المشروع استقال فجأة، وإنت لعبت دور المنقذ اللي هيكمل بدل منه.",
    "context_en": "The project manager suddenly resigned, and you've stepped in to take over.",
    "choices": [
      {"key": "A", "label_ar": "راجعت الميثاق وWBS وRisk Register فورًا عشان تفهم الحالة الحقيقية للمشروع قبل أي قرار، وبعدين اجتمعت بالفريق تطمّنهم.", "label_en": "Immediately reviewed the Charter, WBS, and Risk Register to understand the project's real state before any decision, then met the team to reassure them."},
      {"key": "B", "label_ar": "اجتمعت بالفريق فورًا تطمّنهم، وأجّلت مراجعة التفاصيل الفنية لبعدين.", "label_en": "Met the team immediately to reassure them, deferring the technical review for later."},
      {"key": "C", "label_ar": "بدأت تاخد قرارات فورية على المشروع من غير ما تراجع أي مستند أو تتكلم مع الفريق الأول.", "label_en": "Started making immediate project decisions without reviewing any documents or talking to the team first."},
      {"key": "D", "label_ar": "استنيت تعليمات من الإدارة العليا بلا أي مبادرة، وسبت الفريق من غير توجيه لمدة أيام.", "label_en": "Waited for instructions from senior management with no initiative, leaving the team without guidance for days."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'radical_client_request', 'طلب عميل جذري', 'Radical Client Request',
  $json$
  {
    "context_ar": "العميل طلب تغيير بيغيّر 30% من النطاق في نص التنفيذ.",
    "context_en": "The client has requested a change that alters 30% of the scope mid-execution.",
    "choices": [
      {"key": "A", "label_ar": "رفعت Change Request رسمي بتقييم أثر كامل على النطاق/الجدول/التكلفة، وعرضته على مجلس التحكم قبل أي التزام للعميل.", "label_en": "Filed a formal Change Request with a full impact assessment on scope/schedule/cost, and brought it to the change control board before any commitment to the client."},
      {"key": "B", "label_ar": "وافقت شفهيًا للعميل عشان ما يزعلش، على أساس تحل التفاصيل لاحقًا داخليًا.", "label_en": "Verbally agreed with the client to avoid upsetting them, planning to sort out the details internally later."},
      {"key": "C", "label_ar": "رفضت الطلب فورًا بلا أي تقييم، بحجة \"ده مش في الخطة الأصلية\".", "label_en": "Rejected the request outright with no assessment, on the grounds that \"it's not in the original plan\"."},
      {"key": "D", "label_ar": "تجاهلت الطلب وكملت زي ما الخطة الأصلية، على أمل العميل ينسى.", "label_en": "Ignored the request and continued per the original plan, hoping the client would forget."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'quality_collapse', 'انهيار الجودة', 'Quality Collapse',
  $json$
  {
    "context_ar": "عيوب كبيرة ظهرت في المخرجات، تحتاج إعادة عمل بنسبة 40%.",
    "context_en": "Major defects have appeared in the deliverables, requiring 40% rework.",
    "choices": [
      {"key": "A", "label_ar": "وقفت التسليم فورًا، حللت السبب الجذري (مش بس الأعراض)، وحدّثت خطة الجودة قبل استئناف العمل.", "label_en": "Immediately halted delivery, analyzed the root cause (not just symptoms), and updated the quality plan before resuming work."},
      {"key": "B", "label_ar": "بدأت إعادة العمل فورًا على المخرجات المعيبة، من غير تحليل سبب جذري رسمي.", "label_en": "Immediately started reworking the defective deliverables, without a formal root-cause analysis."},
      {"key": "C", "label_ar": "سلّمت المخرجات زي ما هي مع ملاحظة للعميل إن فيه عيوب معروفة، على أمل يقبلها.", "label_en": "Delivered the output as-is with a note to the client about known defects, hoping they'd accept it."},
      {"key": "D", "label_ar": "أخفيت المشكلة وسلّمت المخرجات بلا أي إفصاح.", "label_en": "Hid the problem and delivered the output with no disclosure at all."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'funding_shortage', 'نقص التمويل', 'Funding Shortage',
  $json$
  {
    "context_ar": "الميزانية اتقطعت 25% بسبب أزمة مالية في الشركة.",
    "context_en": "The budget has been cut by 25% due to a company-wide financial crisis.",
    "choices": [
      {"key": "A", "label_ar": "راجعت أولويات المخرجات مقابل القيمة، وقدّمت للـSponsor خيارات واضحة (تقليص نطاق محدد / تمديد جدول / تمويل إضافي) بدل قرار أحادي.", "label_en": "Reviewed deliverable priorities against value, and presented the Sponsor with clear options (specific scope cut / schedule extension / additional funding) instead of a unilateral decision."},
      {"key": "B", "label_ar": "قلّصت الميزانية بالتساوي على كل بنود المشروع من غير ترتيب أولويات.", "label_en": "Cut the budget evenly across every project line item with no prioritization."},
      {"key": "C", "label_ar": "استمريت بنفس الخطة الأصلية وحاولت \"توفّر\" من غير تغيير رسمي في النطاق.", "label_en": "Continued with the original plan and tried to \"save money\" informally, with no formal scope change."},
      {"key": "D", "label_ar": "سكتّ عن نقص التمويل وواصلت الالتزامات الأصلية للعميل بلا أي تعديل.", "label_en": "Said nothing about the shortfall and continued the original client commitments unchanged."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'cyber_incident', 'مشكلة أمن سيبراني', 'Cybersecurity Incident',
  $json$
  {
    "context_ar": "اختراق بيانات هدّد سلامة معلومات المشروع.",
    "context_en": "A data breach has threatened the integrity of the project's information.",
    "choices": [
      {"key": "A", "label_ar": "عزلت الأنظمة المتأثرة فورًا، بلّغت الجهات المخوَّلة (أمن المعلومات/الإدارة) خلال ساعات، ووثّقت الحادث كقرار رسمي.", "label_en": "Immediately isolated the affected systems, notified the authorized parties (infosec/management) within hours, and documented the incident as a formal decision."},
      {"key": "B", "label_ar": "بلّغت الإدارة، لكن أجّلت عزل الأنظمة لحد ما تتأكد من حجم الاختراق بالكامل.", "label_en": "Notified management, but delayed isolating the systems until fully confirming the scale of the breach."},
      {"key": "C", "label_ar": "حاولت تصلح المشكلة بنفسك بهدوء من غير تبليغ أي جهة، على أمل محدش يلاحظ.", "label_en": "Quietly tried to fix it yourself without notifying anyone, hoping no one would notice."},
      {"key": "D", "label_ar": "تجاهلت الإنذار الأول لأنه \"غالبًا false alarm\".", "label_en": "Dismissed the first alert as \"probably a false alarm\"."}
    ]
  }
  $json$::jsonb
),
(
  'level2_final_boss', 'stakeholder_conflict', 'نزاع بين أصحاب المصلحة', 'Stakeholder Conflict',
  $json$
  {
    "context_ar": "خلاف حاد بين الراعي (Sponsor) والعميل حول الأولويات.",
    "context_en": "A sharp conflict between the Sponsor and the client over priorities.",
    "choices": [
      {"key": "A", "label_ar": "عقدت اجتماع رسمي بينهم بأجندة واضحة، مرجّعًا النقاش لأهداف الميثاق المعتمدة كمرجعية محايدة.", "label_en": "Held a formal joint meeting with a clear agenda, grounding the discussion in the approved Charter's objectives as a neutral reference."},
      {"key": "B", "label_ar": "تكلمت مع كل طرف لوحده لفهم موقفه، لكن أجّلت الاجتماع المشترك.", "label_en": "Spoke to each party separately to understand their position, but deferred the joint meeting."},
      {"key": "C", "label_ar": "انحزت لرأي الراعي مباشرة لأنه صاحب السلطة الرسمية، من غير ما تسمع العميل بجدية.", "label_en": "Sided with the Sponsor's view directly because of their formal authority, without seriously hearing the client out."},
      {"key": "D", "label_ar": "تجنّبت التدخل تمامًا وسبت الطرفين يحلوها لوحدهم.", "label_en": "Avoided intervening entirely and let the two parties resolve it on their own."}
    ]
  }
  $json$::jsonb
)
on conflict (rule_scope, scenario_key) do nothing;

insert into public.kb_scoring_rules (rule_scope, scenario_key, decision_key, score, feedback_ar, feedback_en) values
  ('level2_final_boss', 'supplier_crisis', 'A', 100, 'الأفضل: هذا بالظبط سبب وجود استجابات المخاطر مُخطَّطة مسبقًا، لا مرتجَلة تحت الضغط.', 'Best: this is exactly why risk responses are pre-planned, not improvised under pressure.'),
  ('level2_final_boss', 'supplier_crisis', 'B', 70, 'جيد: شفاف وسريع، لكنه رد فعل — لا خطة جاهزة مسبقًا كانت موجودة.', 'Good: transparent and fast, but reactive — no pre-existing plan was ready.'),
  ('level2_final_boss', 'supplier_crisis', 'C', 40, 'ضعيف: الصمت عن تهديد على المسار الحرج يهدر الوقت اللي معندكش منه أصلًا.', 'Weak: silence on a critical-path threat wastes the time you don''t have.'),
  ('level2_final_boss', 'supplier_crisis', 'D', 10, 'الأسوأ: الإنكار في مخاطرة على المسار الحرج يضمن إن التأخير يتحول لأزمة.', 'Worst: denial on a critical-path risk guarantees the delay becomes a crisis.'),

  ('level2_final_boss', 'natural_disaster', 'A', 100, 'الأفضل: خطة استمرارية عمل + تواصل استباقي وصادق.', 'Best: business continuity plus proactive, honest communication.'),
  ('level2_final_boss', 'natural_disaster', 'B', 70, 'جيد: شفاف، لكن أسبوع كامل من الجمود كان يمكن تفاديه.', 'Good: transparent, but a full week of inaction was avoidable.'),
  ('level2_final_boss', 'natural_disaster', 'C', 40, 'ضعيف: ارتجال غير منسّق بلا تبليغ حد يخلق بلبلة أكتر.', 'Weak: uncoordinated improvisation without informing anyone creates more confusion.'),
  ('level2_final_boss', 'natural_disaster', 'D', 10, 'الأسوأ: حتى القوة القاهرة تحتاج إدارة فعّالة، لا انتظار سلبي.', 'Worst: even force majeure requires active management, not passive waiting.'),

  ('level2_final_boss', 'regulatory_change', 'A', 100, 'الأفضل: هذه بالظبط عملية ضبط التغيير الرسمية من الوحدة 7 — تقييم الأثر قبل الفعل.', 'Best: this is exactly the formal change control process from Unit 7 — impact assessment before action.'),
  ('level2_final_boss', 'regulatory_change', 'B', 70, 'نية جيدة، عملية خاطئة: ملتزم لكنه يتجاوز ضبط التغيير، ما يهدد النطاق/خط الأساس.', 'Good intent, wrong process: compliant but bypasses change control, risking scope/baseline conflicts.'),
  ('level2_final_boss', 'regulatory_change', 'C', 40, 'ضعيف: تجاهل تغيير تشريعي مخاطرة امتثال، لا خيار محايد.', 'Weak: ignoring a regulatory change is a compliance risk, not a neutral choice.'),
  ('level2_final_boss', 'regulatory_change', 'D', 10, 'الأسوأ: افتراض إن القانون مش هيتطبق مش إدارة مخاطر.', 'Worst: assuming regulation won''t apply is not risk management.'),

  ('level2_final_boss', 'manager_resignation', 'A', 100, 'الأفضل: افهم الواقع قبل الفعل — بالظبط الغرض من مستندات المشروع الحي.', 'Best: understand reality before acting — exactly what the living project artifacts are for.'),
  ('level2_final_boss', 'manager_resignation', 'B', 70, 'جيد: الطمأنة مهمة، لكن التصرف من غير مراجعة الحالة الحقيقية يخاطر بقرارات مبكرة خاطئة.', 'Good: reassurance matters, but acting without reviewing real project state risks wrong early decisions.'),
  ('level2_final_boss', 'manager_resignation', 'C', 40, 'ضعيف: فعل سريع بلا سياق غالبًا يعني إصلاح المشكلة الغلط.', 'Weak: fast action without context often means fixing the wrong problem.'),
  ('level2_final_boss', 'manager_resignation', 'D', 10, 'الأسوأ: فراغ القيادة أثناء الانتقال يضر بالثقة والزخم.', 'Worst: leadership vacuum during a transition damages trust and momentum.'),

  ('level2_final_boss', 'radical_client_request', 'A', 100, 'الأفضل: تغيير 30% من النطاق أبدًا مش موافقة سريعة — هذا ضبط تغيير متكامل بالكتاب.', 'Best: a 30% scope change is never a quick yes — this is textbook integrated change control.'),
  ('level2_final_boss', 'radical_client_request', 'B', 70, 'نية جيدة، عملية خطرة: موافقة شفهية على 30% من النطاق تخلق توقعات ممكن ما تقدرش تسلّمها.', 'Good intent, risky process: a verbal yes on 30% scope creates expectations you may not be able to deliver.'),
  ('level2_final_boss', 'radical_client_request', 'C', 40, 'ضعيف: الرفض بلا تقييم ممكن يخسّرك عميل بسبب طلب كان ممكن يكون ممكنًا بإعادة خط أساس.', 'Weak: rejecting without assessment can lose a client over a request that might have been feasible with re-baselining.'),
  ('level2_final_boss', 'radical_client_request', 'D', 10, 'الأسوأ: تجاهل طلب العميل تمامًا يضر بالعلاقة ومصداقية المشروع.', 'Worst: ignoring a client request outright damages the relationship and the project''s credibility.'),

  ('level2_final_boss', 'quality_collapse', 'A', 100, 'الأفضل: تحليل السبب الجذري قبل الاستئناف — تكرار نفس العملية يضمن تكرار العيوب.', 'Best: root-cause analysis before resuming — repeating the same process guarantees repeating the defects.'),
  ('level2_final_boss', 'quality_collapse', 'B', 70, 'جيد: سريع، لكن غالبًا يكرر نفس نمط العيب بلا تحليل سبب جذري.', 'Good: fast, but likely to repeat the same defect pattern without root-cause analysis.'),
  ('level2_final_boss', 'quality_collapse', 'C', 40, 'ضعيف: تسليم عمل معيب وأنت عارف ينقل تكلفة الجودة للعميل — أغلى نوع فشل.', 'Weak: knowingly shipping defective work shifts the cost of quality onto the client — the most expensive failure type.'),
  ('level2_final_boss', 'quality_collapse', 'D', 10, 'الأسوأ: هذا مش فشل جودة بعد كده، ده فشل نزاهة.', 'Worst: this is not a quality failure anymore, it''s an integrity failure.'),

  ('level2_final_boss', 'funding_shortage', 'A', 100, 'الأفضل: يقدّم لصاحب القرار خيارات حقيقية بدل امتصاص القطع صامتًا.', 'Best: gives the decision-maker real options instead of absorbing the cut silently.'),
  ('level2_final_boss', 'funding_shortage', 'B', 70, 'نية جيدة، غير دقيقة: القطع المتساوي غالبًا يضر البنود عالية القيمة بقدر منخفضة القيمة.', 'Good intent, imprecise: equal cuts often hurt high-value items as much as low-value ones.'),
  ('level2_final_boss', 'funding_shortage', 'C', 40, 'ضعيف: الإنفاق كالمخطط ضد ميزانية مقطوعة بس بيؤجل العجز الحتمي.', 'Weak: spending as planned against a cut budget just delays the inevitable shortfall.'),
  ('level2_final_boss', 'funding_shortage', 'D', 10, 'الأسوأ: يضمن إن نقص التمويل يتحول لالتزام مكسور.', 'Worst: guarantees a funding crisis becomes a broken commitment.'),

  ('level2_final_boss', 'cyber_incident', 'A', 100, 'الأفضل: احتواء أولًا، إفصاح سريع — التسلسل القياسي للاستجابة للحوادث.', 'Best: contain first, disclose fast — the standard incident-response sequence.'),
  ('level2_final_boss', 'cyber_incident', 'B', 70, 'جيد: الإفصاح صحيح، لكن تأجيل الاحتواء يخاطر بتعرّض إضافي.', 'Good: disclosure is right, but delaying containment risks further exposure.'),
  ('level2_final_boss', 'cyber_incident', 'C', 40, 'ضعيف: اختراق غير مُبلَّغ عنه مخاطرة امتثال وثقة فوق المخاطرة التقنية.', 'Weak: an unreported breach is a compliance and trust risk on top of the technical one.'),
  ('level2_final_boss', 'cyber_incident', 'D', 10, 'الأسوأ: تجاهل إشارة أمنية حقيقية هو بالظبط كيف تتحول الحوادث الصغيرة لكبيرة.', 'Worst: dismissing a real security signal is how small incidents become large ones.'),

  ('level2_final_boss', 'stakeholder_conflict', 'A', 100, 'الأفضل: الميثاق المعتمد هو بالظبط المرجعية المحايدة لحل نزاعات الأولويات.', 'Best: the approved Charter is exactly the neutral reference point for resolving priority conflicts.'),
  ('level2_final_boss', 'stakeholder_conflict', 'B', 70, 'خطوة أولى جيدة، لكن النزاعات غير المحلولة بين أصحاب مصلحة رئيسيين ما تقدرش تفضل منفصلة كتير.', 'Good first step, but unresolved conflicts between key stakeholders can''t stay separated for long.'),
  ('level2_final_boss', 'stakeholder_conflict', 'C', 40, 'ضعيف: السلطة الرسمية مش دايمًا نفس التوافق مع أهداف المشروع الفعلية.', 'Weak: authority isn''t always alignment with the project''s actual objectives.'),
  ('level2_final_boss', 'stakeholder_conflict', 'D', 10, 'الأسوأ: نزاع أصحاب مصلحة غير مُدار هو فراغ قيادة في أسوأ توقيت ممكن.', 'Worst: unmanaged stakeholder conflict is a leadership vacuum at the worst possible time.')
on conflict (rule_scope, scenario_key, decision_key) do nothing;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_scenarios int;
  v_rules int;
begin
  select count(*) into v_scenarios from public.kb_scenarios where rule_scope = 'level2_final_boss';
  if v_scenarios <> 9 then
    raise exception '060 failed: expected 9 kb_scenarios rows, found %', v_scenarios;
  end if;

  select count(*) into v_rules from public.kb_scoring_rules where rule_scope = 'level2_final_boss';
  if v_rules <> 36 then
    raise exception '060 failed: expected 36 kb_scoring_rules rows (9 scenarios x 4 choices), found %', v_rules;
  end if;

  raise notice '060 OK: 9 Final Boss scenarios, 36 scoring rules planted, kb_rule_scopes row set to min=4/max=6. Re-run 061 next so its self-check confirms for real.';
end $$;
