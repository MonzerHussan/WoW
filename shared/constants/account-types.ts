import { AccountType } from "@/shared/types";

export const ACCOUNT_TYPES: { value: AccountType; ar: string; en: string; icon: string }[] = [
  { value: "student", ar: "طالب", en: "Student", icon: "🧑‍🎓" },
  { value: "job_seeker", ar: "باحث عن عمل", en: "Job Seeker", icon: "🔍" },
  { value: "freelancer", ar: "مستقل / فريلانسر", en: "Freelancer", icon: "💻" },
  { value: "employee", ar: "موظف", en: "Employee", icon: "👔" },
  { value: "instructor", ar: "أستاذ / مدرب", en: "Instructor / Trainer", icon: "🧑‍🏫" },
  { value: "company", ar: "شركة", en: "Company", icon: "🏢" },
  { value: "institute", ar: "معهد تدريبي", en: "Training Institute", icon: "🎓" },
];

export function getAccountTypeLabel(type: AccountType, lang: "ar" | "en" = "ar") {
  const found = ACCOUNT_TYPES.find((a) => a.value === type);
  if (!found) return { label: type, icon: "👤" };
  return { label: lang === "ar" ? found.ar : found.en, icon: found.icon };
}
