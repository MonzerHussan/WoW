/**
 * Single source of truth for all bilingual UI strings.
 * Organized by feature so each feature only imports what it needs.
 * Adding a new string: add it once here, in both languages — never inline
 * a new hardcoded AR/EN pair inside a component again.
 */
export const dictionary = {
  common: {
    langAr: { ar: "AR", en: "AR" },
    langEn: { ar: "EN", en: "EN" },
    back: { ar: "رجوع", en: "Back" },
    next: { ar: "التالي", en: "Next" },
    loading: { ar: "جارِ التحميل...", en: "Loading..." },
    somethingWentWrong: { ar: "حدث خطأ، حاول مرة أخرى.", en: "Something went wrong. Please try again." },
    retry: { ar: "إعادة المحاولة", en: "Retry" },
  },

  /**
   * User-facing translations of Supabase/auth failures. Raw technical
   * messages must never reach the UI — map them via
   * shared/i18n/supabase-errors.ts (translateAuthError).
   */
  authErrors: {
    invalidCredentials: {
      ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      en: "Incorrect email or password.",
    },
    userExists: {
      ar: "هذا البريد مسجّل لدينا مسبقًا — جرّب تسجيل الدخول بدلًا من ذلك.",
      en: "This email is already registered — try logging in instead.",
    },
    emailNotConfirmed: {
      ar: "بريدك غير مؤكَّد بعد — افتح رسالة التأكيد المرسلة إلى بريدك.",
      en: "Your email isn't confirmed yet — check your inbox for the confirmation link.",
    },
    rateLimit: {
      ar: "محاولات كثيرة خلال وقت قصير — انتظر قليلًا ثم حاول مجددًا.",
      en: "Too many attempts — please wait a moment and try again.",
    },
    weakPassword: {
      ar: "كلمة المرور ضعيفة — استخدم 8 أحرف على الأقل.",
      en: "Password is too weak — use at least 8 characters.",
    },
    invalidEmail: {
      ar: "البريد الإلكتروني غير صالح — تأكد من كتابته بشكل صحيح.",
      en: "That email address doesn't look valid — please double-check it.",
    },
    signupDisabled: {
      ar: "التسجيل متوقف مؤقتًا — حاول لاحقًا.",
      en: "Sign-ups are temporarily paused — please try again later.",
    },
    userBanned: {
      ar: "هذا الحساب موقوف حاليًا — تواصل مع الدعم.",
      en: "This account is currently suspended — please contact support.",
    },
    sessionExpired: {
      ar: "انتهت جلستك — سجّل الدخول من جديد.",
      en: "Your session has expired — please log in again.",
    },
    offline: {
      ar: "لا يوجد اتصال بالإنترنت — تحقق من الشبكة ثم حاول مجددًا.",
      en: "You're offline — check your connection and try again.",
    },
    network: {
      ar: "تعذّر الوصول إلى الخادم — تحقق من اتصالك ثم حاول مجددًا.",
      en: "Couldn't reach the server — check your connection and try again.",
    },
    oauthCancelled: {
      ar: "ألغيت تسجيل الدخول عبر Google — يمكنك المحاولة مجددًا متى شئت.",
      en: "Google sign-in was cancelled — you can try again anytime.",
    },
    oauthFailed: {
      ar: "تعذّر إكمال تسجيل الدخول عبر Google — حاول مجددًا أو استخدم البريد وكلمة المرور.",
      en: "Couldn't complete Google sign-in — try again or use email and password.",
    },
  },

  auth: {
    signupEyebrow: { ar: "انضم إلى WOW", en: "Join WOW" },
    signupTitle: { ar: "أنشئ حسابك المجاني", en: "Create your free account" },
    signupSubtitle: { ar: "خطوة واحدة تفصلك عن مسارك المهني القادم.", en: "One step away from your next career move." },
    loginEyebrow: { ar: "أهلاً بعودتك", en: "Welcome back" },
    loginTitle: { ar: "سجّل الدخول إلى حسابك", en: "Log in to your account" },
    loginSubtitle: { ar: "أكمل من حيث توقفت في مسارك المهني.", en: "Pick up right where you left off." },
    fullName: { ar: "الاسم الكامل", en: "Full name" },
    email: { ar: "البريد الإلكتروني", en: "Email" },
    password: { ar: "كلمة المرور", en: "Password" },
    accountType: { ar: "نوع الحساب", en: "Account type" },
    submitSignup: { ar: "إنشاء الحساب", en: "Create account" },
    submittingSignup: { ar: "جارِ الإنشاء...", en: "Creating..." },
    submitLogin: { ar: "تسجيل الدخول", en: "Log in" },
    submittingLogin: { ar: "جارِ الدخول...", en: "Logging in..." },
    haveAccount: { ar: "لديك حساب؟", en: "Already have an account?" },
    noAccount: { ar: "ليس لديك حساب؟", en: "Don't have an account?" },
    login: { ar: "سجّل الدخول", en: "Log in" },
    signup: { ar: "أنشئ حسابًا", en: "Sign up" },
    note: {
      ar: "⚠️ هذا نموذج تسجيل حقيقي متصل بقاعدة بيانات Supabase — استخدم بيانات صحيحة.",
      en: "⚠️ This is a real sign-up form connected to a Supabase database — use real details.",
    },
    errFields: { ar: "الرجاء تعبئة جميع الحقول.", en: "Please fill in all fields." },
    logout: { ar: "تسجيل الخروج", en: "Log out" },
    continueWithGoogle: { ar: "المتابعة بحساب Google", en: "Continue with Google" },
    orDivider: { ar: "أو", en: "or" },
    errOAuth: { ar: "تعذّر بدء تسجيل الدخول عبر Google، حاول مرة أخرى.", en: "Couldn't start Google sign-in. Please try again." },
  },

  onboarding: {
    step1Title: { ar: "قبل ما نبدأ، هذا نوع حسابك الحالي:", en: "Before we start, here's your current account type:" },
    step1ChooseTitle: { ar: "أهلاً بك! ما نوع حسابك؟", en: "Welcome! What type of account fits you?" },
    step1Hint: { ar: "لا مشكلة لو تغيّر لاحقًا — تقدر تعدّله من الإعدادات.", en: "No worries if this changes later — you can update it in Settings." },
    step2Title: { ar: "شو أهم هدف تبي تحققه أول 3 أشهر؟", en: "What's the main goal you want in the first 3 months?" },
    step3Title: { ar: "مهتم ببرنامج PMP؟", en: "Interested in the PMP program?" },
    step3Sub: { ar: "برنامجنا مقسّم لأربع مستويات تصاعدية — اختر من وين تحب تبدأ.", en: "Our program has four progressive levels — pick where you'd like to start." },
    notInterested: { ar: "مو مهتم حاليًا، خذني للمنصة مباشرة", en: "Not interested right now, take me to the platform" },
    step4Title: { ar: "جاهز! هذا ملخص إعدادك", en: "All set! Here's your setup summary" },
    finish: { ar: "ابدأ رحلتي مع WOW 🚀", en: "Start my journey with WOW 🚀" },
    finishing: { ar: "جارِ التجهيز...", en: "Setting things up..." },
    account: { ar: "نوع الحساب", en: "Account type" },
    goal: { ar: "الهدف", en: "Goal" },
    pmp: { ar: "مستوى PMP", en: "PMP level" },
    none: { ar: "لم يُحدد", en: "Not set" },
  },

  dashboard: {
    title: { ar: "لوحة التحكم", en: "Dashboard" },
    greeting: { ar: "أهلاً،", en: "Welcome," },
    accountTypeLabel: { ar: "نوع حسابك:", en: "Account type:" },
    points: { ar: "نقطة", en: "points" },
    currentLevel: { ar: "المستوى الحالي", en: "Current level" },
    progressToNext: { ar: "التقدّم نحو المستوى التالي", en: "Progress to next level" },
    pointsRemaining: { ar: "نقطة متبقية", en: "points remaining" },
    myBadges: { ar: "🏆 شاراتي", en: "🏆 My Badges" },
    noBadgesYet: { ar: "لسه ما حصّلت شارات — كمّل مسارك عشان تفتح أول شارة!", en: "No badges yet — complete your path to unlock your first one!" },
  },

  landing: {
    tagline: { ar: "| عالم العمل", en: "| World of Work" },
    navJourney: { ar: "المسار", en: "The Path" },
    navAudiences: { ar: "لمن هذه المنصة", en: "Who It's For" },
    navCompanies: { ar: "لأصحاب العمل", en: "For Employers" },
    navCompaniesFooter: { ar: "للشركات", en: "For Companies" },
    navStats: { ar: "الأثر", en: "Impact" },
    navCta: { ar: "ابدأ الآن", en: "Get Started" },
    heroEyebrow: { ar: "منصة WOW التعليمية التوظيفية", en: "The WOW Learning & Career Platform" },
    heroGhost: { ar: "تعرّف على المنصة", en: "Learn More" },
    ringTitle: { ar: "مسارك مع WOW", en: "Your Path with WOW" },
    ringSub: { ar: "ثلاث مراحل، هدف واحد", en: "Three stages, one goal" },
    ringEdu: { ar: "تعليم", en: "Education" },
    ringHire: { ar: "توظيف", en: "Employment" },
    ringPromote: { ar: "ترقية", en: "Promotion" },
    journeyEyebrow: { ar: "رحلتك خطوة بخطوة", en: "Your journey, step by step" },
    journeyTitle: { ar: "تعليم · توظيف · ترقية", en: "Education · Employment · Promotion" },
    journeySub: {
      ar: "ثلاث ركائز مترابطة تبني مسارك المهني بالكامل، من أول مهارة تتعلّمها إلى أعلى منصب تطمح له.",
      en: "Three connected pillars that build your entire career path — from the first skill you learn to the role you're aiming for.",
    },
    eduTitle: { ar: "تعليم", en: "Education" },
    eduDesc: {
      ar: "مسارات تدريبية قصيرة ومركزة، وتقييم مهارات مستمر، مبنية على المتطلبات الفعلية لسوق العمل.",
      en: "Focused, bite-sized training paths and continuous skill assessment, built around what the job market actually needs.",
    },
    eduF1: { ar: "اختبار ميول مهني للطلاب", en: "Career-interest assessment for students" },
    eduF2: { ar: "دورات بشهادات معتمدة", en: "Courses with accredited certificates" },
    eduF3: { ar: "إرشاد مهني ومشاريع تطبيقية", en: "Mentorship and hands-on projects" },
    hireTitle: { ar: "توظيف", en: "Employment" },
    hireDesc: {
      ar: "مطابقة ذكية بين ملفك المهني وفرص العمل، سواء وظيفة دائمة أو مشروع حر، مع تجهيز كامل للمقابلات.",
      en: "Smart matching between your profile and opportunities — full-time roles or freelance projects — with complete interview prep.",
    },
    hireF1: { ar: "مطابقة وظائف بالذكاء الاصطناعي", en: "AI-powered job matching" },
    hireF2: { ar: "مشاريع حرة للمستقلين", en: "Freelance projects for independent talent" },
    hireF3: { ar: "محاكاة مقابلات شخصية", en: "Mock interview simulations" },
    promoteTitle: { ar: "ترقية", en: "Promotion" },
    promoteDesc: {
      ar: "خطة تطوّر وظيفي واضحة تساعدك تتقدّم في مسارك، توسّع نطاق أعمالك الحرة، أو تصل لمناصب أعلى.",
      en: "A clear growth plan that helps you advance in your role, scale your freelance business, or reach senior positions.",
    },
    promoteF1: { ar: "خطة تطوّر وظيفي سنوية", en: "Annual career growth plan" },
    promoteF2: { ar: "شهادات قيادية متقدمة", en: "Advanced leadership certifications" },
    promoteF3: { ar: "تتبّع الأداء والإنجازات", en: "Performance & achievement tracking" },
    audEyebrow: { ar: "منصة واحدة لكل مراحل الحياة المهنية", en: "One platform for every career stage" },
    audTitle: { ar: "مصمّمة لكل من يبني مسارًا مهنيًا", en: "Built for everyone building a career" },
    audSub: {
      ar: "من أول اكتشاف للاهتمامات إلى قيادة فريق أو إدارة عمل حر — WOW يرافقك بالمرحلة المناسبة.",
      en: "From first discovering your interests to leading a team or running a freelance business — WOW meets you at the right stage.",
    },
    audStudentTag: { ar: "🧑‍🎓 الطلاب", en: "🧑‍🎓 Students" },
    audStudentDesc: {
      ar: "اكتشاف مبكر لسوق العمل، اختبارات ميول، ومهارات تُبنى من أول سنة دراسة.",
      en: "Early exposure to the job market, interest assessments, and skills built from year one.",
    },
    audSeekerTag: { ar: "🔍 الباحثون عن عمل", en: "🔍 Job Seekers" },
    audSeekerDesc: {
      ar: "تدريب مكثف، تجهيز للمقابلات، ووصول مباشر لفرص توظيف حقيقية.",
      en: "Intensive training, interview prep, and direct access to real job openings.",
    },
    audFreelancerTag: { ar: "💻 المستقلون", en: "💻 Freelancers" },
    audFreelancerDesc: {
      ar: "مشاريع حرة تناسب مهاراتك، وبناء سمعة مهنية موثّقة تجذب عملاء جدد.",
      en: "Freelance projects matched to your skills, and a verified reputation that attracts new clients.",
    },
    audEmployeeTag: { ar: "👔 الموظفون", en: "👔 Employees" },
    audEmployeeDesc: {
      ar: "خطط تطوّر مهني، شهادات متقدمة، ومسار واضح نحو الترقية.",
      en: "Career development plans, advanced certifications, and a clear path to promotion.",
    },
    audCompanyTag: { ar: "🏢 الشركات", en: "🏢 Companies" },
    audCompanyDesc: {
      ar: "وصول لكفاءات مؤهلة فعليًا، وأدوات لإدارة التوظيف والتطوير الداخلي.",
      en: "Access to genuinely qualified talent, plus tools to manage hiring and internal development.",
    },
    stat1: { ar: "متدرّب ومتدرّبة", en: "Learners trained" },
    stat2: { ar: "شركة شريكة", en: "Partner companies" },
    stat3: { ar: "فرصة توظيف ناجحة", en: "Successful placements" },
    stat4: { ar: "ترقية مهنية مدعومة", en: "Promotions supported" },
    compEyebrow: { ar: "لأصحاب العمل", en: "For Employers" },
    compTitle: {
      ar: "وصول مباشر لكفاءات جاهزة فعليًا للعمل",
      en: "Direct access to genuinely work-ready talent",
    },
    compSub: {
      ar: "بدل ما تبحث عن مرشحين، اعرض احتياجك وخلي المنصة تطابقك مع مرشحين مؤهلين — موظفين أو مستقلين.",
      en: "Instead of searching for candidates, post what you need and let the platform match you with qualified talent — full-time or freelance.",
    },
    comp1T: { ar: "نشر الوظيفة أو المشروع", en: "Post the role or project" },
    comp1D: {
      ar: "حدد المهارات المطلوبة والمنصة تتكفل بالباقي.",
      en: "Define the required skills and the platform handles the rest.",
    },
    comp2T: { ar: "مطابقة ذكية", en: "Smart matching" },
    comp2D: {
      ar: "ترتيب المرشحين حسب نسبة التوافق مع متطلبات الوظيفة.",
      en: "Candidates ranked by how closely they match the role's requirements.",
    },
    comp3T: { ar: "تطوير داخلي", en: "Internal development" },
    comp3D: {
      ar: "تتبّع تطوّر موظفيك الحاليين واقترح ترقيات مبنية على بيانات فعلية.",
      en: "Track your current employees' growth and suggest promotions based on real data.",
    },
    compCta: { ar: "انشر وظيفة الآن", en: "Post a Role" },
    panelTitle: {
      ar: 'أفضل المرشحين لوظيفة "مصمم تجربة مستخدم"',
      en: 'Top candidates for "UX Designer"',
    },
    cand1Name: { ar: "سارة العامري", en: "Sara Alameri" },
    cand1: { ar: "3 سنوات خبرة · شهادة UX معتمدة", en: "3 yrs experience · Certified UX credential" },
    cand2Name: { ar: "خالد الظاهري", en: "Khaled Aldhaheri" },
    cand2: { ar: "مستقل · محفظة أعمال موثّقة", en: "Freelancer · Verified portfolio" },
    cand3Name: { ar: "مريم الكعبي", en: "Mariam Alkaabi" },
    cand3: { ar: "خبرة سنة · جاهزة لأول وظيفة", en: "1 yr experience · Ready for first role" },
    match1: { ar: "%94 توافق", en: "94% match" },
    match2: { ar: "%89 توافق", en: "89% match" },
    match3: { ar: "%81 توافق", en: "81% match" },
    ctaEyebrow: { ar: "ابدأ رحلتك اليوم", en: "Start your journey today" },
    ctaTitle: { ar: "مسارك المهني يبدأ بخطوة وحدة", en: "Your career path starts with one step" },
    ctaSub: {
      ar: "طالب، باحث عن عمل، مستقل، موظف، أو شركة — WOW يجمعكم في مكان واحد.",
      en: "Student, job seeker, freelancer, employee, or company — WOW brings you all together in one place.",
    },
    ctaBtn: { ar: "أنشئ حسابك المجاني", en: "Create Your Free Account" },
    footContact: { ar: "تواصل معنا", en: "Contact Us" },
    copyright: {
      ar: "© 2026 WOW — عالم العمل",
      en: "© 2026 WOW — World of Work",
    },
    personaStudentTitle: { ar: "اكتشف سوق العمل… قبل ما توصله", en: "Discover the job market — before you get there" },
    personaStudentSub: {
      ar: "اختبارات ميول مهنية، مسارات تعلّم مبسّطة، وخريطة واضحة للمهارات المطلوبة – حتى تدخل سوق العمل وأنت جاهز فعلاً.",
      en: "Career-interest tests, simplified learning paths, and a clear map of required skills — so you enter the job market truly ready.",
    },
    personaStudentCta: { ar: "استكشف مسارك المهني", en: "Explore Your Path" },
    personaSeekerTitle: { ar: "من التدريب… إلى أول وظيفة", en: "From training — to your first job" },
    personaSeekerSub: {
      ar: "مطابقة ذكية بينك وبين الوظائف المتاحة، وتجهيز حقيقي لمقابلات التوظيف، حتى تختصر وقت البحث وتصل لفرصتك بسرعة أكبر.",
      en: "Smart matching with open roles and real interview prep, so you cut down search time and land your opportunity faster.",
    },
    personaSeekerCta: { ar: "تصفح الفرص المتاحة", en: "Browse Open Roles" },
    personaFreelancerTitle: { ar: "حوّل مهاراتك إلى مشاريع حرة", en: "Turn your skills into freelance work" },
    personaFreelancerSub: {
      ar: "اعثر على مشاريع تناسب خبرتك، وابنِ سمعة مهنية موثّقة تجذب عملاء جدد وتزيد من فرصك المستقبلية.",
      en: "Find projects that match your expertise and build a verified reputation that attracts new clients and future opportunities.",
    },
    personaFreelancerCta: { ar: "استعرض المشاريع المتاحة", en: "Browse Freelance Projects" },
    personaEmployeeTitle: {
      ar: "طوّر مسارك… واحصل على ترقيتك القادمة",
      en: "Grow your career — and earn your next promotion",
    },
    personaEmployeeSub: {
      ar: "خطة تطوّر وظيفي مبنية على أدائك الفعلي، مع شهادات متقدمة تؤهلك للمناصب الأعلى في مجالك.",
      en: "A development plan built around your real performance, with advanced certifications that qualify you for senior roles.",
    },
    personaEmployeeCta: { ar: "ابدأ خطة تطوّرك", en: "Start Your Growth Plan" },
    personaCompanyTitle: {
      ar: "وصول مباشر لأفضل الكفاءات المؤهلة",
      en: "Direct access to top qualified talent",
    },
    personaCompanySub: {
      ar: "انشر احتياجك الوظيفي ودع المنصة تطابقك مع مرشحين مؤهلين فعليًا، موظفين أو مستقلين.",
      en: "Post your hiring need and let the platform match you with genuinely qualified candidates — full-time or freelance.",
    },
    personaCompanyCta: { ar: "انشر وظيفة الآن", en: "Post a Role Now" },
  },

  nova: {
    title: { ar: "Nova — مدربك الشخصي", en: "Nova — your personal coach" },
    placeholder: { ar: "اسأل Nova عن مسارك المهني...", en: "Ask Nova about your career path..." },
    send: { ar: "إرسال", en: "Send" },
    thinking: { ar: "Nova تكتب...", en: "Nova is typing..." },
    intro: {
      ar: "أهلاً! أنا Nova 👋 اسألني عن أي شي يخص مسارك المهني أو مستوى PMP اللي وصلتله.",
      en: "Hey! I'm Nova 👋 Ask me anything about your career path or your current PMP level.",
    },
    unavailable: { ar: "Nova غير متاحة حاليًا، حاول بعد قليل.", en: "Nova is unavailable right now, try again shortly." },
  },
} as const;

export type Dictionary = typeof dictionary;
