import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { listSharedCourses } from "@/shared/services/lesson-content.service";
import { listKbRuleScopes } from "@/shared/services/content-draft.service";
import { AdminContentPageContent } from "@/features/admin/components/AdminContentPageContent";

/**
 * Same shape as /admin/roles and /admin/pricing: permission check
 * before any data fetch, before any markup. The real boundary is in
 * the database (062/063's RLS + SECURITY DEFINER functions) — this
 * page-level check is UX only.
 */
export default async function AdminContentPmpPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/admin/content/pmp");

  const { data: canManage } = await supabase.rpc("has_permission", { perm: "content.manage" });

  if (!canManage) {
    return (
      <main
        dir={initialLang === "ar" ? "rtl" : "ltr"}
        className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center"
      >
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("admin.contentNoPermission", initialLang)}</p>
      </main>
    );
  }

  const [courses, ruleScopeRows] = await Promise.all([listSharedCourses(supabase), listKbRuleScopes(supabase)]);

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-4xl mx-auto">
      <AdminContentPageContent
        scope="pmp"
        courses={courses}
        ruleScopes={ruleScopeRows.map((r) => r.rule_scope)}
        initialLang={initialLang}
      />
    </main>
  );
}
