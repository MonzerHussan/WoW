# CLAUDE.md — تعليمات جلسات Claude Code لمشروع WOW

> اقرأ هذا الملف أولًا في كل جلسة. هو نقطة الدخول لفهم المشروع كاملًا.

## ما هذا المشروع

**WOW (World of Work)** — منصة تعليمية تأهيلية توظيفية ثنائية اللغة (AR/EN):
تعليم → توظيف → ترقية، مع وكيل ذكاء اصطناعي شخصي اسمه **Nova**، ونظام
Career DNA (توأم رقمي مهني)، ومحرك أدلة للمهارات، وعقود تشغيل خارجي
بضمان المنصة عبر شريك مرخّص.

المالك: MonzerHussan — المستودع المستهدف: `https://github.com/MonzerHussan/WoW`

## اقرأ بهذا الترتيب قبل أي عمل

1. `README.md` — التشغيل والإعداد
2. `ROADMAP.md` — ما أُنجز في كل سبرنت وما هو التالي (**المرجع الأول للحالة**)
3. `PROJECT_STRUCTURE.md` — البنية (features/ + shared/) وقواعد الاستيراد
4. `CODING_GUIDELINES.md` — قواعد الكود الملزمة (i18n، zod، أمان النقاط...)
5. `RBAC.md` — نموذج الأدوار والصلاحيات الكامل
6. `DOMAIN_CONTRACTS.md` — العقود الملزمة + ميثاق الشفافية T1–T9
7. `SECURITY.md` و`TECH_DEBT.md` — ما أُصلح وما هو مفتوح

## الحالة الحالية (لحظة كتابة هذا الملف)

**منجز ككود، غير مشغَّل بعد على بيئة المالك:**
- تطبيق Next.js 14 كامل: auth (signup/login/logout)، middleware حماية،
  onboarding، dashboard، Nova chat، نظام نقاط — بنية features/ + shared/
- قاعدة البيانات: 6 ملفات SQL يجب تشغيلها **بالترتيب الصارم**:
  `supabase/schema.sql` ثم `supabase/migrations/002..006`

**لم يُنفَّذ بعد (مهامك المحتملة الأولى):**
1. `npm install && npm run build` — تحقق أن البناء يمر (لم يُجرَّب فعليًا
   لأن بيئة التطوير السابقة كانت بلا إنترنت — أصلح أي خطأ types/imports
   صغير قد يظهر)
2. تنفيذ الـ SQL على مشروع Supabase الخاص بالمالك (بالترتيب أعلاه)
3. تعبئة `.env.local` من `.env.local.example`
4. `npm run dev` والتحقق من: signup → onboarding → dashboard → Nova
5. الرفع إلى GitHub (`MonzerHussan/WoW`)

## أوامر أساسية

```bash
npm install          # الاعتماديات
npm run dev          # تشغيل محلي
npm run build        # يجب أن يمر قبل أي push
npm run lint         # ESLint
npm run test         # vitest (smoke test)
```

## قواعد غير قابلة للكسر (ملخص — التفصيل في CODING_GUIDELINES.md)

1. **اتجاه الاستيراد**: `app → features → shared` فقط. الميزات لا تستورد
   من ميزات شقيقة (التركيب المشترك يحدث في صفحات app/).
2. **لا نصوص AR/EN مكتوبة داخل المكونات** — كل النصوص في
   `shared/i18n/dictionary.ts` عبر `t()` أو `useLang()`.
3. **كل مدخل API يُتحقق منه بـ zod** من `shared/schemas/` قبل لمس
   Supabase أو OpenAI.
4. **النقاط لا تُقبل من العميل أبدًا** — فقط `reason` يُبحث في
   `shared/constants/points.ts` (كانت ثغرة حرجة وأُصلحت — لا تُعِدها).
5. **الأسرار خادمية فقط** — لا `NEXT_PUBLIC_` على أي مفتاح سري.
6. **تغييرات قاعدة البيانات = migration جديد مرقّم** في
   `supabase/migrations/` — لا تعدّل ملفات migrations القديمة أبدًا.
7. **ميثاق الشفافية T1–T9** (في DOMAIN_CONTRACTS.md) ملزم: كل درجة لها
   تفسير إلزامي، بيانات الشخصية لا تُشارك مع المنظمات أبدًا، الموافقة
   لكل منظمة على حدة، الدرجات ترشّح ولا ترفض آليًا.
8. **الوثائق تتحدث مع الكود**: أي تغيير معماري/أمني/أدوار يحدّث الوثيقة
   المقابلة في نفس الـ commit.

## السبرنت التالي المتفق عليه: Sprint 3 — LMS UI + تغذية DNA

المجال الكامل جاهز (migrations 004-006). المطلوب بناء الواجهات والخدمات:

1. `features/lms/`: كتالوج الدورات (المنشورة فقط للزوار)، صفحة الدورة،
   مشغّل الدروس، أخذ الاختبارات (auto أولًا)، طابور تصحيح المقيّمين
   (human/hybrid).
2. **تفعيل عقد LMS→DNA** (البند §5 في DOMAIN_CONTRACTS.md):
   - إكمال درس → `lesson_progress` + نقاط `LESSON_COMPLETE` (تحقق خادمي
     من الإكمال قبل منح النقاط — TECH_DEBT #10)
   - اجتياز اختبار → `entity_skills(source='assessment')` + دليل
     `skill_evidence('quiz_attempt')` تلقائيًا
   - إصدار شهادة → `certificates` + إعادة حساب Employability
   - كل إعادة حساب درجة = صف جديد في `career_scores` (سلسلة زمنية) مع
     `explanation` إلزامي بصيغة `{factors:[{name,weight,value,tip}]}`
3. مهمتان محمولتان: (أ) middleware يعامل `profiles.status != 'active'`
   كغير مسجّل؛ (ب) نقل rate limiter من الذاكرة لمخزن مشترك (Upstash)
   قبل توسيع Nova.

## موانع إطلاق مسجّلة (لا تُطلق المنصة للجمهور قبلها)

- سياسة القاصرين/موافقة ولي الأمر (RBAC.md)
- توقيع اتفاقية مع شريك توريد عمالة مرخّص فعلي قبل تفعيل عقود
  `outsourcing` (DOMAIN_CONTRACTS.md §7)
- استشارة قانونية محلية لصياغة نصوص الضمان التجارية

## عند الشك

- الحالة والأولويات: `ROADMAP.md`
- أين يوضع الكود: `PROJECT_STRUCTURE.md`
- هل هذا مسموح: `CODING_GUIDELINES.md` ثم `DOMAIN_CONTRACTS.md`
- ولا تكسر بناءً يعمل: `npm run build` قبل كل commit.
