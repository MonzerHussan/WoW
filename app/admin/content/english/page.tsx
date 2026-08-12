import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { listSharedCourses } from "@/shared/services/lesson-content.service";
import { AdminContentPageContent } from "@/features/admin/components/AdminContentPageContent";

/**
 * Same content.manage gate as /admin/content/pmp — the split between
 * the two routes is organizational only (owner's decision): English
 * teaching content (grammar_point/language_task) lives inside the same
 * `lessons.content` rows as PMP content, there is no separate English
 * data domain to scope a different permission to.
 */
export default async function AdminContentEnglishPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/admin/content/english");

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

  const courses = await listSharedCourses(supabase);

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-4xl mx-auto">
      <AdminContentPageContent scope="english" courses={courses} ruleScopes={[]} initialLang={initialLang} />
    </main>
  );
}
