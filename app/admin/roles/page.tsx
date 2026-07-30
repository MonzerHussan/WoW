import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { listUsersForRoleAssignment, listUserCapabilities } from "@/shared/services/roles.service";
import { RolesAdminView } from "@/features/admin/components/RolesAdminView";
import { CapabilitiesAdminView } from "@/features/admin/components/CapabilitiesAdminView";

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
  const lang = "ar" as const;

  if (!user) redirect("/login?redirectedFrom=/admin/roles");

  const [{ data: canAssignRoles }, { data: canManageCapabilities }] = await Promise.all([
    supabase.rpc("has_permission", { perm: "roles.assign" }),
    supabase.rpc("has_permission", { perm: "users.manage" }),
  ]);

  if (!canAssignRoles && !canManageCapabilities) {
    return (
      <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center">
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("admin.rolesNoPermission", lang)}</p>
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
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto flex flex-col gap-12">
      <div>
        <Logo className="h-8 mb-6" />
        <h1 className="font-display font-black text-2xl text-navy mb-2">{t("admin.rolesTitle", lang)}</h1>
        <p className="text-sm text-ink-soft leading-relaxed">{t("admin.rolesIntro", lang)}</p>
      </div>

      {canAssignRoles && (
        <section>
          <h2 className="font-display font-bold text-navy mb-3">{t("admin.rolesSectionHeading", lang)}</h2>
          <RolesAdminView users={users} currentUserId={user.id} canAssignSuper={!!canAssignSuper} lang={lang} />
        </section>
      )}

      {canManageCapabilities && (
        <section>
          <h2 className="font-display font-bold text-navy mb-3">{t("admin.capabilitiesSectionHeading", lang)}</h2>
          <p className="text-xs text-ink-soft mb-3">{t("admin.capabilitiesIntro", lang)}</p>
          <CapabilitiesAdminView users={users} capabilitiesByUser={capabilitiesByUser} lang={lang} />
        </section>
      )}
    </main>
  );
}
