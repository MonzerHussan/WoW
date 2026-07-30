/** Mirrors the `user_capability` enum (migration 003). */
export type UserCapability =
  | "job_seeker"
  | "freelancer"
  | "client"
  | "learner"
  | "instructor"
  | "mentor"
  | "assessor";

export const CAPABILITIES: { value: UserCapability; ar: string; en: string; icon: string }[] = [
  { value: "learner", ar: "متعلّم", en: "Learner", icon: "📘" },
  { value: "job_seeker", ar: "باحث عن عمل", en: "Job Seeker", icon: "🔍" },
  { value: "freelancer", ar: "مستقل / فريلانسر", en: "Freelancer", icon: "💻" },
  { value: "client", ar: "صاحب مشروع", en: "Client", icon: "🧾" },
  { value: "instructor", ar: "مدرّب", en: "Instructor", icon: "🧑‍🏫" },
  { value: "mentor", ar: "موجّه مهني", en: "Mentor", icon: "🧭" },
  { value: "assessor", ar: "مقيّم", en: "Assessor", icon: "✅" },
];

/**
 * The only four a user can grant themselves (034's RLS split) — they
 * only ever grant authority over the caller's own data. instructor/
 * mentor/assessor require a staff grant (grant_capability, /admin/roles)
 * and are deliberately excluded here so self-service UI never offers an
 * option that RLS will now refuse.
 */
export const SELF_SERVICE_CAPABILITIES = CAPABILITIES.filter((c) =>
  (["learner", "job_seeker", "freelancer", "client"] as UserCapability[]).includes(c.value)
);

export function getCapabilityLabel(value: string, lang: "ar" | "en" = "ar") {
  const found = CAPABILITIES.find((c) => c.value === value);
  if (!found) return { label: value, icon: "🔧" };
  return { label: lang === "ar" ? found.ar : found.en, icon: found.icon };
}
