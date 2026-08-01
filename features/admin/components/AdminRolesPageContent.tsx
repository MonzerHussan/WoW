"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { RolesAdminView } from "@/features/admin/components/RolesAdminView";
import { CapabilitiesAdminView } from "@/features/admin/components/CapabilitiesAdminView";
import { RoleAssignmentRow } from "@/shared/services/roles.service";

/** TECH_DEBT #27 (full migration group) — same shape as AdminPricingPageContent. */
export function AdminRolesPageContent({
  users,
  currentUserId,
  canAssignRoles,
  canAssignSuper,
  canManageCapabilities,
  capabilitiesByUser,
  initialLang,
}: {
  users: RoleAssignmentRow[];
  currentUserId: string;
  canAssignRoles: boolean;
  canAssignSuper: boolean;
  canManageCapabilities: boolean;
  capabilitiesByUser: Record<string, string[]>;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir} className="flex flex-col gap-12">
      <div>
        <div className="flex items-center justify-between mb-6">
          <Logo className="h-8" />
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <h1 className="font-display font-black text-2xl text-navy mb-2">{t("admin.rolesTitle")}</h1>
        <p className="text-sm text-ink-soft leading-relaxed">{t("admin.rolesIntro")}</p>
      </div>

      {canAssignRoles && (
        <section>
          <h2 className="font-display font-bold text-navy mb-3">{t("admin.rolesSectionHeading")}</h2>
          <RolesAdminView users={users} currentUserId={currentUserId} canAssignSuper={canAssignSuper} lang={lang} />
        </section>
      )}

      {canManageCapabilities && (
        <section>
          <h2 className="font-display font-bold text-navy mb-3">{t("admin.capabilitiesSectionHeading")}</h2>
          <p className="text-xs text-ink-soft mb-3">{t("admin.capabilitiesIntro")}</p>
          <CapabilitiesAdminView users={users} capabilitiesByUser={capabilitiesByUser} lang={lang} />
        </section>
      )}
    </div>
  );
}
