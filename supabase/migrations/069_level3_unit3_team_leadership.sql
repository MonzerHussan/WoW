-- ============================================================
-- WOW - World of Work — Migration 069
-- Level 3, Unit 3 — "Team Leadership & EI" (6 hours), content authored
-- by the owner directly. Introduces a second team character, Ahmed
-- (Backend Developer, entity_key='ahmed') — the first entirely new
-- character since Sarah in Unit 0, starting neutral (50) on every
-- metric exactly like Sarah did, via the same apply_entity_memory_event
-- default. Scenario 1 is the first case where TWO characters are
-- affected with comparable weight by one choice (not a primary/
-- secondary asymmetry like Unit 2's sponsor+sarah) — implemented as
-- sarah=primary (scenario-level), ahmed=extra_deltas; this is purely
-- an implementation detail, not a design decision, since the client UI
-- always shows feedback text from the lesson's own local content, never
-- from which entity the RPC response labels "primary." No engine
-- changes needed — 067's extra_deltas already covers this shape.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod3 uuid := uuid_generate_v4();
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '069 failed: Level 3 course not found — run 066-068 first';
  end if;

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod3, v_course_id, 'Unit 3: Team Leadership & EI', 3);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod3, 'Lesson 3.1: Team Leadership & EI', 1, 360, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'sarah_ahmed_conflict',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'situation_ar', 'Sarah وAhmed (Backend Developer) في خلاف علني وسط اجتماع الفريق حول قرار تقني. الجو متوتر، الفريق كله بيلاحظ.',
          'situation_en', 'Sarah and Ahmed (Backend Developer) are in an open disagreement mid-team-meeting over a technical decision. The room is tense, the whole team notices.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'خلينا نسمع منطق الاتنين بهدوء، بعدين نقرر — الاختلاف التقني حاجة صحية.',
              'label_en', 'Let''s calmly hear both sides'' reasoning, then decide — technical disagreement is healthy.',
              'delta', jsonb_build_object('trust', 6),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'ahmed', 'delta', jsonb_build_object('trust', 7, 'respect', 6))
              ),
              'feedback_ar', 'الأفضل: سماع الطرفين قبل الحكم بيبني ثقة الاتنين، وبيتعامل مع الخلاف التقني كصحي مش كخطر — بالظبط "القائد اللي يسمع طرفي الخلاف قبل ما يحكم بيبني ثقة الاتنين" و"Storming مرحلة صحية متوقعة".',
              'feedback_en', 'Best: hearing both sides before judging builds trust with both, and treats technical disagreement as healthy, not a threat — exactly "a leader who hears both sides of a conflict before judging builds trust with both" and "Storming is a healthy, expected stage."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تنحاز لـSarah فورًا لأنها الأقدم في الفريق.',
              'label_en', 'Side with Sarah immediately because she''s more senior on the team.',
              'delta', jsonb_build_object('trust', 3),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'ahmed', 'delta', jsonb_build_object('trust', -9, 'respect', -7))
              ),
              'feedback_ar', 'الأسوأ تقريبًا: الانحياز قبل السماع بيكسر ثقة الطرف التاني تمامًا، حتى لو الأقدمية سبب مفهوم — القيادة الجيدة تسمع المنطق مش الأقدمية.',
              'feedback_en', 'Nearly worst: siding before listening breaks the other party''s trust entirely, even when seniority is an understandable reason — good leadership listens to reasoning, not seniority.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'خلينا نأجل الموضوع، مش وقته دلوقتي.',
              'label_en', 'Let''s postpone this, now isn''t the time.',
              'delta', jsonb_build_object('trust', -3),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'ahmed', 'delta', jsonb_build_object('trust', -3))
              ),
              'feedback_ar', 'ضعيف: تأجيل خلاف علني وسط الفريق بيسيبه معلّق بلا حل — الفريق كله شافه، والتجاهل بيضر ثقة الطرفين معًا.',
              'feedback_en', 'Weak: postponing an open conflict in front of the team leaves it unresolved — the whole team saw it, and ignoring it damages both parties'' trust.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'توبّخ الاتنين قدام الفريق عشان "يهدوا".',
              'label_en', 'Scold both of them in front of the team to "calm them down."',
              'delta', jsonb_build_object('trust', -8, 'stress', 10),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'ahmed', 'delta', jsonb_build_object('trust', -8, 'stress', 10))
              ),
              'feedback_ar', 'الأسوأ: قمع الخلاف بدل إدارته بيرجّع الفريق لـForming زايف بلا ثقة حقيقية — بالظبط الخطأ الشائع اللي اتوصف في نموذج تاكمان.',
              'feedback_en', 'Worst: suppressing the conflict instead of managing it reverts the team to fake Forming with no real trust — exactly the common mistake described in Tuckman''s model.'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'suddenly_quiet_member',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'situation_ar', 'Sarah كانت دايمًا نشيطة في النقاشات، لكن آخر أسبوعين بقت هادئة وبترد بجمل قصيرة بس. سألتها "إنتِ تمام؟" فردّت "أيوه تمام" بسرعة.',
          'situation_en', 'Sarah was always active in discussions, but for the last two weeks she''s been quiet, replying in short sentences only. You asked "are you okay?" and she quickly replied "yeah, fine."',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'تسيبها مساحة، لكن تتابع في لقاء فردي هادئ بلا ضغط: "لو حابة تتكلمي في أي وقت، أنا موجود."',
              'label_en', 'Give her space, but follow up in a quiet one-on-one with no pressure: "If you ever want to talk, I''m here."',
              'delta', jsonb_build_object('trust', 7, 'stress', -5),
              'feedback_ar', 'الأفضل: تعاطف حقيقي بلا ضغط لحظي — بيطبّق "عضو هادئ فجأة مش دايمًا تمام — لاحظ التغيّر، مش بس الكلام" من غير ما يحرجها قدام حد.',
              'feedback_en', 'Best: real empathy without immediate pressure — applies "a suddenly-quiet member isn''t always fine — notice the change, not just the words" without embarrassing her in front of anyone.'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تقبل "تمام" على إنها الإجابة النهائية وتكمل عادي.',
              'label_en', 'Accept "fine" as the final answer and move on as normal.',
              'delta', jsonb_build_object('trust', -4, 'stress', 6),
              'feedback_ar', 'ضعيف: قبول الإجابة السطحية بلا أي متابعة بيسيب التغيّر الحقيقي غير مُلاحَظ — عكس مبدأ التعاطف.',
              'feedback_en', 'Weak: accepting the surface answer with no follow-up leaves the real change unnoticed — the opposite of the empathy principle.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'تضغط في نفس اللحظة قدام الفريق: "لأ إنتِ مش تمام، إيه اللي بيحصل؟"',
              'label_en', 'Push right then in front of the team: "No, you''re not fine, what''s going on?"',
              'delta', jsonb_build_object('trust', -6, 'stress', 8),
              'feedback_ar', 'ضعيف: ضغط مباشر وسط الفريق بيحرجها بدل ما يريحها — التعاطف يعني فهم التوقيت والسياق، مش بس السؤال الصح في وقت غلط.',
              'feedback_en', 'Weak: direct pressure in front of the team embarrasses rather than comforts her — empathy means understanding timing and context, not just asking the right question at the wrong time.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تتجاهل الموضوع تمامًا وتركّز على المهام بس.',
              'label_en', 'Ignore it entirely and focus on tasks only.',
              'delta', jsonb_build_object('trust', -8, 'stress', 10, 'cooperation', -5),
              'feedback_ar', 'الأسوأ: تجاهل تغيّر واضح في سلوك عضو بيكسر الثقة والتعاون مع بعض — بالظبط عكس الوعي بالتأثير البشري للقرارات.',
              'feedback_en', 'Worst: ignoring a clear behavioral change breaks both trust and cooperation together — the direct opposite of awareness of decisions'' human impact.'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Team Leadership & EI',
        'body', 'So far, every decision was between you and one person at a time (Sarah, or a board member). This module is different: you''re dealing with a team — group dynamics, conflict between individuals, and emotions not always stated openly. This is exactly where Leadership DNA starts recording — your signature style of leading people, separate from the planning skills measured in Levels 1-2.

Daniel Goleman''s EI model breaks into five practical elements: self-awareness (noticing your reaction to criticism has become defensive), self-regulation (pausing before responding under pressure), motivation (staying committed after initial enthusiasm fades), empathy (noticing a suddenly-quiet member isn''t "fine" even if they say so), and social skill (managing a conflict between two people without picking a side before hearing both). Critical point: empathy doesn''t mean agreeing with everything or avoiding hard decisions. It means understanding a decision''s human impact and then making it consciously — not ignoring the impact, and not letting the impact paralyze the right call for the project.

Every team passes through predictable stages, and a leader who doesn''t know them misreads the second one completely: Forming (excess politeness, no one states real opinions), Storming (real disagreements surface — this is required and healthy, not a failure signal; a team avoiding storming stays stuck in shallow politeness that never builds real trust), Norming (the team agrees on a shared way of working, trust starts building), Performing (a high-functioning team managing itself with minimal intervention), Adjourning (project/team ends — celebrate, document lessons learned). Common mistake: a leader sees Storming and feels they''ve failed to build a cohesive team, so they intervene forcefully to suppress the conflict instead of managing it. Result: the team reverts to fake Forming (politeness without real trust) instead of reaching Norming.

Rule points: 1) Emotional intelligence is a trainable practical skill, not a fixed personality trait. 2) Empathy means understanding human impact, not avoiding the hard decision because of it. 3) Storming is a healthy, expected stage — suppressing it delays team maturity, not speeds it up. 4) A leader who hears both sides of a conflict before judging builds trust with both. 5) A suddenly-quiet member isn''t always "fine" — notice the change, not just the words. 6) A team in the Performing stage needs less intervention from the leader, not more. 7) Self-awareness of your reactions under pressure is the first step to regulating them. 8) Leadership DNA accumulates from your pattern of decisions with people, not from a single outcome.'
      ),
      'ar', jsonb_build_object(
        'title', 'قيادة الفريق والذكاء العاطفي',
        'body', 'لحد دلوقتي كل قراراتك كانت بينك وبين شخص واحد في كل مرة (Sarah، أو عضو مجلس). الوحدة دي مختلفة: هتتعامل مع فريق — ديناميكية جماعية، صراعات بين أفراد، ومشاعر مش دايمًا معلَنة. هنا تحديدًا بيبدأ Leadership DNA يتسجّل — بصمة أسلوبك في قيادة البشر، منفصلة عن مهاراتك التخطيطية اللي اتقاسها في مستوى 1-2.

نموذج دانيال جولمان للذكاء العاطفي بيقسمه لخمسة عناصر عملية، مش مجرد "كن لطيف": الوعي الذاتي — تلاحظ إن رد فعلك على انتقاد فريقك بقى دفاعي أكتر من اللازم؛ ضبط الذات — تاخد نفس قبل ما ترد وقت الضغط، بدل رد فعل فوري نادم عليه؛ الدافعية — تفضل ملتزم بالهدف حتى لما الحماس الأولي يقل؛ التعاطف — تلاحظ إن عضو هادئ فجأة مش "بخير"، حتى لو قال "تمام"؛ المهارات الاجتماعية — تدير خلاف بين شخصين بلا ما تنحاز لطرف قبل ما تسمع الاتنين. نقطة حرجة: التعاطف مش معناه توافق على كل حاجة أو تتجنب قرارات صعبة. التعاطف يعني تفهم الأثر البشري للقرار وبعدين تاخده بوعي — مش تتجاهل الأثر، ومش تسيب الأثر يمنعك تاخد القرار الصح للمشروع.

كل فريق بيمر بمراحل متوقعة، والقائد اللي مش عارفها بيفسّر المرحلة التانية غلط تمامًا: Forming (التشكّل، تهذيب زايد، محدش بيقول رأيه الحقيقي بصراحة)؛ Storming (الصراع، خلافات حقيقية بتظهر — ده مطلوب وصحي، مش علامة فشل؛ فريق يتجنب الـStorming بيفضل عالق في تهذيب سطحي مايبنيش ثقة حقيقية)؛ Norming (الاستقرار، الفريق بيتفق على طريقة عمل مشتركة، الثقة بتبدأ تتبني فعليًا)؛ Performing (الأداء العالي، فريق قادر يدير نفسه بأقل تدخل، القرارات بتتاخد بسرعة وثقة متبادلة)؛ Adjourning (الانتهاء، نهاية المشروع/الفريق، احتفال بالإنجاز وتوثيق الدروس المستفادة). الخطأ الشائع: قائد بيشوف Storming ويحس إنه فشل في بناء فريق متماسك، فيتدخل بقوة يقمع الخلاف بدل ما يديره. النتيجة: الفريق بيرجع لـForming الزايف (تهذيب بلا ثقة حقيقية) بدل ما يوصل لـNorming.

نقاط قواعدية: 1) الذكاء العاطفي مهارة عملية قابلة للتدريب، مش صفة شخصية ثابتة. 2) التعاطف يعني فهم الأثر البشري، مش تجنّب القرار الصعب بسببه. 3) Storming مرحلة صحية متوقعة — قمعها بيأخّر نضج الفريق، مش يسرّعه. 4) القائد اللي يسمع طرفي الخلاف قبل ما يحكم بيبني ثقة الاتنين. 5) عضو هادئ فجأة مش دايمًا "بخير" — لاحظ التغيّر، مش بس الكلام. 6) الفريق في مرحلة Performing محتاج تدخل أقل، مش أكتر، من القائد. 7) الوعي الذاتي بردود فعلك تحت الضغط أول خطوة لضبطها. 8) Leadership DNA بيتراكم من نمط قراراتك مع البشر، مش من نتيجة واحدة.'
      )
    )
  );

  raise notice '069 OK: Unit 3 module/lesson planted with Ahmed as a new character (course %)', v_course_id;
end $$;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_scenarios int;
  v_conflict_choice_a jsonb;
  v_ahmed_extra jsonb;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '069 failed: Level 3 course not found';
  end if;

  select id into v_module_id from public.modules
   where course_id = v_course_id and title = 'Unit 3: Team Leadership & EI';
  if v_module_id is null then
    raise exception '069 failed: Unit 3 module not found';
  end if;

  select id into v_lesson_id from public.lessons where module_id = v_module_id;
  if v_lesson_id is null then
    raise exception '069 failed: Unit 3 lesson not found';
  end if;

  select jsonb_array_length(content -> 'entity_decisions') into v_scenarios
    from public.lessons where id = v_lesson_id;
  if v_scenarios <> 2 then
    raise exception '069 failed: expected 2 entity_decisions scenarios, found %', v_scenarios;
  end if;

  select c into v_conflict_choice_a
    from public.lessons l,
         jsonb_array_elements(l.content -> 'entity_decisions') s,
         jsonb_array_elements(s -> 'choices') c
   where l.id = v_lesson_id
     and s ->> 'scenario_key' = 'sarah_ahmed_conflict'
     and c ->> 'key' = 'A';
  if v_conflict_choice_a is null then
    raise exception '069 failed: sarah_ahmed_conflict choice A not found';
  end if;

  select e into v_ahmed_extra
    from jsonb_array_elements(v_conflict_choice_a -> 'extra_deltas') e
   where e ->> 'entity_key' = 'ahmed';
  if v_ahmed_extra is null then
    raise exception '069 failed: ahmed extra_delta not found on conflict choice A';
  end if;

  raise notice '069 OK: Unit 3 has 2 scenarios, Ahmed introduced via extra_deltas on the conflict scenario. Lesson %', v_lesson_id;
end $$;
