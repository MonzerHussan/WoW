/**
 * Single source of truth for all bilingual UI strings.
 * Organized by feature so each feature only imports what it needs.
 * Adding a new string: add it once here, in both languages — never inline
 * a new hardcoded AR/EN pair inside a component again.
 */
export const dictionary = {
  nav: {
    dashboard: { ar: "الرئيسية", en: "Dashboard" },
    profile: { ar: "الملف الشخصي", en: "Profile" },
    community: { ar: "المجتمع", en: "Community" },
    course: { ar: "الدورة", en: "Course" },
    projects: { ar: "المشاريع", en: "Projects" },
    games: { ar: "الألعاب", en: "Games" },
    assessments: { ar: "التقييمات", en: "Assessments" },
    instructors: { ar: "الأساتذة", en: "Instructors" },
    // AI Assist's own displayed label is the user's chosen agent name,
    // not this literal string — this is only the fallback shown before
    // a name has been chosen (same "no naming forced" rule as the agent
    // feature itself).
    aiAssistFallback: { ar: "مساعدك الذكي", en: "AI Assist" },
    walletLabel: { ar: "كوينز", en: "coins" },
    backToDashboard: { ar: "← الرئيسية", en: "← Dashboard" },
  },

  // Phase-1 visual mockup ONLY (owner instruction, navigation-restructuring
  // batch item 7): a static Facebook/LinkedIn-style page with zero real
  // functionality — no posts, connections, or groups are ever written to
  // Supabase from here. See CommunityContent.tsx's own header comment.
  community: {
    title: { ar: "مجتمع WOW", en: "WOW Community" },
    subtitle: {
      ar: "تواصل مع زملائك في المسار المهني، شارك إنجازاتك، واكتشف مجموعات تهمك.",
      en: "Connect with peers on the same career journey, share your wins, and discover groups you care about.",
    },
    composerPlaceholder: { ar: "شارك تحديثًا مع مجتمعك...", en: "Share an update with your community..." },
    composerPostBtn: { ar: "نشر", en: "Post" },

    shortcutsTitle: { ar: "اختصارات", en: "Shortcuts" },
    shortcutNetwork: { ar: "شبكتي", en: "My Network" },
    shortcutGroups: { ar: "مجموعاتي", en: "My Groups" },
    shortcutSaved: { ar: "المحفوظات", en: "Saved" },
    shortcutEvents: { ar: "الفعاليات", en: "Events" },

    connectionsTitle: { ar: "أشخاص قد تعرفهم", en: "People you may know" },
    connectCta: { ar: "تواصل", en: "Connect" },
    connectedCta: { ar: "تم التواصل", en: "Connected" },

    trendingTitle: { ar: "الأكثر تداولًا في WOW", en: "Trending in WOW" },
    trend1: { ar: "كيف تبني Career DNA قويًا في 90 يومًا", en: "How to build a strong Career DNA in 90 days" },
    trend2: { ar: "أسئلة مقابلات الشركات الناشئة", en: "Startup interview questions" },
    trend3: { ar: "نصائح لاجتياز اختبار PMP من أول محاولة", en: "Tips to pass the PMP exam on your first try" },
    trend4: { ar: "قصص نجاح من مجتمع WOW", en: "Success stories from the WOW community" },

    groupsTitle: { ar: "مجموعات قد تعجبك", en: "Groups you might like" },
    groupsJoinCta: { ar: "انضمام", en: "Join" },
    groupsJoinedCta: { ar: "عضو", en: "Joined" },
    groupsMembersLabel: { ar: "عضو", en: "members" },
    group1Name: { ar: "دائرة PMP المصريين", en: "Egyptian PMP Circle" },
    group2Name: { ar: "الانتقال إلى العمل الحر", en: "Transitioning to Freelance" },
    group3Name: { ar: "خريجو مسار البرمجة", en: "Coding Track Graduates" },

    conn1Name: { ar: "يوسف نجيب", en: "Youssef Naguib" },
    conn1Field: { ar: "مسار تحليل البيانات", en: "Data Analysis Track" },
    conn2Name: { ar: "منى كمال", en: "Mona Kamal" },
    conn2Field: { ar: "مسار تصميم UX", en: "UX Design Track" },
    conn3Name: { ar: "خالد إبراهيم", en: "Khaled Ibrahim" },
    conn3Field: { ar: "إدارة المشاريع", en: "Project Management" },
    conn4Name: { ar: "نور حسن", en: "Nour Hassan" },
    conn4Field: { ar: "الإنجليزية لسوق العمل", en: "English for Careers" },

    post1Author: { ar: "أحمد صلاح", en: "Ahmed Salah" },
    post1Role: { ar: "متدرب PMP", en: "PMP Candidate" },
    post1Time: { ar: "قبل ساعتين", en: "2h ago" },
    post1Tag: { ar: "إنجاز", en: "Milestone" },
    post1Body: {
      ar: "أنهيت أول اختبار في مسار PMP بنجاح! 🎉 خطوة كمان جوه الطريق للشهادة.",
      en: "Just passed my first PMP-track quiz on WOW! 🎉 One more step toward the certification.",
    },
    post2Author: { ar: "لينا يوسف", en: "Lina Youssef" },
    post2Role: { ar: "متدربة برمجة", en: "Software Trainee" },
    post2Time: { ar: "قبل 5 ساعات", en: "5h ago" },
    post2Tag: { ar: "نقاش", en: "Discussion" },
    post2Body: {
      ar: "أي نصائح لأول مقابلة عمل بعد التخرج من مسار البرمجة؟ محتاجة أفكار عملية 🙏",
      en: "Any tips for a first job interview right after finishing the coding track? Looking for practical advice 🙏",
    },
    post3Author: { ar: "عمر فتحي", en: "Omar Fathy" },
    post3Role: { ar: "مستقل (Freelancer)", en: "Freelancer" },
    post3Time: { ar: "قبل يوم", en: "1d ago" },
    post3Tag: { ar: "مشروع", en: "Project" },
    post3Body: {
      ar: "سلّمت أول مشروع لي كمستقل من خلال منصة WOW النهاردة. رحلة Career DNA بجد بتفرق.",
      en: "Delivered my first freelance project sourced through WOW today. The Career DNA journey really makes a difference.",
    },
    post4Author: { ar: "سارة عادل", en: "Sara Adel" },
    post4Role: { ar: "مدرّبة", en: "Instructor" },
    post4Time: { ar: "قبل يومين", en: "2d ago" },
    post4Tag: { ar: "نصيحة", en: "Advice" },
    post4Body: {
      ar: "أهم حاجة في مقابلات العمل: اربط كل إجابة بدليل فعلي من شغلك، مش وصف عام.",
      en: "The single biggest interview tip: back every answer with real evidence from your work, not a generic description.",
    },
  },

  assessments: {
    title: { ar: "التقييمات", en: "Assessments" },
    placementTitle: { ar: "نتيجة تحديد المستوى", en: "Placement result" },
    placementLevel: { ar: "المستوى", en: "Level" },
    placementNotDone: { ar: "لم تُجرِ محادثة تحديد المستوى بعد.", en: "You haven't done the placement conversation yet." },
    quizHistoryTitle: { ar: "سجل الاختبارات", en: "Quiz history" },
    quizHistoryEmpty: { ar: "لا اختبارات مسجَّلة بعد.", en: "No quizzes taken yet." },
    quizPendingReview: { ar: "بانتظار اعتماد المقيّم", en: "Pending assessor review" },
    quizPassedLabel: { ar: "ناجح", en: "Passed" },
    quizFailedLabel: { ar: "غير ناجح", en: "Not passed" },
  },

  instructors: {
    title: { ar: "الأساتذة", en: "Instructors" },
    intro: { ar: "الأساتذة المرتبطون بك — اطلب مساعدة أو شرحًا إضافيًا.", en: "Instructors linked to you — request extra help or explanation." },
    empty: { ar: "لا أساتذة مرتبطين بك بعد.", en: "No instructors linked to you yet." },
    available: { ar: "متاح", en: "Available" },
    unavailable: { ar: "غير متاح", en: "Unavailable" },
    priceLabel: { ar: "السعر", en: "Price" },
    comingSoon: { ar: "طلب المساعدة قريبًا.", en: "Requesting help is coming soon." },

    // --- Instructor side: incoming requests (batch 1 of the delivery UI) ---
    incomingTitle: { ar: "طلبات واردة", en: "Incoming requests" },
    incomingIntro: {
      ar: "طلبات دارسين يطلبون شرحًا منك. القبول يبدأ التسليم ويخصم الرسوم من رصيد الدارس فورًا.",
      en: "Learners asking you for an explanation. Accepting starts the delivery and charges the learner's balance immediately.",
    },
    incomingEmpty: { ar: "لا طلبات واردة حاليًا.", en: "No incoming requests right now." },
    requestContext: { ar: "طلب الدارس", en: "The learner's request" },
    /** Shown when 077 returns no name — an account that never filled in
     *  a full name, or an instructor with no display name. Never an
     *  empty string in the UI. */
    unnamedLearner: { ar: "دارس", en: "A learner" },

    // --- Becoming an instructor (078) ---
    applyTitle: { ar: "كن أستاذًا", en: "Become an instructor" },
    applyIntro: {
      ar: "قدّم ملفك، ويراجعه فريق WOW. لن يظهر للدارسين قبل الاعتماد.",
      en: "Submit your profile for the WOW team to review. It stays hidden from learners until approved.",
    },
    displayName: { ar: "اسم العرض", en: "Display name" },
    displayNameHint: {
      ar: "الاسم الذي يراه الدارسون — يمكن أن يختلف عن اسمك في ملفك الشخصي.",
      en: "The name learners see — it can differ from the one on your personal profile.",
    },
    bio: { ar: "نبذة", en: "Bio" },
    expertiseTags: { ar: "مجالات الخبرة", en: "Areas of expertise" },
    expertiseHint: { ar: "افصل بينها بفاصلة", en: "Separate with commas" },
    yearsExperience: { ar: "سنوات الخبرة", en: "Years of experience" },
    priceLabelOwn: { ar: "سعرك لكل طلب (كوينز)", en: "Your price per request (coins)" },
    priceHintOwn: {
      ar: "يمكنك تغييره متى شئت — الطلبات القائمة تحتفظ بسعرها وقت إنشائها.",
      en: "Change it whenever you like — existing requests keep the price they were created at.",
    },
    applySubmit: { ar: "إرسال الطلب", en: "Submit application" },
    applyResubmit: { ar: "إعادة الإرسال", en: "Resubmit" },
    saveProfile: { ar: "حفظ التعديلات", en: "Save changes" },
    applySaving: { ar: "جارِ الإرسال...", en: "Submitting..." },
    applyFailed: { ar: "تعذّر إرسال الطلب.", en: "Couldn't submit the application." },

    statusPending: { ar: "قيد المراجعة", en: "Under review" },
    statusPendingHint: {
      ar: "طلبك وصل. لن تظهر للدارسين حتى يعتمده فريق WOW.",
      en: "We have your application. You stay hidden from learners until the WOW team approves it.",
    },
    statusApproved: { ar: "معتمَد", en: "Approved" },
    statusRejected: { ar: "غير معتمَد", en: "Not approved" },
    statusRejectedHint: {
      ar: "يمكنك تعديل ملفك وإعادة إرساله.",
      en: "You can edit your profile and submit it again.",
    },
    reviewNoteLabel: { ar: "ملاحظة المراجعة", en: "Reviewer's note" },
    needsReviewBadge: { ar: "عُدِّل بعد الاعتماد", en: "Edited after approval" },
    needsReviewHint: {
      ar: "تعديلاتك ظاهرة للدارسين، وفريق WOW سيراجعها.",
      en: "Your edits are live for learners, and the WOW team will review them.",
    },
    // Availability is the instructor's own switch — approval is not.
    availabilityTitle: { ar: "استقبال الطلبات", en: "Accepting requests" },
    availabilityOn: { ar: "أستقبل طلبات جديدة", en: "I'm accepting new requests" },
    availabilityOff: { ar: "متوقف مؤقتًا", en: "Paused" },
    availabilityHint: {
      ar: "أوقفه مؤقتًا حين لا تستطيع الاستجابة — لا يؤثر على اعتمادك.",
      en: "Pause it when you can't respond — it doesn't affect your approval.",
    },
    availabilityBlocked: {
      ar: "لا يمكن الظهور قبل الاعتماد.",
      en: "You can't appear to learners before approval.",
    },

    // --- Owner's review queue ---
    reviewQueueTitle: { ar: "طلبات الأساتذة", en: "Instructor applications" },
    reviewQueueIntro: {
      ar: "طلبات جديدة، وملفات معتمَدة عُدِّلت بعد الاعتماد.",
      en: "New applications, and approved profiles edited since.",
    },
    reviewQueueEmpty: { ar: "لا طلبات بانتظار المراجعة.", en: "Nothing waiting for review." },
    newApplication: { ar: "طلب جديد", en: "New application" },
    reviewApprove: { ar: "اعتماد", en: "Approve" },
    reviewReject: { ar: "رفض", en: "Reject" },
    reviewWorking: { ar: "جارِ التنفيذ...", en: "Working..." },
    reviewNotePlaceholder: { ar: "ملاحظة للأستاذ (اختياري)", en: "Note for the instructor (optional)" },
    reviewApproved: { ar: "تم الاعتماد.", en: "Approved." },
    reviewRejected: { ar: "تم الرفض.", en: "Rejected." },
    reviewFailed: { ar: "تعذّر إتمام المراجعة.", en: "Couldn't complete the review." },
    reviewNotAuthorized: { ar: "لا تملك صلاحية مراجعة طلبات الأساتذة.", en: "You're not allowed to review instructor applications." },
    noContext: { ar: "لم يكتب الدارس تفاصيل.", en: "The learner didn't add details." },
    // Stated before the button is pressed, not after — the instructor is
    // authorising a charge against someone else's wallet.
    chargeWarning: {
      ar: "بقبولك يُخصم {price} كوينز من رصيد الدارس فورًا.",
      en: "Accepting deducts {price} coins from the learner's balance immediately.",
    },
    accept: { ar: "قبول", en: "Accept" },
    accepting: { ar: "جارِ القبول...", en: "Accepting..." },
    decline: { ar: "رفض", en: "Decline" },
    declining: { ar: "جارِ الرفض...", en: "Declining..." },
    accepted: { ar: "مقبول", en: "Accepted" },
    declined: { ar: "مرفوض", en: "Declined" },
    pending: { ar: "بانتظار ردّك", en: "Awaiting your response" },
    acceptedToast: { ar: "تم القبول وخُصم {price} كوينز من رصيد الدارس.", en: "Accepted — {price} coins were deducted from the learner's balance." },
    declinedToast: { ar: "تم رفض الطلب.", en: "Request declined." },

    // Every failure 074's function can produce, each with its own message.
    // A single generic error would leave the instructor unable to tell
    // "they can't afford it" from "someone already answered this".
    errInsufficientBalance: {
      ar: "رصيد الدارس غير كافٍ — لم يُخصم شيء ولم تتغيّر حالة الطلب. المطلوب {required} كوينز والمتاح لديه {balance}.",
      en: "The learner's balance is too low — nothing was charged and the request is unchanged. {required} coins needed, {balance} available.",
    },
    errNotPending: {
      ar: "هذا الطلب لم يعد بانتظار الرد — رُدَّ عليه بالفعل. حدّث الصفحة لرؤية حالته.",
      en: "This request is no longer awaiting a response — it has already been answered. Refresh to see its current state.",
    },
    errNotAuthorized: {
      ar: "لا تملك صلاحية الرد على هذا الطلب.",
      en: "You're not allowed to respond to this request.",
    },
    errNotFound: {
      ar: "لم يعد هذا الطلب موجودًا.",
      en: "This request no longer exists.",
    },
    errUnknown: {
      ar: "تعذّر إتمام العملية — لم يُخصم شيء. حاول مجددًا.",
      en: "Couldn't complete that — nothing was charged. Please try again.",
    },

    // --- Conversations (batch 3). The conversation is symmetric: the
    // same list, the same controls, for the learner and the instructor.
    conversationsTitle: { ar: "المحادثات", en: "Conversations" },
    conversationsIntro: {
      ar: "المحادثة تبدأ بعد قبول الطلب — الطرفان يكتبان ويقرآن بالتساوي.",
      en: "A conversation opens once the request is accepted — both sides read and write equally.",
    },
    chatOpen: { ar: "فتح", en: "Open" },
    chatClose: { ar: "إغلاق", en: "Close" },
    chatSend: { ar: "إرسال", en: "Send" },
    chatSending: { ar: "جارِ الإرسال...", en: "Sending..." },
    chatPlaceholder: { ar: "اكتب رسالتك...", en: "Write your message..." },
    chatEmpty: {
      ar: "لا رسائل بعد — ابدأ المحادثة.",
      en: "No messages yet — start the conversation.",
    },
    chatOriginalRequest: { ar: "الطلب الأصلي", en: "Original request" },
    // The counterpart's name comes from 077. When it is missing we show a
    // role word, never the raw id — an identifier tells the reader
    // nothing and exposes something.
    chatUnnamedParty: { ar: "الطرف الآخر", en: "The other party" },
    chatRoleLearner: { ar: "دارس", en: "Learner" },
    chatRoleInstructor: { ar: "أستاذ", en: "Instructor" },

    chatErrNotAccepted: {
      ar: "لا يمكن الكتابة قبل قبول الطلب. حدّث الصفحة لرؤية حالته الحالية.",
      en: "You can't write here until the request is accepted. Refresh to see its current state.",
    },
    chatErrNotAuthorized: {
      ar: "لست طرفًا في هذه المحادثة.",
      en: "You're not a participant in this conversation.",
    },
    chatErrEmpty: {
      ar: "الرسالة فارغة.",
      en: "The message is empty.",
    },
    chatErrUnknown: {
      ar: "تعذّر إرسال الرسالة — نصّك ما زال في الحقل. حاول مجددًا.",
      en: "Couldn't send that — your text is still in the box. Please try again.",
    },
  },

  aiAssist: {
    settingsTitle: { ar: "الإعدادات", en: "Settings" },
    settingsComingSoon: { ar: "الإعدادات التفصيلية قريبًا.", en: "Detailed settings coming soon." },
    recommendationsTitle: { ar: "آخر التوصيات", en: "Recent recommendations" },
  },

  common: {
    langAr: { ar: "AR", en: "AR" },
    langEn: { ar: "EN", en: "EN" },
    back: { ar: "رجوع", en: "Back" },
    next: { ar: "التالي", en: "Next" },
    loading: { ar: "جارِ التحميل...", en: "Loading..." },
    somethingWentWrong: { ar: "حدث خطأ، حاول مرة أخرى.", en: "Something went wrong. Please try again." },
    retry: { ar: "إعادة المحاولة", en: "Retry" },
    cancel: { ar: "إلغاء", en: "Cancel" },
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
    confirmEmailSent: {
      ar: "أنشأنا حسابك! افتح بريدك الإلكتروني واضغط على رابط التأكيد لتفعيل حسابك، ثم سجّل الدخول.",
      en: "Your account is created! Check your email and click the confirmation link to activate it, then log in.",
    },
    rateLimit: {
      ar: "محاولات كثيرة خلال وقت قصير — انتظر قليلًا ثم حاول مجددًا.",
      en: "Too many attempts — please wait a moment and try again.",
    },
    // Matches the policy actually enforced since 2026-08-15 (10 chars +
    // one of each character class). The previous text promised "8
    // characters", which the server had already stopped accepting — a
    // user following it exactly would be refused again.
    weakPassword: {
      ar: "كلمة المرور ضعيفة — استخدم 10 أحرف على الأقل مع حرف كبير وحرف صغير ورقم ورمز.",
      en: "Password is too weak — use at least 10 characters with an uppercase letter, a lowercase letter, a number and a symbol.",
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

    forgotLink: { ar: "نسيت كلمة المرور؟", en: "Forgot your password?" },
    forgotEyebrow: { ar: "استعادة الحساب", en: "Account recovery" },
    forgotTitle: { ar: "نسيت كلمة المرور؟", en: "Forgot your password?" },
    forgotSubtitle: {
      ar: "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.",
      en: "Enter your email and we'll send you a link to set a new password.",
    },
    forgotSubmit: { ar: "أرسل رابط الاستعادة", en: "Send recovery link" },
    forgotSubmitting: { ar: "جارِ الإرسال...", en: "Sending..." },
    // Deliberately identical whether or not the address has an account —
    // a screen that distinguishes them is an account-enumeration tool.
    forgotSent: {
      ar: "إن كان لديك حساب بهذا البريد فستصلك رسالة تحتوي رابط تعيين كلمة مرور جديدة خلال دقائق. تحقّق من مجلد الرسائل غير المرغوب فيها أيضًا.",
      en: "If an account exists for that email, a message with a password-reset link is on its way. Check your spam folder too.",
    },
    backToLogin: { ar: "← العودة لتسجيل الدخول", en: "← Back to log in" },

    updatePwEyebrow: { ar: "كلمة مرور جديدة", en: "New password" },
    updatePwTitle: { ar: "عيّن كلمة مرور جديدة", en: "Set a new password" },
    updatePwSubtitle: {
      ar: "اختر كلمة مرور قوية لن تستخدمها في مواقع أخرى.",
      en: "Choose a strong password you don't use anywhere else.",
    },
    newPassword: { ar: "كلمة المرور الجديدة", en: "New password" },
    confirmPassword: { ar: "تأكيد كلمة المرور", en: "Confirm password" },
    updatePwSubmit: { ar: "حفظ كلمة المرور", en: "Save password" },
    updatePwSubmitting: { ar: "جارِ الحفظ...", en: "Saving..." },
    updatePwDone: {
      ar: "تم تحديث كلمة المرور. جارِ تحويلك...",
      en: "Password updated. Redirecting...",
    },
    updatePwVerifying: { ar: "جارِ التحقق من الرابط...", en: "Verifying your link..." },
    // Shown when the recovery link is consumed, expired, or opened directly.
    updatePwBadLink: {
      ar: "هذا الرابط لم يعد صالحًا — رابط الاستعادة يُستخدم مرة واحدة وينتهي بعد مدة قصيرة. اطلب رابطًا جديدًا.",
      en: "This link is no longer valid — recovery links work once and expire shortly. Request a new one.",
    },
    requestNewLink: { ar: "اطلب رابطًا جديدًا", en: "Request a new link" },

    /** Kept in sync BY HAND with passwordPolicySchema and the Supabase
     *  dashboard setting — there is no API to read the policy. */
    passwordRulesTitle: { ar: "يجب أن تحتوي كلمة المرور على:", en: "Your password must contain:" },
    passwordRuleLength: { ar: "10 أحرف على الأقل", en: "at least 10 characters" },
    passwordRuleLower: { ar: "حرف إنجليزي صغير (a-z)", en: "a lowercase letter (a-z)" },
    passwordRuleUpper: { ar: "حرف إنجليزي كبير (A-Z)", en: "an uppercase letter (A-Z)" },
    passwordRuleDigit: { ar: "رقم (0-9)", en: "a number (0-9)" },
    passwordRuleSymbol: { ar: "رمز مثل !@#$%", en: "a symbol such as !@#$%" },

    /** Non-blocking notice after a SUCCESSFUL login whose password is
     *  below the current policy. GoTrue returns the session AND a
     *  `weak_password` field; supabase-js 2.110.7 does not raise it as an
     *  error (that conversion only runs on non-2xx), so it was being
     *  discarded silently until now. */
    weakPasswordNotice: {
      ar: "كلمة مرورك الحالية دون المعيار الجديد — يُنصح بتحديثها.",
      en: "Your current password is below the new standard — we recommend updating it.",
    },
    weakPasswordNoticeAction: { ar: "حدّثها الآن", en: "Update it now" },
    weakPasswordNoticeDismiss: { ar: "لاحقًا", en: "Later" },

    /** aria-labels for the show/hide toggle. The label states the ACTION
     *  the button performs, not the current state — aria-pressed already
     *  carries the state, and a screen reader announcing both keeps them
     *  from contradicting each other. */
    showPassword: { ar: "إظهار كلمة المرور", en: "Show password" },
    hidePassword: { ar: "إخفاء كلمة المرور", en: "Hide password" },
  },

  onboarding: {
    step1Title: { ar: "قبل ما نبدأ، هذا نوع حسابك الحالي:", en: "Before we start, here's your current account type:" },
    step1ChooseTitle: { ar: "أهلاً بك! ما نوع حسابك؟", en: "Welcome! What type of account fits you?" },
    step1Hint: { ar: "لا مشكلة لو تغيّر لاحقًا — تقدر تعدّله من الإعدادات.", en: "No worries if this changes later — you can update it in Settings." },
    step1bTitle: { ar: "شوية معلومات عنك", en: "A bit about you" },
    step1bHint: { ar: "هذه المعلومات خاصة بك تمامًا ولا تُعرض لأي جهة أو صاحب عمل أبدًا.", en: "This information is entirely private and is never shown to any organization or employer." },
    ageLabel: { ar: "عمرك", en: "Your age" },
    agePlaceholder: { ar: "مثلاً: 24", en: "e.g. 24" },
    errAge: { ar: "الرجاء إدخال عمر صحيح.", en: "Please enter a valid age." },
    genderLabel: { ar: "جنسك", en: "Gender" },
    step2Title: { ar: "شو أهم هدف تبي تحققه أول 3 أشهر؟", en: "What's the main goal you want in the first 3 months?" },
    step3Title: { ar: "مهتم ببرنامج PMP؟", en: "Interested in the PMP program?" },
    step3Sub: { ar: "برنامجنا مقسّم لأربع مستويات تصاعدية — اختر من وين تحب تبدأ.", en: "Our program has four progressive levels — pick where you'd like to start." },
    notInterested: { ar: "مو مهتم حاليًا، خذني للمنصة مباشرة", en: "Not interested right now, take me to the platform" },
    step4Title: { ar: "جاهز! هذا ملخص إعدادك", en: "All set! Here's your setup summary" },
    finish: { ar: "ابدأ رحلتي مع WOW 🚀", en: "Start my journey with WOW 🚀" },
    finishing: { ar: "جارِ التجهيز...", en: "Setting things up..." },
    account: { ar: "نوع الحساب", en: "Account type" },
    age: { ar: "العمر", en: "Age" },
    gender: { ar: "الجنس", en: "Gender" },
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
    outcomeStatEyebrow: { ar: "الأثر الحقيقي", en: "Real impact" },
    outcomeStatPlaceholder: { ar: "قيد القياس", en: "Measuring now" },
    outcomeStatCaption: {
      ar: "من خريجي WOW يدخلون مجالهم المستهدف خلال 6 أشهر — نُحدّث هذا الرقم بمجرد توفر بيانات كافية من Beta، لا قبل ذلك.",
      en: "of WOW graduates land their target field within 6 months — we'll publish a real number once Beta gives us enough data, not before.",
    },
    newsroomBadge: { ar: "غرفة أخبار حيّة", en: "LIVE NEWSROOM" },
    newsroomDesc: {
      ar: "منصة تحريرية لعالم العمل ومجتمع مفتوح — انشر، تعلّم، واحصل على فرصتك.",
      en: "An editorial career platform + open community. Publish, learn, and get hired.",
    },
    trendingEyebrow: { ar: "الأخبار المتداولة", en: "Trending Topics" },
    trend1: { ar: "مستقبل الذكاء الاصطناعي في سوق العمل بالمنطقة", en: "The Future of AI in the Region's Job Market" },
    trend2: { ar: "المنح الدراسية المتاحة لعام 2026", en: "Scholarships Open for 2026" },
    trend3: { ar: "آداب العمل عن بُعد التي يغفل عنها الجميع", en: "Remote Work Etiquette Everyone Forgets" },
    trend4: { ar: "لماذا يفوق ملف الأعمال السيرة الذاتية اليوم", en: "Why a Portfolio Beats a Resume Today" },

    sponsorEyebrow: { ar: "شريك", en: "Partner" },
    sponsorTitle: { ar: "أكمل مسارك المهني خلال 90 يومًا", en: "Complete Your Career Path in 90 Days" },
    sponsorBody: {
      ar: "دورة معتمدة أساسيات حوكمة المشاريع (PMP) — 18 اختبارًا، تصحيح فوري واعتماد بشري، وشهادة حقيقية عند الإتمام.",
      en: "The Certified Project Governance Fundamentals (PMP) course — 18 assessments, instant scoring with human confirmation, and a real certificate on completion.",
    },
    sponsorCta: { ar: "سجّل الآن", en: "Enroll Now" },
    outcomeStatShortCaption: {
      ar: "من الخريجين يدخلون مجالهم المستهدف",
      en: "of graduates land their target field",
    },
    advertiseTitle: { ar: "أعلن على WOW", en: "Advertise on WOW" },
    advertiseSub: {
      ar: "الوصول لأكثر من 50 ألف محترف بالمنطقة (هدف تقديري، وليس رقمًا فعليًا بعد)",
      en: "Reach 50,000+ professionals across the region (an estimated target, not a real figure yet)",
    },
    advertiseCta: { ar: "احجز مساحتك", en: "Book Your Slot" },
    closingTitle: { ar: "رحلتك المهنية قصة تُروى", en: "Your career is a story worth telling" },
    closingSub: {
      ar: "انضم لآلاف الطلاب والمستقلين الذين يبنون مسارهم علانية على WOW.",
      en: "Join thousands of students and freelancers building their path in the open on WOW.",
    },
    closingCta: { ar: "ابدأ قصتك", en: "Start Your Story" },

    feedEyebrow: { ar: "خلاصة", en: "The Feed" },
    feedTitle: { ar: "ما يتحدث عنه مجتمع WOW", en: "What the WOW Community Is Talking About" },
    feedPost1Author: { ar: "سارة الفارسي", en: "Sarah Al-Farsi" },
    feedPost1Role: { ar: "مستشارة تعليمية", en: "Education Consultant" },
    feedPost1Time: { ar: "قبل ساعتين", en: "2h ago" },
    feedPost1Tag: { ar: "رؤية", en: "Insight" },
    feedPost1Title: {
      ar: "لماذا أصبحت المهارات الشخصية العملة الصعبة الجديدة؟",
      en: "Why soft skills are the new hard currency",
    },
    feedPost1Body: {
      ar: "التعليم العالي يتحوّل بسرعة نحو الذكاء العاطفي والقيادة المرنة أكثر من التمكّن التقني وحده — وهذا يعيد كتابة معايير الشركات في اختيار الخريجين.",
      en: "Higher education is pivoting fast toward emotional intelligence and adaptable leadership over technical mastery alone — and it's rewriting how companies screen graduates.",
    },
    feedPost2Author: { ar: "عمر حداد", en: "Omar Haddad" },
    feedPost2Role: { ar: "مصمم منتجات مستقل", en: "Freelance Product Designer" },
    feedPost2Time: { ar: "قبل 5 ساعات", en: "5h ago" },
    feedPost2Tag: { ar: "نجاح", en: "Wins" },
    feedPost2Title: {
      ar: "أغلقت أول عقد بقيمة 40 ألف درهم — هذه الخطوة التي غيّرت المعادلة",
      en: "I closed my first 40K AED client — here's what changed",
    },
    feedPost2Body: {
      ar: "قبل ستة أشهر كنت أرسل عروضًا باردة مع رابط بورتفوليو بسيط. اليوم أوقّع عقد تعاون لثلاثة أشهر. التحوّل الحقيقي كان في طريقة تسعير وقتي، لا في المهارة نفسها.",
      en: "Six months ago I was cold-pitching with a plain portfolio link. Today I signed a three-month retainer. The real shift was in how I priced my time, not the skill itself.",
    },
    feedPost3Author: { ar: "ليلى منصور", en: "Layla Mansour" },
    feedPost3Role: { ar: "باحثة دكتوراه", en: "PhD Candidate" },
    feedPost3Time: { ar: "قبل يوم", en: "1d ago" },
    feedPost3Tag: { ar: "سؤال", en: "Ask" },
    feedPost3Title: {
      ar: "كيف أشرح فجوة في مسيرتي لمسؤول توظيف؟",
      en: "How do I explain a career gap to a recruiter?",
    },
    feedPost3Body: {
      ar: "توقفت سنتين في منتصف الدكتوراه لرعاية أسرتي، ومسؤولو التوظيف يلاحظون الفجوة دائمًا. أبحث عن صياغات صادقة ممن مرّوا بتجربة مشابهة ودخلوا القطاع الخاص بنجاح.",
      en: "I paused two years mid-PhD to care for family, and recruiters always flag the gap. Looking for honest scripts from anyone who's navigated this into a private-sector role.",
    },

    mentorsEyebrow: { ar: "مجتمع WOW", en: "WOW Community" },
    mentorsTitle: { ar: "موجّهون مقترحون", en: "Suggested Mentors" },
    mentor1Name: { ar: "د. زيد كمال", en: "Dr. Zaid Kamal" },
    mentor1Field: { ar: "أبحاث الذكاء الاصطناعي", en: "AI Research" },
    mentor2Name: { ar: "ريم الشامي", en: "Reem Al-Shami" },
    mentor2Field: { ar: "تصميم المنتجات", en: "Product Design" },
    mentor3Name: { ar: "حسن رضا", en: "Hassan Reda" },
    mentor3Field: { ar: "عمليات الشركات الناشئة", en: "Startup Operations" },
    followCta: { ar: "متابعة", en: "Follow" },
    followingCta: { ar: "متابَع ✓", en: "Following ✓" },

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
    personaStudentTitle: { ar: "اكتشف سوق العمل، قبل أن تصل إليه", en: "Discover the job market — before you reach it" },
    personaStudentSub: {
      ar: "اختبارات ميول مهنية، مسارات تعلّم مركّزة، وخريطة واضحة لما يحتاجه سوق العمل فعلاً — لتدخله وأنت جاهز، لا مجرد متفائل.",
      en: "Career-interest tests, focused learning paths, and a clear map of what the market actually needs — so you walk in ready, not just hopeful.",
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
    personaInstructorTitle: {
      ar: "شارك خبرتك… وابنِ أثرك التعليمي",
      en: "Share your expertise — build your teaching impact",
    },
    personaInstructorSub: {
      ar: "صمّم دورات، درّب متعلمين حقيقيين، واكسب مقابل خبرتك — مع تتبّع أثر تدريبك على مسارهم المهني الفعلي.",
      en: "Design courses, train real learners, and earn from your expertise — with visibility into how your teaching actually shapes their career path.",
    },
    personaInstructorCta: { ar: "ابدأ التدريس على WOW", en: "Start Teaching on WOW" },
    personaInstituteTitle: {
      ar: "وسّع برامجك التدريبية… بأثر مقاس",
      en: "Scale your training programs — with measurable impact",
    },
    personaInstituteSub: {
      ar: "أدر برامجك التدريبية لمجموعات أكبر من الدارسين، واحصل على بيانات فعلية عن تقدّمهم وجاهزيتهم لسوق العمل.",
      en: "Run your training programs for larger groups of learners, with real data on their progress and job-market readiness.",
    },
    personaInstituteCta: { ar: "سجّل معهدك", en: "Register Your Institute" },
  },

  lms: {
    catalogTitle: { ar: "الدورات", en: "Courses" },
    catalogEmpty: { ar: "لا توجد دورات منشورة حاليًا.", en: "No published courses right now." },
    backToCatalog: { ar: "الرجوع لكل الدورات", en: "Back to all courses" },
    backToCourse: { ar: "الرجوع للدورة", en: "Back to course" },
    backToLesson: { ar: "الرجوع للدرس", en: "Back to lesson" },
    enroll: { ar: "سجّل في الدورة", en: "Enroll in course" },
    enrolling: { ar: "جارِ التسجيل...", en: "Enrolling..." },
    enrolled: { ar: "أنت مسجّل في هذه الدورة", en: "You're enrolled in this course" },
    notEnrolledHint: {
      ar: "سجّل في الدورة لفتح كل الدروس. الدروس التجريبية متاحة دون تسجيل.",
      en: "Enroll to unlock every lesson. Free-preview lessons are open without enrolling.",
    },
    freePreview: { ar: "معاينة مجانية", en: "Free preview" },
    minutes: { ar: "دقيقة", en: "min" },
    markComplete: { ar: "أنهيت هذا الدرس", en: "Mark as complete" },
    completing: { ar: "جارِ الحفظ...", en: "Saving..." },
    lessonCompleted: { ar: "أُنجز هذا الدرس ✅", en: "Lesson completed ✅" },
    pointsEarned: { ar: "نقطة مكتسبة", en: "points earned" },
    lessonLocked: {
      ar: "هذا الدرس مقفل — سجّل في الدورة لفتحه.",
      en: "This lesson is locked — enroll in the course to unlock it.",
    },
    vocabularyTitle: { ar: "مفردات هذا الدرس", en: "Lesson vocabulary" },
    toolboxTitle: { ar: "أدوات مدير المشروع", en: "Project manager's toolbox" },
    listen: { ar: "استماع", en: "Listen" },
    grammarPointTitle: { ar: "نقطة قواعدية", en: "Grammar point" },
    pronounceWord: { ar: "نطق", en: "Pronounce" },
    prevLesson: { ar: "الدرس السابق", en: "Previous lesson" },
    nextLesson: { ar: "الدرس التالي", en: "Next lesson" },
    record: { ar: "سجّل نطقك", en: "Record yourself" },
    recording: { ar: "جارِ التسجيل... اضغط للإيقاف", en: "Recording... tap to stop" },
    playMine: { ar: "استمع لتسجيلك", en: "Play your recording" },
    recordAgain: { ar: "أعد التسجيل", en: "Record again" },
    evaluateMine: { ar: "قيّم نطقي", en: "Evaluate mine" },
    evaluating: { ar: "جارِ التقييم...", en: "Evaluating..." },
    heardYouSay: { ar: "سمعناك تقول:", en: "We heard you say:" },
    pronunciationDisclaimer: {
      ar: "التقييم يقيس دقة الكلمات المنطوقة فقط (عبر تحويل الكلام إلى نص) — لا يقيس اللكنة أو جودة النطق الصوتي، لأن وكيلك يستقبل نصًا ولا يسمع تسجيلك.",
      en: "Evaluation measures word accuracy only (via speech-to-text) — not accent or sound quality, because your agent receives text and never hears your recording.",
    },
    // Deliberately scoped to pronunciation practice (036): the claim is
    // still exactly true here — this feature never uploads audio — but
    // read unscoped it would become a platform-wide promise that voice
    // calls break. See agent.voiceCallDisclosure for that path.
    recordingNotStored: {
      ar: "تسجيل تدريب النطق لا يُرفع ولا يُحفظ في أي مكان — يبقى في متصفحك ويختفي بإغلاق الصفحة.",
      en: "Your pronunciation recording is never uploaded or stored — it stays in your browser and disappears when you close the page.",
    },
    micDenied: {
      ar: "تعذّر الوصول للميكروفون. اسمح للمتصفح باستخدامه ثم أعد المحاولة.",
      en: "Couldn't access the microphone. Allow browser access and try again.",
    },
    micUnsupported: {
      ar: "متصفحك لا يدعم التسجيل الصوتي.",
      en: "Your browser doesn't support audio recording.",
    },
    speechUnsupported: {
      ar: "التقييم غير متاح في هذا المتصفح (يتطلب Chrome أو Edge). التسجيل والاستماع لنطقك يعملان بشكل طبيعي — ولن تُخصم أي كوينز.",
      en: "Evaluation isn't available in this browser (needs Chrome or Edge). Recording and listening back work normally — and no coins are charged.",
    },
    speechFailed: {
      ar: "تعذّر تحويل كلامك إلى نص، فلا يمكن التقييم — ولم تُخصم أي كوينز. تسجيلك ما زال متاحًا للاستماع.",
      en: "We couldn't turn your speech into text, so evaluation isn't possible — and no coins were charged. Your recording is still playable.",
    },
    speechEmpty: {
      ar: "لم نلتقط أي كلام واضح. حاول التسجيل مرة أخرى — لم تُخصم أي كوينز.",
      en: "We didn't catch any clear speech. Try recording again — no coins were charged.",
    },
    insufficientCoinsPronunciation: {
      ar: "رصيدك من الكوينز غير كافٍ لهذا التقييم.",
      en: "Your coin balance isn't enough for this evaluation.",
    },
    moduleClosingTitle: { ar: "لإنهاء هذه الوحدة", en: "To wrap up this module" },
    languageTask: { ar: "مهمة لغوية اختيارية", en: "Optional language task" },
    coinCost: { ar: "تكلفة (كوينز)", en: "Cost (coins)" },
    languageTaskPlaceholder: { ar: "اكتب ردّك هنا...", en: "Write your response here..." },
    languageTaskSubmit: { ar: "إرسال للوكيل", en: "Send to your agent" },
    languageTaskSubmitting: { ar: "جارِ الإرسال...", en: "Sending..." },
    languageTaskSubmitted: { ar: "أُرسلت هذه المهمة ✅", en: "This task has been submitted ✅" },
    languageTaskInsufficientCoins: {
      ar: "رصيدك من الكوينز غير كافٍ لهذه المهمة.",
      en: "Your coin balance isn't enough for this task.",
    },
    languageTaskAlreadySubmitted: { ar: "لقد سلّمت هذه المهمة من قبل.", en: "You've already submitted this task." },
    entityDecisionTitle: { ar: "قرارك", en: "Your decision" },
    entityDecisionSubmit: { ar: "تأكيد القرار", en: "Confirm decision" },
    entityDecisionSubmitting: { ar: "جارِ الحفظ...", en: "Saving..." },
    entityDecisionFailed: { ar: "تعذّر حفظ القرار", en: "Couldn't save the decision" },
    spellcheckToggle: { ar: "التصحيح الإملائي التلقائي", en: "Automatic spellcheck" },
    walletBalance: { ar: "رصيدك", en: "Your balance" },
    coinsUnit: { ar: "كوينز", en: "coins" },
    dnaSkillsNote: { ar: "مهارات تُضاف لتوأمك الرقمي", en: "Skills added to your Career DNA" },
    seriesEpisode: { ar: "حلقة السلسلة المرتبطة", en: "Related series episode" },
    listeningSuggestion: { ar: "اقتراح استماع", en: "Listening suggestion" },
    capstoneTask: { ar: "مهمة المشروع الختامي", en: "Capstone task" },
    quizzesForLesson: { ar: "اختبارات هذا الدرس", en: "Quizzes for this lesson" },
    courseAssessment: { ar: "التقييم النهائي للدورة", en: "Course final assessment" },
    takeQuiz: { ar: "ابدأ الاختبار", en: "Take the quiz" },
    quizSubmit: { ar: "إرسال الإجابات", en: "Submit answers" },
    quizSubmitting: { ar: "جارِ الإرسال...", en: "Submitting..." },
    quizAlreadyAttempted: { ar: "لقد قدّمت هذا الاختبار من قبل.", en: "You've already attempted this quiz." },
    quizPassed: { ar: "🎉 نجحت في الاختبار!", en: "🎉 You passed the quiz!" },
    quizFailed: { ar: "لم تحقق الحد الأدنى للنجاح هذه المرة.", en: "You didn't reach the passing score this time." },
    quizPendingReview: {
      ar: "أُرسلت إجاباتك — بانتظار اعتماد مقيّم خلال 48 ساعة.",
      en: "Your answers are submitted — awaiting assessor confirmation within 48 hours.",
    },
    answerAllQuestions: { ar: "أجب عن كل الأسئلة قبل الإرسال.", en: "Answer every question before submitting." },
    assessorQueueTitle: { ar: "طابور تصحيح المقيّمين", en: "Assessor review queue" },
    assessorQueueEmpty: { ar: "لا توجد محاولات بانتظار المراجعة.", en: "No attempts waiting for review." },
    reviewDeadline: { ar: "مهلة المراجعة", en: "Review deadline" },
    approve: { ar: "اعتماد", en: "Approve" },
    reject: { ar: "رفض", en: "Reject" },
    grading: { ar: "جارِ الحفظ...", en: "Saving..." },
    assessorOnly: {
      ar: "هذه الصفحة مخصّصة للمقيّمين المعتمدين فقط.",
      en: "This page is for approved assessors only.",
    },
    upcomingSessionsTitle: { ar: "المحاضرات المباشرة القادمة", en: "Upcoming live sessions" },
    joinSession: { ar: "انضمام", en: "Join" },
    rejoinSession: { ar: "الدخول مرة أخرى", en: "Rejoin" },
  },

  projects: {
    // Course-page banner (037) — the only "moment of birth" trigger,
    // since no first-visit hook exists anywhere in the app. Always
    // visible, never dismissed permanently: creating a project costs
    // coins with no cap (owner decision), so the CTA stays live for a
    // second, third, Nth project the same way it did for the first.
    bannerTitleFirst: { ar: "ابدأ مشروعك الحي", en: "Start your Living Project" },
    bannerBodyFirst: {
      ar: "طبّق كل ما تتعلمه على مشروع حقيقي باسمك — من أول يوم.",
      en: "Apply everything you learn to a real project of your own — from day one.",
    },
    newProjectCta: { ar: "مشروع جديد", en: "New project" },
    myProjectsLink: { ar: "مشاريعي", en: "My projects" },

    newProjectModalTitle: { ar: "مشروع حي جديد", en: "New Living Project" },
    fieldName: { ar: "اسم المشروع", en: "Project name" },
    fieldSector: { ar: "القطاع", en: "Sector" },
    fieldCountry: { ar: "الدولة", en: "Country" },
    fieldOrganization: { ar: "المنظمة", en: "Organization" },
    costPrefix: { ar: "التكلفة:", en: "Cost:" },
    coinsUnit: { ar: "كوينز", en: "coins" },
    create: { ar: "إنشاء المشروع", en: "Create project" },
    creating: { ar: "جارِ الإنشاء...", en: "Creating..." },
    cancel: { ar: "إلغاء", en: "Cancel" },
    errNameRequired: { ar: "اسم المشروع مطلوب.", en: "Project name is required." },
    errInsufficientBalance: {
      ar: "رصيد الكوينز لا يكفي لفتح مشروع جديد. اشحن محفظتك من صفحتك الشخصية.",
      en: "Not enough coins to open a new project. Top up your wallet from your profile.",
    },
    errGeneric: { ar: "تعذّر إنشاء المشروع الآن.", en: "Couldn't create the project right now." },
    createdCelebration: {
      ar: "🎉 وُلد مشروعك الحي! لنبنِ بيان الأعمال أولًا.",
      en: "🎉 Your Living Project is born! Let's build the business case first.",
    },

    // Workspace
    workspaceBack: { ar: "مشاريعي", en: "My projects" },
    tabOverview: { ar: "نظرة عامة", en: "Overview" },
    tabBusinessCase: { ar: "بيان الأعمال", en: "Business case" },
    tabCharter: { ar: "الميثاق", en: "Charter" },
    tabDecisionLog: { ar: "سجل القرارات", en: "Decision log" },
    readinessLabel: { ar: "جاهزية المشروع", en: "Project readiness" },
    emptyProjectsTitle: { ar: "لا مشاريع بعد", en: "No projects yet" },
    emptyProjectsBody: {
      ar: "افتح مشروعك الحي الأول من صفحة الدورة.",
      en: "Open your first Living Project from the course page.",
    },

    // Top risks widget (read-only) — the full register lives in the
    // Level 2 lesson exercise (RiskRegisterBuilder); this is only the
    // top-3 display embedded in the Overview tab.
    topRisksTitle: { ar: "أهم المخاطر", en: "Top risks" },
    topRisksEmpty: {
      ar: "لا مخاطر مسجّلة بعد — سجّلها من تمرين إدارة المخاطر بالمستوى الثاني.",
      en: "No risks logged yet — record them from the Level 2 risk management exercise.",
    },
    riskScoreLabel: { ar: "الدرجة", en: "Score" },
    riskStrategyAvoid: { ar: "تجنّب", en: "Avoid" },
    riskStrategyMitigate: { ar: "تخفيف", en: "Mitigate" },
    riskStrategyTransfer: { ar: "نقل", en: "Transfer" },
    riskStrategyAccept: { ar: "قبول", en: "Accept" },

    // Business case
    businessCaseIntro: {
      ar: "بيان أعمال مصغّر — أربعة أسئلة تحدّد لماذا هذا المشروع يستحق أن يُبنى.",
      en: "A mini business case — four questions that decide why this project deserves to be built.",
    },
    fieldProblem: { ar: "المشكلة", en: "Problem" },
    fieldOpportunity: { ar: "الفرصة", en: "Opportunity" },
    fieldValueCase: { ar: "القيمة", en: "Value" },
    fieldWhyNow: { ar: "لماذا الآن؟", en: "Why now?" },
    save: { ar: "حفظ", en: "Save" },
    saving: { ar: "جارِ الحفظ...", en: "Saving..." },
    saved: { ar: "تم الحفظ", en: "Saved" },

    // Charter (wizard, built on the onboarding wizard shape)
    charterIntro: {
      ar: "ميثاق مشروعك — وثيقة ميلاده الرسمية.",
      en: "Your project's charter — its official birth certificate.",
    },
    fieldVision: { ar: "الرؤية", en: "Vision" },
    fieldObjectives: { ar: "الأهداف", en: "Objectives" },
    fieldDeliverables: { ar: "المخرجات", en: "Deliverables" },
    fieldSponsorName: { ar: "اسم الراعي (Sponsor)", en: "Sponsor name" },
    fieldSponsorAuthority: { ar: "صلاحيات الراعي وتوقعاته", en: "Sponsor authority & expectations" },
    fieldCoreTeam: { ar: "الفريق الأساسي", en: "Core team" },
    coreTeamName: { ar: "الاسم", en: "Name" },
    coreTeamRole: { ar: "الدور", en: "Role" },
    addTeamMember: { ar: "إضافة عضو", en: "Add member" },
    fieldAssumptions: { ar: "الافتراضات", en: "Assumptions" },
    fieldConstraints: { ar: "القيود", en: "Constraints" },
    addAssumption: { ar: "إضافة افتراض", en: "Add assumption" },
    addConstraint: { ar: "إضافة قيد", en: "Add constraint" },
    remove: { ar: "حذف", en: "Remove" },
    approveCharter: { ar: "اعتماد الميثاق", en: "Approve charter" },
    approving: { ar: "جارِ الاعتماد...", en: "Approving..." },
    charterApproved: { ar: "✅ الميثاق معتمد", en: "✅ Charter approved" },
    charterApprovedOn: { ar: "اعتُمد في", en: "Approved on" },

    // Decision log
    decisionLogIntro: {
      ar: "كل قرار يُسجَّل — من أول لحظة.",
      en: "Every decision gets logged — from the first moment.",
    },
    fieldSituation: { ar: "الموقف", en: "Situation" },
    fieldDecisionText: { ar: "القرار", en: "Decision" },
    fieldReason: { ar: "السبب", en: "Reason" },
    fieldCategory: { ar: "التصنيف (اختياري)", en: "Category (optional)" },
    categoryAssumption: { ar: "افتراض", en: "Assumption" },
    categoryConstraint: { ar: "قيد", en: "Constraint" },
    categoryRisk: { ar: "خطر", en: "Risk" },
    addDecision: { ar: "إضافة قرار", en: "Add decision" },
    adding: { ar: "جارِ الإضافة...", en: "Adding..." },
    emptyDecisionLog: { ar: "لا قرارات مسجَّلة بعد.", en: "No decisions logged yet." },
    // The one system-generated row (037's log_charter_approval trigger)
    // is recognized by category='milestone' and rendered through here —
    // never by displaying its stored situation/decision/reason columns
    // verbatim, which are slugs, not prose (see the migration's own
    // comment on why).
    milestoneCharterApproved: { ar: "🏁 اعتماد الميثاق", en: "🏁 Charter approved" },
    tabGames: { ar: "الألعاب", en: "Games" },
  },

  games: {
    // Course-page unlock banner (038) — the generic variant unlocks all
    // five games at once, the moment the single Level 1 final quiz is
    // assessor-approved. The project variant needs no unlock at all
    // (lives in /project/[id] instead), so this banner only ever talks
    // about the generic side.
    unlockedBannerTitle: { ar: "🎮 ألعاب المستوى الأول مفتوحة!", en: "🎮 Level 1 games are unlocked!" },
    unlockedBannerBody: {
      ar: "اجتزت الاختبار النهائي — خمس ألعاب بانتظارك الآن.",
      en: "You passed the final assessment — five games are waiting for you now.",
    },
    lockedBannerTitle: { ar: "🎮 ألعاب المستوى الأول", en: "🎮 Level 1 games" },
    lockedBannerBody: {
      ar: "تُفتح دفعة واحدة فور اجتياز الاختبار النهائي المعتمد.",
      en: "They all unlock together once your final assessment is approved.",
    },
    viewGamesCta: { ar: "عرض الألعاب", en: "View games" },

    hubTitle: { ar: "ألعاب المستوى الأول", en: "Level 1 Games" },
    hubIntro: {
      ar: "نسخة عامة تدربك على سيناريو جاهز — النسخة المرتبطة بمشروعك الحي موجودة داخل صفحة مشروعك.",
      en: "A generic variant that practices on a ready-made scenario — the variant tied to your real project lives inside your project page.",
    },
    backToCourse: { ar: "← رجوع للدورة", en: "← Back to course" },

    costPrefix: { ar: "التكلفة:", en: "Cost:" },
    coinsUnit: { ar: "كوينز", en: "coins" },
    playCta: { ar: "العب", en: "Play" },
    playing: { ar: "جارِ البدء...", en: "Starting..." },
    submitting: { ar: "جارِ الإرسال...", en: "Submitting..." },
    submit: { ar: "إرسال", en: "Submit" },
    retryCta: { ar: "أعد المحاولة", en: "Try again" },

    errInsufficientBalance: {
      ar: "رصيد الكوينز لا يكفي لهذه اللعبة. اشحن محفظتك من صفحتك الشخصية.",
      en: "Not enough coins for this game. Top up your wallet from your profile.",
    },
    errQuizNotPassed: {
      ar: "هذه اللعبة تُفتح بعد اجتياز الاختبار النهائي واعتماده.",
      en: "This game unlocks after your final assessment is passed and approved.",
    },
    errGeneric: { ar: "تعذّر بدء اللعبة الآن.", en: "Couldn't start the game right now." },

    completedTitle: { ar: "🏅 أحسنت!", en: "🏅 Well done!" },
    completedBadgeEarned: { ar: "حصلت على شارة", en: "You earned the badge" },
    notYetTitle: { ar: "قريب!", en: "Almost there!" },
    notYetBody: {
      ar: "لم تكتمل معايير الإنجاز بعد — يمكنك إعادة المحاولة بلا رسوم إضافية.",
      en: "You haven't met the completion criteria yet — you can retry at no extra cost.",
    },

    // Charter Builder
    charterBuilderTitle: { ar: "بناء الميثاق", en: "Charter Builder" },
    charterBuilderDesc: {
      ar: "ابنِ ميثاق مشروع خطوة بخطوة واعتمده رسميًا.",
      en: "Build a project charter step by step and formally approve it.",
    },
    charterBuilderBadgeName: { ar: "بطل الميثاق", en: "Charter Master" },
    charterBuilderProjectHint: {
      ar: "هذه النسخة تستخدم ميثاق مشروعك الحقيقي — أكمِله واعتمده من تبويب «الميثاق»، ثم عد هنا.",
      en: "This variant uses your real project's charter — complete and approve it from the Charter tab, then come back here.",
    },
    approveCheckbox: {
      ar: "أوافق على اعتماد هذا الميثاق كما هو",
      en: "I approve this charter as written",
    },

    // Stakeholder Detective
    stakeholderDetectiveTitle: { ar: "محقق أصحاب المصلحة", en: "Stakeholder Detective" },
    stakeholderDetectiveDesc: {
      ar: "صنّف أصحاب المصلحة على مصفوفة القوة والاهتمام.",
      en: "Classify stakeholders on the power/interest grid.",
    },
    stakeholderDetectiveBadgeName: { ar: "محلل أصحاب المصلحة", en: "Stakeholder Analyst" },
    fieldStakeholderName: { ar: "اسم صاحب المصلحة", en: "Stakeholder name" },
    fieldQuadrant: { ar: "التصنيف", en: "Quadrant" },
    fieldJustification: { ar: "المبرر", en: "Justification" },
    addStakeholder: { ar: "إضافة صاحب مصلحة", en: "Add stakeholder" },
    quadrantManageClosely: { ar: "قوة عالية + اهتمام عالٍ — أدِرهم عن قرب", en: "High power + high interest — manage closely" },
    quadrantKeepSatisfied: { ar: "قوة عالية + اهتمام منخفض — أرضِهم", en: "High power + low interest — keep satisfied" },
    quadrantKeepInformed: { ar: "قوة منخفضة + اهتمام عالٍ — أبقهم مطّلعين", en: "Low power + high interest — keep informed" },
    quadrantMonitor: { ar: "قوة منخفضة + اهتمام منخفض — راقب فقط", en: "Low power + low interest — monitor" },
    needAtLeastThree: { ar: "صنّف 3 أصحاب مصلحة على الأقل بمبرر لكل واحد.", en: "Classify at least 3 stakeholders, each with a justification." },

    // Project vs Operations Race
    spotterTitle: { ar: "سباق: مشروع أم عملية؟", en: "Project vs Operations Race" },
    spotterDesc: {
      ar: "صنّف كل عبارة بسرعة: مشروع أم عملية تشغيلية؟",
      en: "Quickly classify each statement: a project, or an ongoing operation?",
    },
    spotterBadgeName: { ar: "راصد المشاريع", en: "Project Spotter" },
    spotterInstructions: {
      ar: "تحتاج 80% إجابات صحيحة على الأقل للفوز بالشارة.",
      en: "You need at least 80% correct to win the badge.",
    },
    spotterProjectBtn: { ar: "مشروع", en: "Project" },
    spotterOperationBtn: { ar: "عملية تشغيلية", en: "Operation" },
    spotterScoreLabel: { ar: "نتيجتك", en: "Your score" },

    // Assumptions & Constraints
    assumptionsConstraintsTitle: { ar: "الافتراضات والقيود", en: "Assumptions & Constraints" },
    assumptionsConstraintsDesc: {
      ar: "صنّف عناصر مشروعك: افتراض، قيد، أم خطر؟",
      en: "Classify your project's elements: assumption, constraint, or risk?",
    },
    assumptionsConstraintsBadgeName: { ar: "مفكر ناقد", en: "Critical Thinker" },
    fieldItemText: { ar: "العنصر", en: "Item" },
    addItem: { ar: "إضافة عنصر", en: "Add item" },
    needAtLeastFourAcrossThree: {
      ar: "صنّف 4 عناصر على الأقل، موزعة على الفئات الثلاث كلها.",
      en: "Classify at least 4 items, spanning all three categories.",
    },
    projectVariantSavesToLog: {
      ar: "في نسخة مشروعك، كل عنصر تصنّفه يُضاف تلقائيًا لسجل قراراتك الحقيقي.",
      en: "In your project variant, every classified item is added automatically to your real decision log.",
    },

    // Strategy Alignment
    strategyAlignmentTitle: { ar: "مواءمة الاستراتيجية", en: "Strategy Alignment" },
    strategyAlignmentDesc: {
      ar: "اربط مشروعك باستراتيجية المنظمة، واحصل على تغذية راجعة من وكيلك.",
      en: "Connect your project to organizational strategy and get feedback from your agent.",
    },
    strategyAlignmentBadgeName: { ar: "مُحقق المواءمة", en: "Strategy Aligner" },
    orgStrategyLabel: { ar: "استراتيجية المنظمة", en: "Organizational strategy" },
    responsePlaceholder: {
      ar: "اكتب جملة أو جملتين تربطان مشروعك بهذا الهدف...",
      en: "Write one or two sentences connecting your project to this goal...",
    },
    feedbackLabel: { ar: "تغذية راجعة", en: "Feedback" },
    strategyAlignmentProjectHint: {
      ar: "هذه النسخة تستخدم بيانات مشروعك الحقيقي — اربطه باستراتيجية منظمته كما تراها.",
      en: "This variant uses your real project — connect it to its organization's strategy as you see it.",
    },

    // Project workspace "Games" tab (v3 decision 2)
    badgesTitle: { ar: "الشارات", en: "Badges" },
    certificatesTitle: { ar: "الشهادات", en: "Certificates" },
    noBadgesYet: { ar: "لا شارات بعد.", en: "No badges yet." },
    projectVariantSectionTitle: { ar: "ألعاب مشروعك", en: "Your project's games" },
    genericVariantSectionTitle: { ar: "الألعاب العامة", en: "Generic games" },
    genericVariantLockedNotice: {
      ar: "تُفتح دفعة واحدة فور اجتياز اختبار المستوى الأول النهائي واعتماده.",
      en: "These all unlock together once your Level 1 final assessment is passed and approved.",
    },
  },

  // Level 2 (Project Planning & Control) — Knowledge-Base-scored games
  // (046). Only generic UI chrome lives here; scenario content (task
  // names, choice labels, feedback) lives in kb_scenarios/kb_scoring_rules
  // in the database, same split game_generic_scenarios' content already
  // uses for Level 1.
  level2: {
    hubTitle: { ar: "ألعاب المستوى الثاني", en: "Level 2 Games" },
    hubIntro: {
      ar: "قرارات حقيقية تُقيَّم فورًا مقابل قاعدة معرفة، بلا انتظار.",
      en: "Real decisions, scored instantly against a knowledge base — no waiting.",
    },
    costPrefix: { ar: "التكلفة:", en: "Cost:" },
    coinsUnit: { ar: "كوينز", en: "coins" },
    playCta: { ar: "ابدأ", en: "Start" },
    starting: { ar: "جارِ البدء...", en: "Starting..." },
    submitting: { ar: "جارِ التقييم...", en: "Grading..." },
    submit: { ar: "إرسال للتقييم", en: "Submit for grading" },
    retryCta: { ar: "أعد المحاولة", en: "Try again" },

    errInsufficientBalance: {
      ar: "رصيد الكوينز لا يكفي لهذه اللعبة. اشحن محفظتك من صفحتك الشخصية.",
      en: "Not enough coins for this game. Top up your wallet from your profile.",
    },
    errGeneric: { ar: "تعذّر بدء اللعبة الآن.", en: "Couldn't start the game right now." },

    passedTitle: { ar: "🏅 نجحت!", en: "🏅 Passed!" },
    passedBadgeEarned: { ar: "حصلت على شارة", en: "You earned the badge" },
    notPassedTitle: { ar: "لسه", en: "Not yet" },
    notPassedBody: {
      ar: "لم تصل لعتبة النجاح هذه المرة — أعد المحاولة (بكوينز جديدة) وراجع الملاحظات أدناه.",
      en: "You didn't reach the passing threshold this time — retry (a new attempt costs coins) and review the feedback below.",
    },
    scoreLabel: { ar: "درجتك", en: "Your score" },

    resourceOptimizerTitle: { ar: "محسّن الموارد", en: "Resource Optimizer" },
    resourceOptimizerDesc: {
      ar: "وزّع مهام الفريق على الموارد المتاحة، بما يحترم الطاقة والتبعيات.",
      en: "Assign team tasks to available resources, respecting capacity and dependencies.",
    },
    evmSimulatorTitle: { ar: "محاكي القيمة المكتسبة", en: "EVM Simulator" },
    evmSimulatorDesc: {
      ar: "احسب CPI وSPI من بيانات مشروع حقيقية، واختر الاستجابة الإدارية الصحيحة.",
      en: "Calculate CPI and SPI from real project data, then choose the right management response.",
    },

    teamLabel: { ar: "الفريق", en: "Team" },
    tasksLabel: { ar: "المهام", en: "Tasks" },
    hoursUnit: { ar: "ساعة", en: "hours" },
    dependsOnLabel: { ar: "يعتمد على", en: "Depends on" },

    cpiLabel: { ar: "مؤشر أداء التكلفة (CPI)", en: "Cost Performance Index (CPI)" },
    spiLabel: { ar: "مؤشر أداء الجدول (SPI)", en: "Schedule Performance Index (SPI)" },
    responseLabel: { ar: "الاستجابة الإدارية", en: "Management response" },
    pvLabel: { ar: "القيمة المخطَّطة (PV)", en: "Planned Value (PV)" },
    evLabel: { ar: "القيمة المكتسبة (EV)", en: "Earned Value (EV)" },
    acLabel: { ar: "التكلفة الفعلية (AC)", en: "Actual Cost (AC)" },
    cpiCorrect: { ar: "✓ CPI صحيح", en: "✓ CPI correct" },
    cpiIncorrect: { ar: "✗ CPI غير صحيح", en: "✗ CPI incorrect" },
    spiCorrect: { ar: "✓ SPI صحيح", en: "✓ SPI correct" },
    spiIncorrect: { ar: "✗ SPI غير صحيح", en: "✗ SPI incorrect" },

    reflectionTitle: { ar: "سجّل قرارك", en: "Record your decision" },
    reflectionPlaceholder: { ar: "اكتب إجابتك هنا...", en: "Write your answer here..." },
    reflectionSave: { ar: "احفظ في سجل القرارات", en: "Save to your decision log" },
    reflectionSaving: { ar: "جارِ الحفظ...", en: "Saving..." },
    reflectionSaved: { ar: "✓ تم الحفظ في سجل قرارات مشروعك.", en: "✓ Saved to your project's decision log." },
    reflectionErrGeneric: { ar: "تعذّر الحفظ الآن.", en: "Couldn't save right now." },

    wbsTitle: { ar: "هيكل تجزئة العمل (WBS)", en: "Work Breakdown Structure (WBS)" },
    wbsDesc: {
      ar: "ابنِ WBS حقيقي لمشروعك — عنصر جذر (اسمه اسم مشروعك) و3-5 حزم عمل رئيسية تحته.",
      en: "Build a real WBS for your project — a root item (your project's name) and 3-5 main work packages under it.",
    },
    wbsLoading: { ar: "جارِ التحميل...", en: "Loading..." },
    wbsProgress: { ar: "حزم العمل الرئيسية", en: "Main work packages" },
    wbsNamePlaceholder: { ar: "اسم حزمة العمل...", en: "Work package name..." },
    wbsAdd: { ar: "إضافة", en: "Add" },
    wbsAdding: { ar: "جارِ الإضافة...", en: "Adding..." },
    wbsAddChild: { ar: "+ إضافة تحته", en: "+ Add under" },
    wbsDelete: { ar: "حذف", en: "Delete" },
    wbsErrGeneric: { ar: "تعذّر تنفيذ العملية الآن.", en: "Couldn't complete that action right now." },
    wbsErrHasChildren: { ar: "احذف الفروع الأول — هذا العنصر له عناصر تحته.", en: "Delete the branches first — this item has items under it." },

    riskTitle: { ar: "سجل المخاطر", en: "Risk Register" },
    riskDesc: {
      ar: "سجّل مخاطر مشروعك الحقيقية — قيّم كل واحدة باحتمالية وتأثير، واختر استراتيجية استجابة.",
      en: "Log your project's real risks — score each by probability and impact, and choose a response strategy.",
    },
    riskDescPlaceholder: { ar: "وصف المخاطرة...", en: "Risk description..." },
    riskProbabilityLabel: { ar: "الاحتمالية", en: "Probability" },
    riskImpactLabel: { ar: "التأثير", en: "Impact" },
    riskResponseLabel: { ar: "استراتيجية الاستجابة", en: "Response strategy" },
    riskLevel1: { ar: "1 — منخفضة جدًا", en: "1 — Very low" },
    riskLevel2: { ar: "2 — منخفضة", en: "2 — Low" },
    riskLevel3: { ar: "3 — متوسطة", en: "3 — Medium" },
    riskLevel4: { ar: "4 — عالية", en: "4 — High" },
    riskLevel5: { ar: "5 — عالية جدًا", en: "5 — Very high" },
    riskAdd: { ar: "إضافة مخاطرة", en: "Add risk" },
    riskAdding: { ar: "جارِ الإضافة...", en: "Adding..." },
    riskDelete: { ar: "حذف", en: "Delete" },
    riskEmpty: { ar: "لا مخاطر مسجّلة بعد.", en: "No risks logged yet." },
    riskErrGeneric: { ar: "تعذّر تنفيذ العملية الآن.", en: "Couldn't complete that action right now." },

    burndownTitle: { ar: "قارئ Burndown", en: "Burndown Reader" },
    burndownDesc: {
      ar: "راجع جدول سبرنت حقيقي، وفسّر إيه اللي بيقوله عن أداء الفريق.",
      en: "Review a real sprint table, and interpret what it says about team performance.",
    },
    burndownDayLabel: { ar: "اليوم", en: "Day" },
    burndownIdealLabel: { ar: "المتبقي المثالي", en: "Ideal remaining" },
    burndownActualLabel: { ar: "المتبقي الفعلي", en: "Actual remaining" },

    finalBossTitle: { ar: "Final Boss — محاكي الأزمات", en: "Final Boss — Crisis Simulator" },
    finalBossDesc: {
      ar: "4-6 سيناريوهات عشوائية من أزمات حقيقية — قرار واحد لكل سيناريو، بلا وقت محدود لكن السرعة تكسر التعادل.",
      en: "4-6 random scenarios from real crises — one decision per scenario, no hard time limit, but speed breaks ties.",
    },
    finalBossScenarioOf: { ar: "سيناريو", en: "Scenario" },
    contentScoreLabel: { ar: "درجة القرارات", en: "Decision score" },
    speedBonusLabel: { ar: "مكافأة السرعة", en: "Speed bonus" },
  },

  profile: {
    title: { ar: "ملفك الشخصي", en: "Your profile" },
    avatarChange: { ar: "غيّر الصورة", en: "Change photo" },
    avatarUploading: { ar: "جارِ الرفع...", en: "Uploading..." },
    avatarErrType: { ar: "الملف لازم يكون صورة.", en: "The file must be an image." },
    avatarErrSize: { ar: "حجم الصورة كبير جدًا (الحد 3 ميجابايت).", en: "Image is too large (3MB max)." },
    dnaTitle: { ar: "توأمك الرقمي المهني", en: "Your Career DNA" },
    dnaEmpty: {
      ar: "لسه ما بنينا ملف الهوية المهنية الخاص فيك — يبدأ يتكوّن مع تقدمك بالدورات والاختبارات.",
      en: "Your professional DNA hasn't been built yet — it forms as you progress through courses and assessments.",
    },
    dnaIdentity: { ar: "الهوية", en: "Identity" },
    dnaLearning: { ar: "التعلّم", en: "Learning" },
    dnaExperience: { ar: "الخبرة", en: "Experience" },
    dnaPersonality: { ar: "الشخصية", en: "Personality" },
    skillsTitle: { ar: "المهارات وأدلتها", en: "Skills & evidence" },
    skillsEmpty: { ar: "لا مهارات موثّقة بعد.", en: "No documented skills yet." },
    evidenceCount: { ar: "دليل", en: "pieces of evidence" },
    certificatesTitle: { ar: "الشهادات", en: "Certificates" },
    certificatesEmpty: { ar: "لا شهادات صادرة بعد.", en: "No certificates issued yet." },
    gameBadgesTitle: { ar: "شارات الألعاب", en: "Game badges" },
    gameBadgesEmpty: { ar: "لا شارات ألعاب بعد — العب من صفحة مشروعك.", en: "No game badges yet — play from your project page." },
    employabilityTitle: { ar: "درجة الجاهزية للتوظيف", en: "Employability score" },
    trustTitle: { ar: "درجة الثقة", en: "Trust score" },
    scoreNotComputed: { ar: "لم تُحسب بعد.", en: "Not computed yet." },
    scoreFactors: { ar: "العوامل المؤثرة", en: "Contributing factors" },
    capabilitiesTitle: { ar: "قدراتك النشطة", en: "Active capabilities" },
    activateCapability: { ar: "فعّل قدرة جديدة", en: "Activate a new capability" },
    activating: { ar: "جارِ التفعيل...", en: "Activating..." },
    agentTitle: { ar: "وكيلك الشخصي", en: "Your personal agent" },
    agentRecsTitle: { ar: "آخر التوصيات", en: "Latest recommendations" },
    agentRecsEmpty: { ar: "لا توصيات بعد.", en: "No recommendations yet." },
    recStatusPending: { ar: "قيد الانتظار", en: "Pending" },
    recStatusDone: { ar: "مُنجزة", en: "Done" },
    recStatusDismissed: { ar: "متجاهَلة", en: "Dismissed" },
    walletTitle: { ar: "محفظة الكوينز", en: "Coin wallet" },
    walletBalance: { ar: "رصيدك الحالي", en: "Your current balance" },
    coinsUnit: { ar: "كوينز", en: "coins" },
    walletSimulatedWarning: {
      ar: "⚠️ هذا شراء تجريبي محاكى فقط لأغراض الاختبار — لا توجد بوابة دفع حقيقية، ولن يُخصم أي مبلغ فعلي من أي بطاقة.",
      en: "⚠️ This is a simulated test purchase only — there is no real payment gateway, and no actual charge will be made to any card.",
    },
    walletPurchaseDisabled: {
      ar: "🔒 شراء الكوينز غير متاح حاليًا — بوابة الدفع الحقيقية لم تُفعَّل بعد. تواصل مع فريق WOW إن كنت تحتاج رصيدًا للاختبار.",
      en: "🔒 Buying coins is unavailable — the real payment gateway isn't live yet. Contact the WOW team if you need a test balance.",
    },
    buyPackage: { ar: "اشترِ", en: "Buy" },
    buying: { ar: "جارِ الشراء...", en: "Purchasing..." },
    purchaseSuccess: { ar: "تمت إضافة الكوينز إلى رصيدك ✅", en: "Coins added to your balance ✅" },
  },

  agent: {
    // Generic labels only — never a fixed name. The chosen name is always
    // interpolated in the component (e.g. `${chosenName} ${t("agent.thinking")}`).
    placeholder: { ar: "اسأل وكيلك عن مسارك المهني...", en: "Ask your agent about your career path..." },
    send: { ar: "إرسال", en: "Send" },
    thinking: { ar: "يكتب...", en: "is typing..." },
    unavailable: { ar: "وكيلك غير متاح حاليًا، حاول بعد قليل.", en: "Your agent is unavailable right now, try again shortly." },
    namingTitle: { ar: "قبل ما نبدأ، سمّي وكيلك", en: "Before we start, name your agent" },
    namingSub: {
      ar: "هذا الاسم يبقى معك في كل مكان بالمنصة — تقدر تغيّره لاحقًا من الإعدادات.",
      en: "This name stays with you everywhere on the platform — you can change it later in Settings.",
    },
    namingPlaceholder: { ar: "مثلاً: رفيق، ياسمين، مساعدي...", en: "e.g. Rafiq, Yasmine, Buddy..." },
    namingSave: { ar: "احفظ الاسم وابدأ المحادثة", en: "Save name and start chatting" },
    namingSaving: { ar: "جارِ الحفظ...", en: "Saving..." },
    introPrefix: { ar: "أهلاً! أنا", en: "Hey! I'm" },
    introSuffix: {
      ar: "👋 اسألني عن أي شي يخص مسارك المهني، مهاراتك، أو الخطوة التالية.",
      en: "👋 Ask me anything about your career path, your skills, or your next step.",
    },
    floatingOpen: { ar: "افتح محادثة وكيلك", en: "Open your agent" },
    floatingClose: { ar: "إغلاق المحادثة", en: "Close chat" },
    lessonAwareIntro: {
      ar: "📖 أنا أرى هذا الدرس معك — اسألني عن أي جزء منه.",
      en: "📖 I can see this lesson with you — ask me about any part of it.",
    },
    // Shown BEFORE a voice call starts, not buried in settings — a T1-T9
    // charter requirement, since this is the one place on the platform
    // where a user's audio leaves their device. Deliberately makes no
    // claim about what OpenAI retains: that is not ours to assert. See
    // SECURITY.md "Agent voice calls" and DOMAIN_CONTRACTS §11.
    voiceCallDisclosure: {
      ar: "أثناء المكالمة الصوتية يُرسَل صوتك مباشرةً إلى مزوّد الذكاء الاصطناعي (OpenAI) لحظة بلحظة ليتمكّن وكيلك من الرد — الاتصال يتم من متصفحك إلى المزوّد مباشرة ولا يمر عبر خوادم WOW. نحن لا نحفظ أي تسجيل صوتي؛ ما نحفظه هو وقت المكالمة ومدتها والكوينز المخصومة، ونصّ المحادثة ليتذكّره وكيلك لاحقًا.",
      en: "During a voice call your audio is streamed live to our AI provider (OpenAI) so your agent can respond. That connection goes from your browser straight to the provider — it does not pass through WOW's servers. We store no audio recording; we store the call's time, duration, coins charged, and the conversation transcript so your agent remembers it.",
    },
    voiceCallStart: { ar: "مكالمة صوتية", en: "Voice call" },
    voiceCallTitle: { ar: "مكالمة صوتية مع وكيلك", en: "Voice call with your agent" },
    voiceCallConfirm: { ar: "ابدأ المكالمة", en: "Start the call" },
    voiceCallCancel: { ar: "إلغاء", en: "Cancel" },
    // Composed in the component around the real numbers, so the price
    // and the cap always come from the server rather than being frozen
    // into a translated sentence.
    voiceCallCostPrefix: { ar: "التكلفة:", en: "Cost:" },
    voiceCallCoinsPerMinute: { ar: "كوينز/دقيقة", en: "coins/min" },
    voiceCallCapNotice: {
      ar: "تُحجز مدة المكالمة مقدمًا وتنتهي تلقائيًا عند بلوغ الحد. الدقائق غير المستخدمة تُعاد لمحفظتك عند الإنهاء.",
      en: "The call length is reserved up front and ends automatically at the limit. Unused minutes are returned to your wallet when you hang up.",
    },
    voiceCallConnecting: { ar: "جارِ الاتصال...", en: "Connecting..." },
    voiceCallListening: { ar: "المكالمة جارية — تكلّم بشكل طبيعي", en: "On the call — just talk normally" },
    voiceCallRemaining: { ar: "المتبقي", en: "Remaining" },
    voiceCallEnd: { ar: "إنهاء المكالمة", en: "End call" },
    voiceCallEnding: { ar: "جارِ الإنهاء...", en: "Ending..." },
    voiceCallMute: { ar: "كتم", en: "Mute" },
    voiceCallUnmute: { ar: "إلغاء الكتم", en: "Unmute" },
    voiceCallSummaryTitle: { ar: "انتهت المكالمة", en: "Call ended" },
    voiceCallSummaryUsed: { ar: "المدة المحتسبة (دقائق):", en: "Billed minutes:" },
    voiceCallSummaryRefunded: { ar: "أُعيد لمحفظتك (كوينز):", en: "Returned to your wallet (coins):" },
    voiceCallErrInsufficient: {
      ar: "رصيد الكوينز لا يكفي لبدء مكالمة. اشحن محفظتك من صفحتك الشخصية.",
      en: "Not enough coins to start a call. Top up your wallet from your profile.",
    },
    voiceCallErrActive: {
      ar: "لديك مكالمة جارية بالفعل. أنهِها أولًا ثم ابدأ واحدة جديدة.",
      en: "You already have a call in progress. End it before starting another.",
    },
    voiceCallErrMic: {
      ar: "تعذّر الوصول للميكروفون. اسمح للمتصفح باستخدامه ثم أعد المحاولة — لم تُخصم أي كوينز.",
      en: "Couldn't reach your microphone. Allow it in your browser and try again — you were not charged.",
    },
    voiceCallErrRate: {
      ar: "بدأت مكالمات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.",
      en: "Too many calls started recently. Please wait a little and try again.",
    },
    voiceCallErrGeneric: {
      ar: "تعذّر بدء المكالمة الآن. إن خُصمت كوينز فقد أُعيدت لمحفظتك.",
      en: "Couldn't start the call right now. If any coins were taken, they've been returned.",
    },
    voiceCallDropped: {
      ar: "انقطع الاتصال. أُنهيت المكالمة وأُعيدت الدقائق غير المستخدمة.",
      en: "The connection dropped. The call was ended and unused minutes returned.",
    },
  },

  placement: {
    inviteTitle: { ar: "لنتعارف أولاً 👋", en: "Let's get to know each other first 👋" },
    inviteBody: {
      ar: "محادثة قصيرة وودّية مع وكيلك (مرة واحدة، مجانًا) — يتعرّف فيها على مستواك في الإنجليزية، ومسارك المهني، وأي شي تحب إخباره عن نفسك. بلا امتحان وبلا درجات.",
      en: "A short, friendly one-time chat with your agent (free) — it gets to know your English level, your career path, and anything you'd like to tell it about yourself. No exam, no grades.",
    },
    inviteCta: { ar: "ابدأ المحادثة", en: "Start the conversation" },
    introBubble: {
      ar: "سولّف معي شوي بالإنجليزي 🙂 ابدأ بأي تحية بسيطة — مثلاً \"Hi!\" — وجاوب براحتك، مو امتحان.",
      en: "Chat with me a little in English 🙂 start with any simple greeting — like \"Hi!\" — and answer at your own pace. It's not a test.",
    },
    placeholder: { ar: "اكتب ردّك بالإنجليزية...", en: "Type your reply in English..." },
    completedTitle: { ar: "🎉 تم تحديد مستواك:", en: "🎉 Your level is set:" },
    yourLevel: { ar: "مستواك في الإنجليزية", en: "Your English level" },
    retestLater: {
      ar: "إعادة التقييم لمستوى أعلى ستتاح لاحقًا.",
      en: "Re-assessment to a higher level will be available later.",
    },
    alreadyPlaced: {
      ar: "أنجزت محادثة تحديد المستوى من قبل.",
      en: "You've already completed your placement conversation.",
    },
  },

  instructor: {
    instructorOnly: {
      ar: "هذه الصفحة مخصّصة للأساتذة المفعَّلين فقط.",
      en: "This page is for activated instructors only.",
    },
    goActivate: { ar: "فعّل قدرة الأستاذ من ملفك الشخصي", en: "Activate the instructor capability from your profile" },
    myCoursesTitle: { ar: "دوراتي الخاصة", en: "My personal courses" },
    noCoursesYet: { ar: "لم تُنشئ أي دورة خاصة بعد.", en: "You haven't created a personal course yet." },
    createCourseCta: { ar: "أنشئ دورة خاصة بك", en: "Create your own course" },
    courseTitlePlaceholder: { ar: "عنوان الدورة", en: "Course title" },
    courseSummaryPlaceholder: { ar: "وصف مختصر للدورة (اختياري)", en: "Short course description (optional)" },
    trackEducation: { ar: "تعليم", en: "Education" },
    trackEmployment: { ar: "توظيف", en: "Employment" },
    trackPromotion: { ar: "ترقية", en: "Promotion" },
    creatingCourse: { ar: "جارِ الإنشاء...", en: "Creating..." },
    createCourseSubmit: { ar: "إنشاء الدورة", en: "Create course" },
    inviteLinkLabel: {
      ar: "رابط الدعوة — شاركه مع طلابك للتسجيل التلقائي",
      en: "Invite link — share it with students to auto-enroll them",
    },
    copyLink: { ar: "نسخ الرابط", en: "Copy link" },
    linkCopied: { ar: "تم النسخ ✅", en: "Copied ✅" },
    inviteCodeInvalid: {
      ar: "رابط الدعوة غير صالح أو انتهت صلاحيته.",
      en: "This invite link is invalid or has expired.",
    },
    manageSessions: { ar: "إدارة المحاضرات المباشرة", en: "Manage live sessions" },
    noModulesYet: { ar: "لا وحدات بعد — أضف أول وحدة لدورتك.", en: "No modules yet — add your course's first module." },
    moduleTitlePlaceholder: { ar: "عنوان الوحدة", en: "Module title" },
    addModule: { ar: "إضافة وحدة", en: "Add module" },
    addingModule: { ar: "جارِ الإضافة...", en: "Adding..." },
    noLessonsYet: { ar: "لا دروس بعد في هذه الوحدة.", en: "No lessons in this module yet." },
    addLesson: { ar: "إضافة درس", en: "Add lesson" },
    addLessonSubmit: { ar: "حفظ الدرس", en: "Save lesson" },
    addingLesson: { ar: "جارِ الحفظ...", en: "Saving..." },
    lessonTitleArPlaceholder: { ar: "عنوان الدرس (عربي)", en: "Lesson title (Arabic)" },
    lessonTitleEnPlaceholder: { ar: "عنوان الدرس (إنجليزي، اختياري)", en: "Lesson title (English, optional)" },
    lessonBodyArPlaceholder: { ar: "محتوى الدرس (عربي)", en: "Lesson body (Arabic)" },
    lessonBodyEnPlaceholder: { ar: "محتوى الدرس (إنجليزي، اختياري)", en: "Lesson body (English, optional)" },
    lessonVideoUrlPlaceholder: { ar: "رابط فيديو (اختياري)", en: "Video URL (optional)" },
    sessionsTitle: { ar: "المحاضرات المباشرة", en: "Live sessions" },
    noSessionsYet: { ar: "لا محاضرات مجدولة بعد.", en: "No sessions scheduled yet." },
    scheduleSessionTitle: { ar: "جدولة محاضرة جديدة", en: "Schedule a new session" },
    sessionTitlePlaceholder: { ar: "عنوان المحاضرة", en: "Session title" },
    meetingLinkPlaceholder: { ar: "رابط الاجتماع (Zoom, Meet...)", en: "Meeting link (Zoom, Meet...)" },
    scheduling: { ar: "جارِ الجدولة...", en: "Scheduling..." },
    scheduleSessionSubmit: { ar: "جدولة المحاضرة", en: "Schedule session" },
    minutesShort: { ar: "د", en: "min" },

    curriculumSectionTitle: { ar: "المساهمة في منهج WOW المشترك", en: "Contribute to WOW's shared curriculum" },
    curriculumSectionHint: {
      ar: "اقترح درسًا لدورات WOW المنشورة — يخضع للمراجعة قبل ظهوره للطلاب، بخلاف دورتك الخاصة.",
      en: "Propose a lesson for WOW's published courses — it goes through review before students see it, unlike your own personal course.",
    },
    lessonProposalSubmitted: {
      ar: "أُرسل اقتراحك — بانتظار المراجعة قبل النشر.",
      en: "Your proposal was submitted — awaiting review before publishing.",
    },
    noSharedCourses: { ar: "لا توجد دورات WOW مشتركة حاليًا.", en: "No shared WOW courses right now." },
    suggestLessonCta: { ar: "اقترح درسًا جديدًا", en: "Suggest a new lesson" },
    suggestLessonModule: { ar: "الوحدة", en: "Module" },
    suggestTitleEnPlaceholder: { ar: "عنوان الدرس (إنجليزي)", en: "Lesson title (English)" },
    suggestBodyEnPlaceholder: { ar: "محتوى الدرس (إنجليزي)", en: "Lesson body (English)" },
    vocabularyLabel: { ar: "مفردات الدرس (5 أزواج)", en: "Lesson vocabulary (5 pairs)" },
    vocabArPlaceholder: { ar: "عربي", en: "Arabic" },
    vocabEnPlaceholder: { ar: "إنجليزي", en: "English" },
    toolboxOptionalLabel: { ar: "صندوق أدوات (اختياري)", en: "Toolbox (optional)" },
    toolboxArPlaceholder: { ar: "صندوق الأدوات (عربي)", en: "Toolbox (Arabic)" },
    toolboxEnPlaceholder: { ar: "صندوق الأدوات (إنجليزي)", en: "Toolbox (English)" },
    submittingLesson: { ar: "جارِ الإرسال...", en: "Submitting..." },
    submitLessonProposal: { ar: "إرسال الاقتراح", en: "Submit proposal" },

    reviewQueueLink: { ar: "طابور مراجعة المنهج", en: "Curriculum review queue" },
    reviewQueueTitle: { ar: "طابور مراجعة المنهج المشترك", en: "Shared curriculum review queue" },
    reviewQueueEmpty: { ar: "لا دروس بانتظار المراجعة حاليًا.", en: "No lessons awaiting review right now." },
    reviewOnly: {
      ar: "هذه الصفحة مخصّصة لمن يملك قدرة أستاذ أو مقيّم، أو صلاحية إدارة المحتوى.",
      en: "This page is for instructors, assessors, or content administrators only.",
    },
    finalizerHint: {
      ar: "قرارك هنا نهائي وحاسم — لا يعتمد على تصويت الأقران.",
      en: "Your decision here is final and decisive — it doesn't depend on peer votes.",
    },
    submittedBy: { ar: "مُقترَح من", en: "Proposed by" },
    reviewStatusLabel: { ar: "الحالة", en: "Status" },
    reviewStatus_nova_check_pending: { ar: "بانتظار الفحص الآلي", en: "Awaiting automated check" },
    reviewStatus_nova_check_failed: { ar: "فشل الفحص الآلي", en: "Automated check failed" },
    reviewStatus_human_review: { ar: "بانتظار المراجعة البشرية", en: "Awaiting human review" },
    reviewStatus_approved: { ar: "معتمَد", en: "Approved" },
    reviewStatus_rejected: { ar: "مرفوض", en: "Rejected" },
    finalApprove: { ar: "اعتماد نهائي", en: "Final approve" },
    finalReject: { ar: "رفض نهائي", en: "Final reject" },
    finalNeedsRevision: { ar: "يحتاج تعديلًا", en: "Needs revision" },
  },

  admin: {
    pricingTitle: { ar: "إدارة التسعير", en: "Pricing management" },
    pricingIntro: {
      ar: "الأسعار هنا هي المصدر المعتمد الوحيد — أي تغيير يسري فورًا على العرض وعلى الخصم الفعلي في كل المنصة.",
      en: "These prices are the single source of truth — a change applies immediately to both display and actual charging across the platform.",
    },
    pricingUnitsHeading: { ar: "أسعار الإجراءات (كوينز)", en: "Action prices (coins)" },
    coinPackagesHeading: { ar: "باقات شراء الكوينز (دولار)", en: "Coin packages (USD)" },
    pricingKeyCol: { ar: "المفتاح", en: "Key" },
    pricingLabelCol: { ar: "الوصف", en: "Description" },
    pricingCurrentCol: { ar: "السعر الحالي", en: "Current price" },
    pricingNewCol: { ar: "السعر الجديد", en: "New price" },
    pricingSave: { ar: "حفظ", en: "Save" },
    pricingSaving: { ar: "جارِ الحفظ...", en: "Saving..." },
    pricingSaved: { ar: "تم الحفظ ✅", en: "Saved ✅" },
    pricingSaveFailed: { ar: "تعذّر الحفظ", en: "Couldn't save" },
    packageCoinsCol: { ar: "عدد الكوينز", en: "Coins" },
    packageNameCol: { ar: "الباقة", en: "Package" },
    noPermission: {
      ar: "هذه الصفحة مخصّصة لمن يملك صلاحية تعديل الأسعار (finance.edit_rates) فقط.",
      en: "This page is for holders of the rate-editing permission (finance.edit_rates) only.",
    },
    rolesTitle: { ar: "إدارة الأدوار", en: "Role management" },
    rolesIntro: {
      ar: "تغيير الدور يمنح أو يسحب صلاحيات فعلية فورًا، ويُسجَّل كل تغيير في سجل التدقيق.",
      en: "Changing a role grants or withdraws real permissions immediately, and every change is written to the audit log.",
    },
    rolesRoleCol: { ar: "الدور", en: "Role" },
    rolesSave: { ar: "حفظ", en: "Save" },
    rolesSaving: { ar: "جارِ الحفظ...", en: "Saving..." },
    rolesSaved: { ar: "تم الحفظ ✅", en: "Saved ✅" },
    rolesSaveFailed: { ar: "تعذّر الحفظ", en: "Couldn't save" },
    rolesYou: { ar: "أنت", en: "you" },
    rolesNoPermission: {
      ar: "هذه الصفحة مخصّصة لمن يملك صلاحية تعيين الأدوار (roles.assign) أو صلاحية إدارة المستخدمين (users.manage).",
      en: "This page is for holders of the role-assignment permission (roles.assign) or the user-management permission (users.manage).",
    },
    rolesSectionHeading: { ar: "الأدوار", en: "Roles" },
    capabilitiesSectionHeading: { ar: "قدرات تحتاج ثقة", en: "Trust-gated capabilities" },
    capabilitiesIntro: {
      ar: "أستاذ/مدرب، موجّه، ومقيّم لا يمكن تفعيلها ذاتيًا — المنح هنا فقط، ويُسجَّل في سجل التدقيق.",
      en: "Instructor, mentor, and assessor can't be self-activated — granting them only happens here, and is written to the audit log.",
    },
    capabilitiesGranting: { ar: "جارِ المنح...", en: "Granting..." },
    capabilitiesGranted: { ar: "تم المنح ✅", en: "Granted ✅" },
    capabilitiesGrantFailed: { ar: "تعذّر المنح", en: "Couldn't grant" },

    contentNoPermission: {
      ar: "هذه الصفحة مخصّصة لمن يملك صلاحية إدارة المحتوى (content.manage).",
      en: "This page is for holders of the content-management permission (content.manage) only.",
    },
    contentPmpTitle: { ar: "إدارة محتوى PMP", en: "PMP content management" },
    contentPmpIntro: {
      ar: "كل تعديل يُحفظ كمسودة أولًا — المحتوى الحي (الدروس، السيناريوهات، الشارات) لا يتأثر إلا بعد ضغط \"نشر\" صريح.",
      en: "Every edit is saved as a draft first — live content (lessons, scenarios, badges) is unaffected until you explicitly click Publish.",
    },
    contentEnglishTitle: { ar: "إدارة المحتوى الإنجليزي", en: "English content management" },
    contentEnglishIntro: {
      ar: "قواعد اللغة ومهام الكتابة الإنجليزية جزء من نفس دروس PMP — هذه الشاشة عرض مركّز على حقلَي القواعد ومهمة اللغة فقط، بنفس آلية المسودة/النشر.",
      en: "English grammar and writing-task content lives inside the same PMP lessons — this screen is a focused view on just the grammar and language-task fields, with the same draft/publish flow.",
    },
    contentInvalidJson: { ar: "صيغة JSON غير صحيحة", en: "Invalid JSON" },
    contentInvalidScore: { ar: "الدرجة يجب أن تكون رقمًا بين 0 و100", en: "Score must be a number between 0 and 100" },
    contentSaveFailed: { ar: "تعذّر الحفظ", en: "Couldn't save" },
    contentPublishFailed: { ar: "تعذّر النشر", en: "Couldn't publish" },
    contentSaving: { ar: "جارِ الحفظ...", en: "Saving..." },
    contentSaveDraft: { ar: "حفظ كمسودة", en: "Save as draft" },
    contentPublish: { ar: "نشر", en: "Publish" },
    contentPublishing: { ar: "جارِ النشر...", en: "Publishing..." },
    contentPublished: { ar: "تم النشر ✅", en: "Published ✅" },
    contentDraftSaved: { ar: "تم حفظ المسودة ✅", en: "Draft saved ✅" },
    contentPendingDraft: { ar: "مسودة قيد الانتظار", en: "Pending draft" },
    contentPendingDelete: { ar: "حذف قيد الانتظار", en: "Pending delete" },
    contentEdit: { ar: "تعديل", en: "Edit" },
    contentDelete: { ar: "حذف", en: "Delete" },
    contentCancel: { ar: "إلغاء", en: "Cancel" },

    contentScenariosHeading: { ar: "السيناريوهات (Final Boss وغيرها)", en: "Scenarios (Final Boss and others)" },
    contentNewScenario: { ar: "+ سيناريو جديد", en: "+ New scenario" },
    contentTitleAr: { ar: "العنوان (عربي)", en: "Title (Arabic)" },
    contentTitleEn: { ar: "العنوان (إنجليزي)", en: "Title (English)" },
    contentContextAr: { ar: "السياق (عربي)", en: "Context (Arabic)" },
    contentContextEn: { ar: "السياق (إنجليزي)", en: "Context (English)" },
    contentChoicesJson: { ar: "الاختيارات (JSON)", en: "Choices (JSON)" },

    contentScoringRulesHeading: { ar: "قواعد التصحيح", en: "Scoring rules" },
    contentFeedbackAr: { ar: "الملاحظة (عربي)", en: "Feedback (Arabic)" },
    contentFeedbackEn: { ar: "الملاحظة (إنجليزي)", en: "Feedback (English)" },

    contentBadgesHeading: { ar: "الشارات", en: "Badges" },
    contentNewBadge: { ar: "+ شارة جديدة", en: "+ New badge" },
    contentBadgeName: { ar: "اسم الشارة", en: "Badge name" },
    contentBadgeDescription: { ar: "الوصف", en: "Description" },
    contentBadgeIcon: { ar: "الأيقونة (إيموجي)", en: "Icon (emoji)" },

    contentLessonsPmpHeading: { ar: "محتوى الدروس", en: "Lesson content" },
    contentLessonsEnglishHeading: { ar: "قواعد اللغة ومهمة الكتابة لكل درس", en: "Grammar point and writing task per lesson" },
    contentSelectModule: { ar: "اختر وحدة", en: "Select a module" },
    contentSelectLesson: { ar: "اختر درسًا", en: "Select a lesson" },
    contentLessonNotFound: { ar: "تعذّر تحميل الدرس", en: "Couldn't load the lesson" },
    contentReviewStatus: { ar: "حالة المراجعة", en: "Review status" },
    contentFullJson: { ar: "محتوى الدرس الكامل (JSON)", en: "Full lesson content (JSON)" },
    contentGrammarPointJson: { ar: "القاعدة النحوية (JSON)", en: "Grammar point (JSON)" },
    contentLanguageTaskJson: { ar: "مهمة الكتابة (JSON)", en: "Language task (JSON)" },
  },
} as const;

export type Dictionary = typeof dictionary;
