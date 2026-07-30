import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { listUsersForRoleAssignment } from "@/shared/services/roles.service";
import { RolesAdminView } from "@/features/admin/components/RolesAdminView";

/**
 * Same shape as /admin/pricing (024): permission check before any data
 * is fetched, before any markup is produced. The real boundary is in
 * the database — 031 gives `assign_role` its own `has_permission`
 * check and gates the profiles list-read on the same permission — so
 * bypassing this page buys nothing. Deliberately `roles.assign`, not
 * `finance.edit_rates`: role assignment and pricing are unrelated
 * privileges that happen to both currently belong to admin/super_admin.
 */
export default async function AdminRolesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) redirect("/login?redirectedFrom=/admin/roles");

  const { data: canAssignRoles } = await supabase.rpc("has_permission", { perm: "roles.assign" });

  if (!canAssignRoles) {
    return (
      <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center">
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("admin.rolesNoPermission", lang)}</p>
      </main>
    );
  }

  const { data: canAssignSuper } = await supabase.rpc("has_permission", { perm: "roles.assign_super" });
  const users = await listUsersForRoleAssignment(supabase);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <Logo className="h-8 mb-6" />
      <h1 className="font-display font-black text-2xl text-navy mb-2">{t("admin.rolesTitle", lang)}</h1>
      <p className="text-sm text-ink-soft mb-8 leading-relaxed">{t("admin.rolesIntro", lang)}</p>
      <RolesAdminView users={users} currentUserId={user.id} canAssignSuper={!!canAssignSuper} lang={lang} />
    </main>
  );
}
