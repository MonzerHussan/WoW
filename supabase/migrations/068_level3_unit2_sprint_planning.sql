-- ============================================================
-- WOW - World of Work — Migration 068
-- Level 3, Unit 2 — "Sprint Planning & Execution" (7 hours), content
-- authored by the owner directly. No engine changes needed — this is
-- the first unit to exercise the extra_deltas mechanism (067) for a
-- NON-board scenario: Scenario 1's primary entity is
-- character/sponsor, and its top three choices also nudge
-- character/sarah via extra_deltas (one decision, two people
-- affected — matches real conversations, where reassuring a sponsor
-- and protecting the team are the same act, not two separate ones).
-- `sponsor` reuses the exact entity_key already established by Unit
-- 0's Board scenario (067's corrected shape), so this sponsor's trust
-- genuinely accumulates from that earlier decision, not a fresh start.
-- Scenario 2 is a plain single-entity character/sarah case, same shape
-- as every scenario in Unit 1.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod2 uuid := uuid_generate_v4();
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '068 failed: Level 3 course not found — run 066/067 first';
  end if;

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod2, v_course_id, 'Unit 2: Sprint Planning & Execution', 2);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod2, 'Lesson 2.1: Sprint Planning & Execution', 1, 420, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'board_pressure_during_planning',
          'entity_type', 'character',
          'entity_key', 'sponsor',
          'situation_ar', 'الفريق قرر يلتزم بـ18 نقطة بناءً على Velocity الفعلي. الـSponsor بيضغط: "المجلس محتاج 25 نقطة الـSprint دي، الموعد قريب."',
          'situation_en', 'The team committed to 18 points based on real velocity. The Sponsor pushes: "The board needs 25 points this sprint, the deadline is close."',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', '18 نقطة هي الالتزام الواقعي. لو محتاجين نسرّع، نتكلم في نطاق أو موارد إضافية، مش نضغط على التزام صادق.',
              'label_en', '18 points is the realistic commitment. If we need to go faster, let''s talk scope or extra resources, not pressure an honest commitment.',
              'delta', jsonb_build_object('trust', 5),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sarah', 'delta', jsonb_build_object('trust', 7, 'stress', -2))
              ),
              'feedback_ar', 'الأفضل: حماية التزام الفريق الصادق مع عرض بدائل حقيقية (نطاق/موارد) بدل الرضوخ للضغط — بالظبط "حماية التزام الفريق من ضغط خارجي غير مبرَّر جزء أساسي من القيادة".',
              'feedback_en', 'Best: protecting the team''s honest commitment while offering real alternatives (scope/resources) instead of caving to pressure — exactly "protecting the team''s commitment from unjustified external pressure is core leadership."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تمام، هنحاول 25.',
              'label_en', 'Okay, we''ll try for 25.',
              'delta', jsonb_build_object('trust', 6),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sarah', 'delta', jsonb_build_object('trust', -8, 'stress', 10))
              ),
              'feedback_ar', 'الأسوأ تقريبًا: التزام بأرقام الفريق ما وافقش عليها فعليًا بدون الرجوع له — بيرضي الـSponsor لحظيًا لكن بيكسر "الفريق بيلتزم بالـSprint، القائد بيعرض الأولويات — مش العكس" ويزوّد ضغطًا حقيقيًا على الفريق.',
              'feedback_en', 'Nearly worst: committing to numbers the team never actually agreed to, without going back to them — satisfies the Sponsor momentarily but breaks "the team commits to the sprint, the leader presents priorities — not the reverse," and adds real pressure on the team.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'خلوني أرجع للفريق أشوف لو ممكن نمدّ ساعات شغلهم.',
              'label_en', 'Let me go back to the team and see if they can extend their hours.',
              'delta', jsonb_build_object('trust', 2),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sarah', 'delta', jsonb_build_object('trust', -6, 'stress', 12))
              ),
              'feedback_ar', 'ضعيف: بيرضي الـSponsor جزئيًا بس بيحوّل الضغط للفريق تحت غطاء "استشارة" — ساعات إضافية مش التزام واقعي مبني على Velocity، وده بيزوّد التوتر بلا تحسين حقيقي في الالتزام.',
              'feedback_en', 'Weak: partially satisfies the Sponsor but pushes the pressure onto the team under the guise of "consulting" — extra hours aren''t a realistic velocity-based commitment, and this raises stress with no real improvement in delivery.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تجاهل طلب الـSponsor والاستمرار بـ18 بلا أي رد.',
              'label_en', 'Ignore the Sponsor''s request and continue with 18, with no response at all.',
              'delta', jsonb_build_object('trust', -8),
              'feedback_ar', 'ضعيف: تجاهل طلب صاحب مصلحة رئيسي بلا رد واضح بيضر الثقة حتى لو موقفك (حماية الالتزام) كان صح من حيث المبدأ — القيادة الجيدة كانت تتطلب توضيح السبب، مش صمت.',
              'feedback_en', 'Weak: ignoring a key stakeholder''s request with no clear response damages trust even when your underlying position (protecting the commitment) was right in principle — good leadership required explaining why, not silence.'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'mid_sprint_scope_request',
          'entity_type', 'character',
          'entity_key', 'sarah',
          'situation_ar', 'العميل طلب ميزة صغيرة "عاجلة" في نص الـSprint. Sarah بتسألك: "نضيفها ولا نستنى الـSprint الجاية؟"',
          'situation_en', 'The client requests a small "urgent" feature mid-sprint. Sarah asks: "Do we add it, or wait for next sprint?"',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'نقيّمها سوا: لو فعلًا حرجة، نشيل حاجة مكافئة من الالتزام الحالي — مش نضيفها فوق.',
              'label_en', 'Let''s assess it together: if it''s truly critical, we drop something equivalent from the current commitment — not add on top.',
              'delta', jsonb_build_object('trust', 8, 'respect', 6),
              'feedback_ar', 'الأفضل: بيطبّق مبدأ "زيادة النطاق نص الـSprint بلا تعديل الالتزام يضمن التسليم الناقص" — أي إضافة بتتطلب مقايضة صريحة، مش إضافة مجانية.',
              'feedback_en', 'Best: applies "adding scope mid-sprint without adjusting commitment guarantees incomplete delivery" — any addition requires an explicit trade-off, not a free add-on.'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'أضيفوها، هي صغيرة أصلًا.',
              'label_en', 'Add it, it''s small anyway.',
              'delta', jsonb_build_object('trust', -5, 'cooperation', -4),
              'feedback_ar', 'ضعيف: "صغيرة" حكم شخصي غير مبني على قياس — إضافة نطاق بلا تعديل الالتزام يضمن التسليم الناقص، حتى لو كل إضافة بمفردها بسيطة.',
              'feedback_en', 'Weak: "small" is a subjective judgment, not a measured one — adding scope without adjusting commitment guarantees incomplete delivery, even if each addition seems minor on its own.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'لأ، خالص، مفيش تغيير جوه الـSprint إطلاقًا.',
              'label_en', 'No, absolutely not, no changes inside the sprint at all.',
              'delta', jsonb_build_object('trust', -2, 'respect', -3),
              'feedback_ar', 'ضعيف: جمود كامل بلا تقييم حقيقي للطلب — الاستجابة للتغيير المدروس نجاح في الرشاقة، مش كل تغيير خطر يُرفض تلقائيًا.',
              'feedback_en', 'Weak: total rigidity with no real assessment of the request — responding to considered change is agile success, not every change being an automatic threat to reject.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تسيب Sarah تقرر لوحدها بلا أي توجيه.',
              'label_en', 'Leave Sarah to decide alone, with no guidance.',
              'delta', jsonb_build_object('stress', 6),
              'feedback_ar', 'ضعيف: التخلي عن القرار بلا أي توجيه بيسيب Sarah لوحدها في قرار مقايضة حقيقي — القيادة تعني المشاركة في القرار، مش الغياب عنه.',
              'feedback_en', 'Weak: abdicating the decision with no guidance leaves Sarah alone with a real trade-off call — leadership means being part of the decision, not absent from it.'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Sprint Planning & Execution',
        'body', 'You have an agile mindset (Module 1), but mindset alone doesn''t deliver a project. This module is about the moment agility becomes real numbers: how many stories will the team actually finish? How do you know if a sprint succeeded by a measure, not a feeling? And the hardest question: how do you act when board pressure conflicts with an honest commitment from your team?

Sprint Planning isn''t "we distribute tasks" — it''s a meeting that answers exactly two questions: what is this sprint''s goal? and what does the team genuinely believe it can finish? Practical steps: a clear one-sentence goal — "we''re delivering this sprint: full user login works" — not a scattered task list with no connecting thread; backlog refinement before the meeting itself — stories should already be clear and split before entering the meeting, not discussed from scratch in it; and the team commits — not you. The leader presents priorities; the team decides how many stories it can finish based on real capacity, not hope or external pressure.

Velocity = the average story points a team actually completes per sprint. Not a perfect number from sprint one — it stabilizes after 3-4 sprints with the same team composition. Correct use: future planning — "the team completes ~20 points per sprint, so an 80-point backlog takes ~4 sprints." Wrong use: comparing team to team ("their velocity is higher!"), or using it as pressure ("increase velocity next sprint"). Velocity is an internal measure of a team against itself over time, not a competitive cross-team metric — each team calibrates its own points anyway.

Rule points: 1) The team commits to the sprint; the leader presents priorities — not the reverse. 2) A one-sentence sprint goal beats ten disconnected tasks. 3) Refinement before the meeting frees meeting time for real decisions. 4) Velocity stabilizes after several sprints — don''t judge it from one. 5) Comparing velocity across different teams is statistically invalid. 6) Adding scope mid-sprint without adjusting commitment guarantees incomplete delivery. 7) Protecting the team''s commitment from unjustified external pressure is core leadership. 8) "We finished the sprint" means a commitment was actually met, not just that time ran out.'
      ),
      'ar', jsonb_build_object(
        'title', 'تخطيط وتنفيذ السباقات',
        'body', 'عندك عقلية رشيقة (الوحدة 1)، لكن العقلية بمفردها متسلّمش مشروع. الوحدة دي بتتكلم عن اللحظة اللي فيها الرشاقة بتتحول لأرقام حقيقية: كام قصة هيخلّص الفريق فعليًا؟ إزاي تعرف لو الـSprint نجح ولا فشل بمقياس مش شعور؟ وأصعب سؤال: هتتصرف إزاي لما ضغط المجلس التنفيذي يتعارض مع التزام صادق من فريقك؟

Sprint Planning مش اجتماع "نوزّع فيه المهام" — هو اجتماع بيجاوب على سؤالين بس: إيه هدف الـSprint ده؟ وإيه اللي الفريق واثق فعليًا إنه هيخلّصه؟ الخطوات العملية: هدف واضح بجملة واحدة — "بنسلّم دي الـSprint دي: تسجيل دخول المستخدمين يشتغل بالكامل"، مش قائمة مهام مبعثرة بلا خيط رابط؛ تنقية الـBacklog (Refinement) قبل الاجتماع نفسه — القصص لازم تكون واضحة ومقسّمة قبل ما تدخل الاجتماع، مش تتناقش من الصفر فيه؛ الفريق هو اللي بيلتزم، مش إنت — القائد بيعرض الأولويات، الفريق بيقرر كام قصة يقدر يخلّصها بناءً على قدرته الحقيقية (Capacity)، مش بناءً على أمل أو ضغط خارجي.

Velocity = متوسط نقاط القصة (Story Points) اللي الفريق بيخلّصها فعليًا كل Sprint. مش رقم مثالي من أول Sprint — بيستقر بعد 3-4 سباقات من نفس الفريق بنفس التكوين. استخدامها الصح: التخطيط المستقبلي — "الفريق بيخلّص ~20 نقطة كل Sprint، يبقى Backlog الـ80 نقطة هياخد ~4 سباقات". استخدامها الغلط: مقارنة فريق بفريق تاني ("فريقهم Velocity أعلى!") أو استخدامها كأداة ضغط ("زوّدوا الـVelocity الـSprint الجاية"). Velocity مقياس داخلي للفريق نفسه عبر الوقت، مش مقياس تنافسي بين فرق مختلفة (كل فريق بيقيّم نقاطه بمعاييره الخاصة أصلًا).

نقاط قواعدية: 1) الفريق بيلتزم بالـSprint، القائد بيعرض الأولويات — مش العكس. 2) هدف Sprint بجملة واحدة أوضح من عشرة مهام بلا خيط رابط. 3) الـRefinement قبل الاجتماع يوفّر وقت الاجتماع لقرارات حقيقية. 4) Velocity بتستقر بعد عدة سباقات — لا تحكم عليها من Sprint واحد. 5) مقارنة Velocity بين فرق مختلفة مقارنة غير صحيحة إحصائيًا. 6) زيادة النطاق نص الـSprint بلا تعديل الالتزام يضمن التسليم الناقص. 7) حماية التزام الفريق من ضغط خارجي غير مبرَّر جزء أساسي من القيادة. 8) "خلّصنا Sprint" معناها التزام تحقق فعليًا، مش مجرد وقت انتهى.'
      )
    )
  );

  raise notice '068 OK: Unit 2 module/lesson planted (course %)', v_course_id;
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
  v_sponsor_choice_a jsonb;
  v_extra_count int;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '068 failed: Level 3 course not found';
  end if;

  select id into v_module_id from public.modules
   where course_id = v_course_id and title = 'Unit 2: Sprint Planning & Execution';
  if v_module_id is null then
    raise exception '068 failed: Unit 2 module not found';
  end if;

  select id into v_lesson_id from public.lessons where module_id = v_module_id;
  if v_lesson_id is null then
    raise exception '068 failed: Unit 2 lesson not found';
  end if;

  select jsonb_array_length(content -> 'entity_decisions') into v_scenarios
    from public.lessons where id = v_lesson_id;
  if v_scenarios <> 2 then
    raise exception '068 failed: expected 2 entity_decisions scenarios, found %', v_scenarios;
  end if;

  select c into v_sponsor_choice_a
    from public.lessons l,
         jsonb_array_elements(l.content -> 'entity_decisions') s,
         jsonb_array_elements(s -> 'choices') c
   where l.id = v_lesson_id
     and s ->> 'scenario_key' = 'board_pressure_during_planning'
     and c ->> 'key' = 'A';
  if v_sponsor_choice_a is null then
    raise exception '068 failed: board_pressure_during_planning choice A not found';
  end if;
  select jsonb_array_length(v_sponsor_choice_a -> 'extra_deltas') into v_extra_count;
  if v_extra_count <> 1 then
    raise exception '068 failed: expected 1 extra_delta on sponsor choice A (sarah), found %', v_extra_count;
  end if;

  raise notice '068 OK: Unit 2 has 2 scenarios, sponsor/sarah multi-entity choice confirmed. Lesson %', v_lesson_id;
end $$;
