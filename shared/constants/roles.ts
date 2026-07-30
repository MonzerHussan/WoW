import { AppRole } from "@/shared/types";

/**
 * Every role in app_role (002 base three + 003's staff roles + 015a's
 * content_manager), for the /admin/roles dropdown. Order matches
 * RBAC.md's Layer 1 table, ascending privilege within each track.
 */
export const APP_ROLES: { value: AppRole; ar: string; en: string }[] = [
  { value: "user", ar: "مستخدم", en: "User" },
  { value: "moderator", ar: "مشرف محتوى", en: "Moderator" },
  { value: "support_agent", ar: "دعم فني", en: "Support agent" },
  { value: "support_lead", ar: "قائد دعم فني", en: "Support lead" },
  { value: "accountant", ar: "محاسب", en: "Accountant" },
  { value: "finance_manager", ar: "مدير مالي", en: "Finance manager" },
  { value: "tech_support", ar: "دعم تقني", en: "Tech support" },
  { value: "content_manager", ar: "مدير محتوى", en: "Content manager" },
  { value: "admin", ar: "مدير", en: "Admin" },
  { value: "super_admin", ar: "مدير أعلى", en: "Super admin" },
];

export function getRoleLabel(role: AppRole, lang: "ar" | "en" = "ar") {
  const found = APP_ROLES.find((r) => r.value === role);
  return found ? (lang === "ar" ? found.ar : found.en) : role;
}
