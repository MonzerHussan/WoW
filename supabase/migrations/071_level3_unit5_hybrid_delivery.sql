-- ============================================================
-- WOW - World of Work — Migration 071
-- Level 3, Unit 5 — "Hybrid Project Delivery" (7 hours), content
-- authored by the owner directly.
--
-- Uses only characters/entities that already exist (cto, sponsor,
-- organization/org) — no new characters introduced. Both scenarios are
-- real project-methodology decisions with a clear trade-off and reason,
-- so both carry log_decision: true (owner's own scope rule, same
-- category as Units 2/4 — see 070's header).
--
-- Scenario 1 (new-component methodology choice): primary entity is
-- character/cto (the CTO is the one directly affected by a delivery-
-- methodology call for a technical component), with organization/org's
-- org_planning_maturity as an extra_delta — same pattern as 070's
-- cfo_cto_conflict scenario.
--
-- Scenario 2 (unifying board reporting): primary entity is
-- character/sponsor. Choice C's "cooperation -4" in the owner's brief
-- is read as landing on character/sarah (the team lead whose already-
-- established `cooperation` metric, seen since Unit 3's
-- suddenly_quiet_member scenario, is the one directly strained by being
-- forced into a reporting format that isn't real for her team) — added
-- as an extra_delta, not a bare unassigned number.
-- ============================================================

do $$
declare
  v_course_id uuid;
  v_mod5 uuid := uuid_generate_v4();
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  if v_course_id is null then
    raise exception '071 failed: Level 3 course not found — run 066-070 first';
  end if;

  insert into public.modules (id, course_id, title, order_index) values
    (v_mod5, v_course_id, 'Unit 5: Hybrid Project Delivery', 5);

  insert into public.lessons (module_id, title, order_index, duration_minutes, is_free_preview, review_status, content, translations) values
  (
    v_mod5, 'Lesson 5.1: Hybrid Project Delivery', 1, 420, false, 'approved',
    jsonb_build_object(
      'entity_decisions', jsonb_build_array(
        jsonb_build_object(
          'scenario_key', 'new_component_methodology_choice',
          'entity_type', 'character',
          'entity_key', 'cto',
          'log_decision', true,
          'situation_ar', 'مشروعك عنده مكوّن جديد: تكامل مع نظام حكومي له مواصفات API ثابتة ومنشورة رسميًا، لا مجال للتغيير فيها.',
          'situation_en', 'Your project has a new component: integration with a government system that has fixed, officially published API specs with no room for change.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'تنبؤي — خطة تفصيلية ثابتة من الأول، مواصفات معتمدة قبل أي كود.',
              'label_en', 'Predictive — a detailed fixed plan from the start, specs approved before any code.',
              'delta', jsonb_build_object('trust', 7),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', 6))
              ),
              'feedback_ar', 'الأفضل: قرار تنبؤي واعٍ لمكوّن متطلباته ثابتة وموثّقة رسميًا — بالظبط "طبيعة المكوّن هي المعيار، مش تفضيل شخصي للمنهجية"، ومناسب لأن "البنية التحتية اللي عليها اعتماديات كتير غالبًا تحتاج استقرار تنبؤي".',
              'feedback_en', 'Best: a deliberate predictive choice for a component with fixed, officially documented requirements — exactly "component nature is the criterion, not personal preference," and fitting because "foundational infrastructure with many dependents usually needs predictive stability."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'أجايل — Sprints قصيرة نكتشف فيها المواصفات تدريجيًا.',
              'label_en', 'Agile — short sprints where we discover the specs gradually.',
              'delta', jsonb_build_object('trust', -6),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -5))
              ),
              'feedback_ar', 'ضعيف: فرض أجايل على مكوّن متطلباته ثابتة فعليًا بيكلّف تغيير مستمر بلا فائدة حقيقية — عكس "فرض أجايل على مستقر = تكلفة تغيير بلا فائدة حقيقية".',
              'feedback_en', 'Weak: forcing agile onto a component whose requirements are actually fixed costs ongoing change with no real benefit — the opposite of "forcing agile onto something stable = change cost with no real benefit."'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'تسيب الفريق يقرر المنهجية بلا معيار واضح.',
              'label_en', 'Let the team decide the methodology with no clear criterion.',
              'delta', jsonb_build_object('trust', -3),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -3))
              ),
              'feedback_ar', 'ضعيف: ترك القرار للفريق بلا معيار واضح بيفوّت جوهر الفكرة — المنهجية قرار واعٍ لكل مكوّن بناءً على طبيعته، مش تفضيل عشوائي.',
              'feedback_en', 'Weak: leaving the decision to the team with no clear criterion misses the point — methodology is a deliberate per-component decision based on its nature, not an arbitrary preference.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'هجين عشوائي بلا سبب محدد لكل جزء.',
              'label_en', 'A random hybrid with no defined reason for each part.',
              'delta', jsonb_build_object('trust', -4),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', -4))
              ),
              'feedback_ar', 'الأسوأ: هجين بلا سبب محدد لكل جزء عكس جوهر المبدأ — "الهجين قرار واعٍ لكل مكوّن، مش خلط عشوائي بين منهجيتين".',
              'feedback_en', 'Worst: a hybrid with no defined reason per part is the opposite of the core principle — "hybrid is a deliberate per-component decision, not a random mix."'
            )
          )
        ),
        jsonb_build_object(
          'scenario_key', 'unify_board_reporting',
          'entity_type', 'character',
          'entity_key', 'sponsor',
          'log_decision', true,
          'situation_ar', 'جزء من فريقك بيشتغل Sprints أسبوعية، وجزء تاني بيسلّم معالم شهرية. الـSponsor محتاج تحديث واحد مفهوم للمجلس.',
          'situation_en', 'Part of your team runs weekly sprints, another delivers monthly milestones. The Sponsor needs one comprehensible update for the board.',
          'choices', jsonb_build_array(
            jsonb_build_object(
              'key', 'A',
              'label_ar', 'لوحة قيادة موحّدة بمقاييس مشتركة (نسبة إنجاز، مخاطر، جدول عام) تترجم الاتنين.',
              'label_en', 'A unified dashboard with shared metrics (completion %, risks, overall schedule) translating both.',
              'delta', jsonb_build_object('trust', 8),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'organization', 'entity_key', 'org', 'delta', jsonb_build_object('org_planning_maturity', 5))
              ),
              'feedback_ar', 'الأفضل: طبقة تقرير موحّدة بمقاييس مشتركة بتترجم الإيقاعين المختلفين للغة واحدة — بالظبط الحل المقترح: "تعدد إيقاعات التقرير محتاج طبقة توحيد، مش تجاهل الفرق".',
              'feedback_en', 'Best: a unified reporting layer with shared metrics translates both rhythms into one language — exactly the fix: "multiple reporting rhythms need a unifying layer, not ignoring the difference."'
            ),
            jsonb_build_object(
              'key', 'B',
              'label_ar', 'تقديم تقريرين منفصلين تمامًا بلا رابط بينهم.',
              'label_en', 'Presenting two fully separate reports with no link between them.',
              'delta', jsonb_build_object('trust', -5),
              'feedback_ar', 'ضعيف: تقديم تقريرين منفصلين تمامًا بيسيب المجلس بدون صورة واحدة متماسكة — بالظبط المخاطرة المذكورة: المجلس هيحس إن مفيش صورة واحدة متماسكة للمشروع.',
              'feedback_en', 'Weak: two fully separate reports leave the board without one coherent picture — exactly the named risk: the board will feel there is no single coherent picture of the project.'
            ),
            jsonb_build_object(
              'key', 'C',
              'label_ar', 'إجبار الفريق التنبؤي يقدّم بصيغة Sprint مش حقيقية عنده.',
              'label_en', 'Forcing the predictive team to report in a Sprint format that is not real for them.',
              'delta', jsonb_build_object('trust', -2),
              'extra_deltas', jsonb_build_array(
                jsonb_build_object('entity_type', 'character', 'entity_key', 'sarah', 'delta', jsonb_build_object('cooperation', -4))
              ),
              'feedback_ar', 'ضعيف: إجبار فريق تنبؤي يقدّم بصيغة Sprint مش حقيقية عنده بيكسر تعاون الفريق بلا داعٍ — الحل الصح توحيد التقرير فوق المنهجيتين، مش فرض منهجية واحدة على الكل.',
              'feedback_en', 'Weak: forcing a predictive team to report in a Sprint format that is not real for them needlessly strains team cooperation — the right fix unifies reporting above both methodologies, not forcing one methodology on everyone.'
            ),
            jsonb_build_object(
              'key', 'D',
              'label_ar', 'تأجيل تحديث المجلس لحد ما "كل حاجة تتزامن".',
              'label_en', 'Postponing the board update until "everything syncs up."',
              'delta', jsonb_build_object('trust', -7),
              'feedback_ar', 'الأسوأ: تأجيل تحديث المجلس لحد "كل حاجة تتزامن" بيسيب المجلس بلا صورة للمدة دي بالكامل — عكس الحل العملي المباشر: طبقة توحيد فورية فوق الإيقاعين.',
              'feedback_en', 'Worst: delaying the board update until "everything syncs up" leaves the board with no picture at all for that whole period — the opposite of the direct, practical fix: an immediate unifying layer above both rhythms.'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'en', jsonb_build_object(
        'title', 'Hybrid Project Delivery',
        'body', 'So far you''ve treated your project as fully agile (Sprints, Velocity, Daily). But reality is more complex: your real project has parts with clear, stable requirements, and parts that are ambiguous and evolving. Hybrid delivery isn''t a random "half agile, half waterfall" mix — it''s a deliberate decision for each part of the project separately.

The question isn''t "agile or waterfall — which is better?" — it''s "what is this component''s nature?" Clear/stable/low-change-risk requirements point to the predictive model (waterfall) — e.g. a fixed-spec regulatory commitment. Ambiguous, expected-to-change requirements point to the adaptive model (agile) — e.g. a new product feature, UI design. Foundational infrastructure with many dependents usually leans predictive (stability matters more than flexibility) — e.g. a core database, API architecture. New technical exploration benefits from adaptive (fast, cheap learning from failure) — e.g. evaluating a new technology before committing to it. The common mistake in both directions: forcing agile onto a component whose requirements are actually stable (unnecessary ongoing change cost), or forcing waterfall onto a component whose requirements are ambiguous (early commitment to a design that will certainly change).

The hardest part of a hybrid project isn''t choosing the methodology per component — it''s unifying the picture for the board watching parts with completely different reporting rhythms (one part delivers a Sprint Review every two weeks, another delivers a monthly milestone report). If you present each part in its own separate logic with no connecting thread, the board will feel there is no single coherent picture of the project. The practical fix: a unified reporting layer above both — one dashboard with shared metrics (completion %, active risks, overall-schedule adherence) that translates each part''s progress into the same language the board understands.

Rule points: 1) Hybrid is a deliberate per-component decision, not a random mix. 2) Component nature (requirement stability) is the criterion, not personal preference. 3) Forcing agile onto something stable = ongoing change cost with no real benefit. 4) Forcing waterfall onto something ambiguous = early commitment to a design that will certainly change. 5) Foundational infrastructure with many dependents usually needs predictive stability. 6) New technical exploration benefits from fast adaptive learning. 7) Multiple reporting rhythms need a unifying layer, not ignoring the difference. 8) Choosing the right methodology per component is a real Planning Maturity signal.'
      ),
      'ar', jsonb_build_object(
        'title', 'التسليم الهجين للمشاريع',
        'body', 'لحد دلوقتي تعاملت مع مشروعك كأنه رشيق بالكامل (Sprints، Velocity، Daily). لكن الواقع أعقد: مشروعك الحقيقي عنده أجزاء واضحة المتطلبات ومستقرة (زي التزام تنظيمي أو بنية تحتية ثابتة)، وأجزاء تانية غامضة ومتغيّرة (زي ميزة مستخدم جديدة محدش متأكد شكلها النهائي). النموذج الهجين مش "نص أجايل ونص شلال" عشوائي — هو قرار واعٍ لكل جزء من المشروع على حدة.

السؤال مش "أجايل ولا شلال أفضل؟" — السؤال "المكوّن ده طبيعته إيه؟" متطلبات واضحة/ثابتة/منخفضة المخاطر التغييرية → النموذج التنبؤي (شلال) — مثال: التزام تنظيمي بمواصفات محددة سلفًا. متطلبات غامضة، متوقع تتغيّر → النموذج التكيّفي (أجايل) — مثال: ميزة منتج جديدة، تصميم واجهة مستخدم. بنية تحتية عليها اعتماديات كتير → تنبؤي غالبًا (استقرار أهم من مرونة) — مثال: قاعدة بيانات أساسية، معمارية API. تجربة/استكشاف تقني جديد → تكيّفي (تعلّم سريع من فشل رخيص) — مثال: تقييم تقنية جديدة قبل الالتزام بيها. الخطأ الشائع في الاتجاهين: فرض أجايل على مكوّن متطلباته ثابتة فعليًا (تكلفة تغيير مستمر بلا داعي)، أو فرض شلال على مكوّن متطلباته غامضة (التزام مبكر بتصميم هيتغيّر أكيد).

أصعب جزء في المشروع الهجين مش اختيار المنهجية لكل مكوّن — هو توحيد الصورة للمجلس التنفيذي وهو بيشوف أجزاء بإيقاعات تقرير مختلفة تمامًا (جزء بيقدّم Sprint Review كل أسبوعين، جزء تاني بيقدّم تقرير معالم شهري). لو قدّمت كل جزء بمنطقه المنفصل بلا خيط رابط، المجلس هيحس إن مفيش صورة واحدة متماسكة للمشروع. الحل العملي: طبقة تقرير موحّدة فوق الاتنين — لوحة قيادة واحدة بمقاييس مشتركة (نسبة الإنجاز، المخاطر النشطة، الالتزام بالجدول العام)، تترجم تقدّم كل جزء (سواء Sprint أو معلم) لنفس اللغة اللي المجلس بيفهمها.

نقاط قواعدية: 1) الهجين قرار واعٍ لكل مكوّن، مش خلط عشوائي بين منهجيتين. 2) طبيعة المكوّن (استقرار المتطلبات) هي المعيار، مش تفضيل شخصي للمنهجية. 3) فرض أجايل على مستقر = تكلفة تغيير بلا فائدة حقيقية. 4) فرض شلال على غامض = التزام مبكر بتصميم هيتغيّر أكيد. 5) البنية التحتية اللي عليها اعتماديات كتير غالبًا تحتاج استقرار تنبؤي. 6) الاستكشاف التقني الجديد يستفيد من التعلّم السريع التكيّفي. 7) تعدد إيقاعات التقرير محتاج طبقة توحيد، مش تجاهل الفرق. 8) اختيار المنهجية الصح لكل مكوّن مؤشر نضج تخطيطي حقيقي (Planning Maturity).'
      )
    )
  );

  raise notice '071 OK: Unit 5 module/lesson planted (course %)', v_course_id;
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
  v_flagged int;
begin
  select id into v_course_id from public.courses
   where title = 'معتمد تسليم المشاريع والقيادة الرشيقة — المستوى الثالث';
  select id into v_module_id from public.modules
   where course_id = v_course_id and title = 'Unit 5: Hybrid Project Delivery';
  if v_module_id is null then
    raise exception '071 failed: Unit 5 module not found';
  end if;

  select id into v_lesson_id from public.lessons where module_id = v_module_id;
  if v_lesson_id is null then
    raise exception '071 failed: Unit 5 lesson not found';
  end if;

  select jsonb_array_length(content -> 'entity_decisions') into v_scenarios
    from public.lessons where id = v_lesson_id;
  if v_scenarios <> 2 then
    raise exception '071 failed: expected 2 entity_decisions scenarios, found %', v_scenarios;
  end if;

  select count(*) into v_flagged
    from public.lessons l, jsonb_array_elements(l.content -> 'entity_decisions') s
   where l.id = v_lesson_id and (s ->> 'log_decision')::boolean is true;
  if v_flagged <> 2 then
    raise exception '071 failed: expected both Unit 5 scenarios flagged log_decision=true, found %', v_flagged;
  end if;

  raise notice '071 OK: Unit 5 planted with 2 scenarios, both log_decision=true.';
end $$;
