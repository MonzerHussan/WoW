import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { listUsersForRoleAssignment, listUserCapabilities } from "@/shared/services/roles.service";
import { AdminRolesPageContent } from "@/features/admin/components/AdminRolesPageContent";

/**
 * Same shape as /admin/pricing (024): permission check before any data
 * is fetched, before any markup is produced. The real boundary is in
 * the database — 031 gives `assign_role` its own `has_permission`
 * check and gates the profiles list-read on the same permission — so
 * bypassing this page buys nothing. Deliberately `roles.assign`, not
 * `finance.edit_rates`: role assignment and pricing are unrelated
 * privileges that happen to both currently belong to admin/super_admin.
 *
 * Extended (034) with a second, independently-gated section for
 * instructor/mentor/assessor capability grants — reusing this page
 * rather than a new one, since both sections are "who gets to do what"
 * decisions for the same user list. Gated on `users.manage`, not
 * `roles.assign` — an unrelated permission that happens to be held by
 * the same two roles today (034's own comment on why the profiles read
 * policy checks both).
 */
export default async function AdminRolesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/admin/roles");

  const [{ data: canAssignRoles }, { data: canManageCapabilities }] = await Promise.all([
    supabase.rpc("has_permission", { perm: "roles.assign" }),
    supabase.rpc("has_permission", { perm: "users.manage" }),
  ]);

  if (!canAssignRoles && !canManageCapabilities) {
    return (
      <main
        dir={initialLang === "ar" ? "rtl" : "ltr"}
        className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center"
      >
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("admin.rolesNoPermission", initialLang)}</p>
      </main>
    );
  }

  const users = await listUsersForRoleAssignment(supabase);
  const [{ data: canAssignSuper }, capabilitiesByUser] = await Promise.all([
    canAssignRoles
      ? supabase.rpc("has_permission", { perm: "roles.assign_super" })
      : Promise.resolve({ data: false }),
    canManageCapabilities ? listUserCapabilities(supabase) : Promise.resolve({}),
  ]);

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <AdminRolesPageContent
        users={users}
        currentUserId={user.id}
        canAssignRoles={!!canAssignRoles}
        canAssignSuper={!!canAssignSuper}
        canManageCapabilities={!!canManageCapabilities}
        capabilitiesByUser={capabilitiesByUser}
        initialLang={initialLang}
      />
    </main>
  );
}
