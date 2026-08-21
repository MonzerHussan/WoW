import { AccountType } from "@/shared/types";

export const GOALS: Record<AccountType, { value: string; ar: string; en: string }[]> = {
  student: [
    { value: "explore_career", ar: "استكشاف مسار مهني مناسب لي", en: "Explore a suitable career path" },
    { value: "build_skills", ar: "بناء مهارات أساسية مبكرًا", en: "Build core skills early" },
    { value: "first_internship", ar: "الحصول على أول تدريب", en: "Land my first internship" },
  ],
  job_seeker: [
    { value: "first_job", ar: "الحصول على أول وظيفة", en: "Land my first job" },
    { value: "switch_field", ar: "التحول لمجال جديد", en: "Switch to a new field" },
    { value: "interview_ready", ar: "الاستعداد لمقابلات العمل", en: "Get interview-ready" },
  ],
  freelancer: [
    { value: "more_projects", ar: "زيادة عدد المشاريع الحرة", en: "Get more freelance projects" },
    { value: "build_portfolio", ar: "بناء محفظة أعمال موثّقة", en: "Build a verified portfolio" },
    { value: "raise_rates", ar: "رفع أسعار خدماتي", en: "Raise my rates" },
  ],
  employee: [
    { value: "next_promotion", ar: "الحصول على الترقية القادمة", en: "Earn my next promotion" },
    { value: "new_certs", ar: "الحصول على شهادات متقدمة", en: "Earn advanced certifications" },
    { value: "lead_team", ar: "قيادة فريق عمل", en: "Lead a team" },
  ],
  instructor: [
    { value: "publish_courses", ar: "نشر دوراتي التدريبية على المنصة", en: "Publish my courses on the platform" },
    { value: "grow_audience", ar: "الوصول لمتدربين أكثر", en: "Reach more learners" },
    { value: "earn_teaching", ar: "بناء دخل من التدريب", en: "Build income from teaching" },
  ],
  company: [
    { value: "hire_talent", ar: "توظيف كفاءات مؤهلة", en: "Hire qualified talent" },
    { value: "train_staff", ar: "تدريب وتطوير الموظفين الحاليين", en: "Train and develop current staff" },
    { value: "build_pipeline", ar: "بناء خط توظيف مستمر", en: "Build a continuous hiring pipeline" },
  ],
  institute: [
    { value: "offer_programs", ar: "تقديم برامجنا التدريبية للمنصة", en: "Offer our training programs on the platform" },
    { value: "manage_instructors", ar: "إدارة مدربي المعهد ودوراتهم", en: "Manage our instructors and their courses" },
    { value: "certify_learners", ar: "إصدار شهادات معتمدة للمتدربين", en: "Issue accredited certificates to learners" },
  ],
};

export const GENDERS: { value: "male" | "female" | "prefer_not_to_say"; ar: string; en: string }[] = [
  { value: "male", ar: "ذكر", en: "Male" },
  { value: "female", ar: "أنثى", en: "Female" },
  { value: "prefer_not_to_say", ar: "أفضل عدم القول", en: "Prefer not to say" },
];

/**
 * Only levels that EXIST as published courses may appear here. Offering a
 * level with no content makes onboarding promise something the platform
 * cannot deliver, and the user meets the gap a minute later with no
 * explanation.
 *
 * Level 4 (PMP Master) has NO course row at all — found by walking the
 * journey end to end as a fresh user on 2026-08-20. It is marked
 * `available: false` rather than deleted, deliberately: the choice is
 * persisted as `profiles.pmp_level_interest`, and ONE REAL ACCOUNT has
 * already stored 4. Deleting the entry would leave that value with no
 * label to resolve to, so the row is kept for lookup and withheld from
 * the choices.
 *
 * Levels 2 and 3 DO exist and are published, so they stay — even though
 * each currently carries 8 lessons against Level 1's 19. Thin content in
 * a real course, not a missing one.
 *
 * When Level 4 ships, flip this flag in the same commit as its course.
 */
export const PMP_LEVELS = [
  { value: 1, ar: "المستوى 1 — أساسيات إدارة المشاريع", en: "Level 1 — PM Foundations", available: true },
  { value: 2, ar: "المستوى 2 — PMP Practitioner", en: "Level 2 — PMP Practitioner", available: true },
  { value: 3, ar: "المستوى 3 — PMP Professional", en: "Level 3 — PMP Professional", available: true },
  { value: 4, ar: "المستوى 4 — PMP Master", en: "Level 4 — PMP Master", available: false },
];

/** The levels a user may actually pick. Always use this to render choices;
 *  use PMP_LEVELS itself only to resolve a stored value to its label. */
export const SELECTABLE_PMP_LEVELS = PMP_LEVELS.filter((l) => l.available);
