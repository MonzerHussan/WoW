-- ============================================================
-- WOW - World of Work — Migration 019
-- Content-only, no schema change: adds a `grammar_point` key inside the
-- existing `lessons.content` jsonb for each of the 18 PMP Level 1
-- lessons, same pattern as `module_closing`/`vocabulary` (009's own
-- comment already established this convention — no new column needed
-- for lesson content). Authored by the product owner directly
-- (grounded in each lesson's actual topic/vocabulary from 009), not
-- generated — Claude Code's role here is applying and verifying it,
-- not writing the content.
--
-- explanation_ar is always Arabic regardless of the page's AR/EN
-- toggle, deliberately — the point is teaching an English grammar rule
-- to an Arabic speaker most clearly in their own language.
-- ============================================================

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Present Simple for Facts and Definitions',
  'title_ar', 'المضارع البسيط لتعريف الحقائق',
  'explanation_ar', 'نستخدم المضارع البسيط لوصف حقائق ثابتة وتعريفات عامة، لا أحداثاً مؤقتة. لاحظ جملاً مثل "A project is a temporary endeavor" — الفعل "is" يصف حقيقة عامة عن كل مشروع، لا ما يحدث الآن فقط. نفس القاعدة عند تعريف مصطلحات: "Scope defines what work is included." تجنّب المضارع المستمر هنا لأنه يوحي بأن التعريف يحدث الآن فقط.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','A project has a defined start and end.','ar','المشروع له بداية ونهاية محددتان.'),
    jsonb_build_object('en','Operations repeat continuously.','ar','العمليات التشغيلية تتكرر باستمرار.'),
    jsonb_build_object('en','Most failed projects share the same root causes.','ar','أغلب المشاريع الفاشلة تشترك في نفس الأسباب الجذرية.')
  )
)) where title = 'Lesson 1.1: What Is a Project? Why Do Most Fail?';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Comparative Structures: Predictive vs. Agile vs. Hybrid',
  'title_ar', 'صيغ المقارنة بين الأساليب الثلاثة',
  'explanation_ar', 'عند المقارنة بين أساليب كما في هذا الدرس، تحتاج أدوات مقارنة دقيقة: "more flexible than" (أكثر مرونة من)، "less rigid than" (أقل جمودًا من)، و"unlike X, Y..." (بخلاف X، فإن Y...). "unlike" تبدأ الجملة بمقارنة فورية مباشرة، بينما "compared to" تحتاج فاصلة عادة: "Compared to Predictive, Agile is more adaptable."',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Agile is more adaptable than Predictive.','ar','Agile أكثر قابلية للتكيف من Predictive.'),
    jsonb_build_object('en','Unlike Predictive, Agile welcomes changing requirements.','ar','بخلاف Predictive، يرحّب Agile بالمتطلبات المتغيّرة.'),
    jsonb_build_object('en','Hybrid is less strict than a purely predictive approach.','ar','Hybrid أقل صرامة من الأسلوب التنبؤي البحت.')
  )
)) where title = 'Lesson 1.2: Project Life Cycles — Predictive, Agile, and Hybrid';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'The Passive Voice for Describing Frameworks',
  'title_ar', 'المبني للمجهول لوصف الأنظمة والعمليات',
  'explanation_ar', 'عند وصف أنظمة رسمية (كـ PMBOK)، الإنجليزية المهنية تفضّل غالبًا المبني للمجهول لأن التركيز على العملية لا الفاعل: "PMBOK is organized around key principles" أفضل أسلوبيًا من ذكر فاعل غير مهم. الصيغة: [Subject] + is/are + past participle.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','PMBOK is organized around guiding principles.','ar','يُنظَّم PMBOK حول مبادئ توجيهية.'),
    jsonb_build_object('en','Outcomes are prioritized over rigid procedures.','ar','تُعطى الأولوية للنتائج على الإجراءات الجامدة.'),
    jsonb_build_object('en','A charter is signed before execution begins.','ar','يُوقَّع الميثاق قبل بدء التنفيذ.')
  )
)) where title = 'Lesson 1.3: Introduction to PMBOK — From Processes to Principles';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Modal Verbs of Obligation in Formal Documents',
  'title_ar', 'أفعال الإلزام: must / should / need to',
  'explanation_ar', 'الميثاق وثيقة رسمية، ولغتها تعتمد على أفعال الإلزام: "must" لإلزام صارم لا استثناء فيه، "should" لتوصية قوية غير ملزمة قانونيًا، و"need to" لضرورة عملية. الفرق مهم: "The charter must be signed" (إلزامي)، مقابل "The PM should consult the sponsor" (موصى به بشدة لا قاعدة صارمة).',
  'examples', jsonb_build_array(
    jsonb_build_object('en','The charter must be signed before work begins.','ar','يجب توقيع الميثاق قبل بدء العمل.'),
    jsonb_build_object('en','A PM should identify key stakeholders early.','ar','ينبغي على مدير المشروع تحديد أصحاب المصلحة الرئيسيين مبكرًا.'),
    jsonb_build_object('en','You need to include at least one assumption.','ar','تحتاج لتضمين افتراض واحد على الأقل.')
  )
)) where title = 'Lesson 2.1: The Project Charter — The Birth Certificate of a Project';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Relative Clauses for Defining People and Things',
  'title_ar', 'الجمل الوصفية: who / that / which',
  'explanation_ar', 'لتعريف صاحب المصلحة نستخدم جملة وصفية تبدأ بـ"who" (للأشخاص) أو "that/which" (للأشياء): "A stakeholder is anyone who is affected by the project." لاحظ أن "who" يربط الجملة الوصفية بالاسم مباشرة بلا فاصلة لأنها معلومة أساسية لا إضافية.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','A stakeholder is anyone who can influence the project.','ar','صاحب المصلحة هو أي شخص يمكنه التأثير في المشروع.'),
    jsonb_build_object('en','Regulators are stakeholders that are often forgotten.','ar','الجهات التنظيمية أصحاب مصلحة كثيرًا ما يُنسَون.'),
    jsonb_build_object('en','This is the mistake which costs projects the most.','ar','هذا هو الخطأ الذي يكلّف المشاريع الأكثر.')
  )
)) where title = 'Lesson 2.2: Who Are the Stakeholders?';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'First Conditional for Stakeholder Strategy',
  'title_ar', 'الجملة الشرطية الأولى (If + Present, will + verb)',
  'explanation_ar', 'الجملة الشرطية الأولى تصف نتيجة متوقعة لشرط واقعي محتمل: "If + مضارع بسيط, will + المصدر". مناسبة لوصف استراتيجيات التعامل حسب مصفوفة القوة/الاهتمام: "If a stakeholder has high power, you will manage them closely."',
  'examples', jsonb_build_array(
    jsonb_build_object('en','If a stakeholder has high power and high interest, you will manage them closely.','ar','إذا كان لصاحب المصلحة قوة عالية واهتمام عالٍ، فستديره عن قرب.'),
    jsonb_build_object('en','If interest is low, you will monitor with minimal effort.','ar','إذا كان الاهتمام منخفضًا، فستراقبه بأقل جهد.'),
    jsonb_build_object('en','You will keep them satisfied if their power is high but interest is low.','ar','ستُبقيهم راضين إذا كانت قوتهم عالية لكن اهتمامهم منخفض.')
  )
)) where title = 'Lesson 2.3: The Power/Interest Grid';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Forming Wh- Questions for Planning',
  'title_ar', 'تكوين الأسئلة بـ Wh- (who / what / how)',
  'explanation_ar', 'خطة الإشراك مبنية على أسئلة توجيهية: من (Who)، ماذا (What)، كيف (How)، كم مرة (How often). الترتيب الصحيح: أداة السؤال + فعل مساعد + فاعل + الفعل الأساسي: "Who needs weekly reports?" وليس "Who weekly reports needs?".',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Who needs weekly reports?','ar','من يحتاج تقارير أسبوعية؟'),
    jsonb_build_object('en','What is the right channel for this group?','ar','ما القناة الأنسب لهذه الفئة؟'),
    jsonb_build_object('en','How often should we update the sponsor?','ar','كم مرة يجب أن نحدّث الراعي؟')
  )
)) where title = 'Lesson 2.4: The Stakeholder Engagement Plan';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Present Perfect vs. Past Simple for Approvals',
  'title_ar', 'Present Perfect مقابل Past Simple',
  'explanation_ar', 'استخدم Present Perfect (has/have + تصريف ثالث) حين تكون النتيجة الحالية هي المهم، بلا وقت محدد: "The charter has been approved" (النتيجة الآن: معتمَد). استخدم Past Simple حين تذكر وقتًا محددًا: "The charter was approved last Monday."',
  'examples', jsonb_build_array(
    jsonb_build_object('en','The charter has been approved.','ar','اعتُمد الميثاق (النتيجة الآن).'),
    jsonb_build_object('en','The sponsor approved it last week.','ar','اعتمده الراعي الأسبوع الماضي.'),
    jsonb_build_object('en','Has the feasibility study been completed yet?','ar','هل اكتملت دراسة الجدوى بعد؟')
  )
)) where title = 'Lesson 3.1: Initiating';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Gerunds vs. Infinitives After Certain Verbs',
  'title_ar', 'المصدر مع -ing مقابل to + المصدر',
  'explanation_ar', 'بعض الأفعال تتبعها صيغة -ing (gerund) وبعضها تتبعها "to + المصدر" (infinitive). "avoid" تتبعها -ing دائمًا: "avoid over-planning" (لا "avoid to over-plan"). لكن "need" تتبعها "to": "need to plan carefully".',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Avoid over-planning — it delays execution.','ar','تجنّب الإفراط في التخطيط — فهو يؤخّر التنفيذ.'),
    jsonb_build_object('en','The team needs to finalize the schedule.','ar','يحتاج الفريق لإنهاء الجدول الزمني.'),
    jsonb_build_object('en','Planning involves identifying every sub-plan.','ar','التخطيط يتضمّن تحديد كل خطة فرعية.')
  )
)) where title = 'Lesson 3.2: Planning';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Present Participles for Describing Active Work',
  'title_ar', 'صيغة -ing لوصف الأفعال الجارية',
  'explanation_ar', 'لوصف مهام التنفيذ الجارية، الإنجليزية تستخدم كثيرًا صيغة -ing كجزء من جملة موازية: "managing the team", "coordinating vendors", "ensuring quality" — هذه أفعال موازية تصف ما يفعله مدير المشروع أثناء التنفيذ في نفس الوقت.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Executing means managing the team and coordinating vendors.','ar','التنفيذ يعني إدارة الفريق وتنسيق الموردين.'),
    jsonb_build_object('en','Motivating the team is often harder than the technical work.','ar','تحفيز الفريق غالبًا أصعب من العمل التقني.'),
    jsonb_build_object('en','Handling unexpected changes requires flexibility.','ar','التعامل مع التغييرات غير المتوقعة يتطلب مرونة.')
  )
)) where title = 'Lesson 3.3: Executing';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Linking Words for Parallel Processes',
  'title_ar', 'روابط الزمن المتوازي: while / during / throughout',
  'explanation_ar', 'المراقبة تعمل بالتوازي مع التنفيذ لا بعده — للتعبير عن هذا التزامن نستخدم: "while" (بينما) + جملة كاملة، "during" (أثناء) + اسم، "throughout" (طوال). "during" تتبعها اسم لا جملة: "during execution".',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Monitoring runs while execution is happening.','ar','المراقبة تعمل بينما يجري التنفيذ.'),
    jsonb_build_object('en','Changes must be tracked during execution.','ar','يجب تتبّع التغييرات أثناء التنفيذ.'),
    jsonb_build_object('en','The CCB reviews requests throughout the project.','ar','يراجع مجلس ضبط التغيير الطلبات طوال المشروع.')
  )
)) where title = 'Lesson 3.4: Monitoring & Controlling';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Prepositions of Time for Closing Tasks',
  'title_ar', 'حروف جر الزمن: by / before / after',
  'explanation_ar', '"by" تعني "في موعد أقصاه" (deadline)، "before" تعني "قبل"، "after" تعني "بعد". الإغلاق الصحيح يتطلب دقة زمنية: "Lessons learned must be documented by the project''s end" — مختلفة عن "after the project ends".',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Lessons learned should be documented before the team is released.','ar','يجب توثيق الدروس المستفادة قبل تحرير الفريق.'),
    jsonb_build_object('en','Contracts must be closed by the agreed deadline.','ar','يجب إغلاق العقود بحلول الموعد المتفق عليه.'),
    jsonb_build_object('en','The handover happens after final approval.','ar','يحدث التسليم بعد الاعتماد النهائي.')
  )
)) where title = 'Lesson 3.5: Closing';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', '"X over Y" for Expressing Preference',
  'title_ar', 'استخدام Over للتعبير عن الأفضلية',
  'explanation_ar', 'بيان Agile نفسه مبني على هذه القاعدة: "[Value A] over [Value B]" تعني "نُفضّل A على B، دون إلغاء B تمامًا" — تركيب شائع في الإنجليزية المهنية للتعبير عن أولوية نسبية لا حصرية.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Individuals and interactions over processes and tools.','ar','الأفراد والتفاعلات فوق العمليات والأدوات.'),
    jsonb_build_object('en','Working software over comprehensive documentation.','ar','البرنامج العامل فوق التوثيق الشامل.'),
    jsonb_build_object('en','Responding to change over following a rigid plan.','ar','الاستجابة للتغيير فوق اتباع خطة جامدة.')
  )
)) where title = 'Lesson 4.1: The Agile Mindset';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Compound Nouns: Naming Roles and Ceremonies',
  'title_ar', 'الأسماء المركّبة لتسمية الأدوار',
  'explanation_ar', 'الإنجليزية تصنع مسمّيات وظيفية بتكديس اسمين متتاليين بلا حرف جر بينهما: "Product Owner"، "Scrum Master"، "Sprint Planning". القاعدة: الاسم الأول يصف/يحدّد الثاني، والنطق يشدّد عادة على الكلمة الأولى.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','The Product Owner sets priorities.','ar','مالك المنتج يحدّد الأولويات.'),
    jsonb_build_object('en','The Scrum Master removes blockers.','ar','مُيسِّر سكرم يزيل العوائق.'),
    jsonb_build_object('en','Sprint Planning happens before each cycle.','ar','يحدث تخطيط السبرنت قبل كل دورة.')
  )
)) where title = 'Lesson 4.2: Scrum';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Quantifiers for Describing Limits',
  'title_ar', 'أدوات الكمّ: no / any / a limit on',
  'explanation_ar', 'لوصف غياب أو حدود شيء ما: "no" + اسم (Kanban has no fixed cycles)، "any" في الجمل المنفية/الاستفهامية (without any delay)، و"a limit on" + اسم لوصف حد أقصى (a limit on work in progress).',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Kanban has no fixed time cycles.','ar','لا يعتمد Kanban دورات زمنية ثابتة.'),
    jsonb_build_object('en','There is a limit on how many tasks can be in progress.','ar','يوجد حد أقصى لعدد المهام قيد التنفيذ في وقت واحد.'),
    jsonb_build_object('en','Tickets flow continuously without any scheduled sprint.','ar','تتدفق التذاكر باستمرار بلا أي سبرنت مجدول.')
  )
)) where title = 'Lesson 4.3: Kanban';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Cause and Effect: Linking Projects to Strategy',
  'title_ar', 'روابط السبب والنتيجة: because / so that / in order to',
  'explanation_ar', 'لربط قرار المشروع بسببه الاستراتيجي: "because" (لأن) + سبب مباشر، "so that" (لكي) + نتيجة مقصودة، "in order to" + مصدر لوصف الهدف.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','A project should exist because it serves the organization''s strategy.','ar','يجب أن يوجد المشروع لأنه يخدم استراتيجية المؤسسة.'),
    jsonb_build_object('en','Organizations run programs in order to achieve broader strategic goals.','ar','تدير المؤسسات برامج لتحقيق أهداف استراتيجية أوسع.'),
    jsonb_build_object('en','A PM explains the project''s value so that stakeholders stay aligned.','ar','يشرح مدير المشروع قيمة المشروع لكي يبقى أصحاب المصلحة متوافقين.')
  )
)) where title = 'Lesson 5.1: Why Projects Exist — Linking Work to Corporate Strategy';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', '"Can" vs. "Could" for External Risk',
  'title_ar', 'Can مقابل Could للتعبير عن الاحتمال',
  'explanation_ar', '"can" يصف احتمالًا عامًا مؤكدًا نظريًا (a factor can affect the project)، بينما "could" يصف احتمالًا أضعف أو أكثر افتراضية (a regulatory change could affect assumptions) — فرق دقيق لكنه مهم عند وصف مخاطر بيئة العمل الخارجية.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','Market conditions can impact a project''s assumptions.','ar','يمكن لحالة السوق أن تؤثر في افتراضات المشروع.'),
    jsonb_build_object('en','A sudden regulatory change could force the team to adapt the plan.','ar','قد يجبر تغيير تنظيمي مفاجئ الفريق على تكييف الخطة.'),
    jsonb_build_object('en','Competitor actions could shift the project''s priorities.','ar','قد تُغيّر تحركات المنافسين أولويات المشروع.')
  )
)) where title = 'Lesson 5.2: Reading a Business Case, and the Wider External Environment';

update public.lessons set content = content || jsonb_build_object('grammar_point', jsonb_build_object(
  'title_en', 'Adverbs of Manner for Effective Communication',
  'title_ar', 'ظروف الطريقة في التواصل: actively / empathetically / clearly',
  'explanation_ar', 'ظرف الطريقة (ينتهي غالبًا بـ -ly) يصف كيفية أداء الفعل، وهو أساسي في وصف مهارات القيادة: "listen actively" (استمع بفاعلية)، "respond empathetically" (استجب بتعاطف)، "explain clearly" (اشرح بوضوح). ضعه بعد الفعل مباشرة عادة.',
  'examples', jsonb_build_array(
    jsonb_build_object('en','A good leader listens actively to stakeholder concerns.','ar','القائد الجيد يستمع بفاعلية لمخاوف أصحاب المصلحة.'),
    jsonb_build_object('en','Frame the message empathetically for a worried stakeholder.','ar','صِغ الرسالة بتعاطف لصاحب مصلحة قلق.'),
    jsonb_build_object('en','Explain the delay clearly and honestly.','ar','اشرح التأخير بوضوح وصدق.')
  )
)) where title = 'Lesson 6.1: Foundational Leadership Communication With Stakeholders';
