"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { ReactElement, cloneElement, isValidElement } from "react";
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
  instructorQueueSlot,
}: {
  users: RoleAssignmentRow[];
  currentUserId: string;
  canAssignRoles: boolean;
  canAssignSuper: boolean;
  canManageCapabilities: boolean;
  capabilitiesByUser: Record<string, string[]>;
  initialLang: Lang;
  /**
   * The instructor review queue, supplied by the PAGE rather than
   * imported here. A feature may not import from a sibling feature
   * (CLAUDE.md #1) and that queue lives in features/instructors — so
   * app/admin/roles/page.tsx composes the two, which is what app/ is
   * for.
   *
   * An ELEMENT whose `lang` is overridden live via cloneElement below,
   * not a function of `lang`. Two constraints meet here and only this
   * shape satisfies both: a Server Component cannot pass a plain
   * function to a Client Component prop (Next.js rejects it at runtime,
   * and neither tsc nor next build catches it — this page returned 500
   * until it was changed), while a plain node would freeze at the
   * server-rendered language and stop following this page's toggle —
   * the independent-useLang problem TECH_DEBT #18/#27 records. Same
   * pattern, and the same two reasons, as ProjectWorkspace's `gamesSlot`
   * and AssessmentsContent's `placementSlot`.
   */
  instructorQueueSlot?: ReactElement<{ lang: Lang }>;
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

      {/* Third independently-gated section, same reasoning 034 used for
          the second: approving an instructor is another "who gets to do
          what" decision about the same user list, so it belongs on this
          page rather than a new one. Gated on users.manage — and the
          real gate is inside review_instructor_application() (078). */}
      {canManageCapabilities &&
        instructorQueueSlot &&
        isValidElement(instructorQueueSlot) &&
        cloneElement(instructorQueueSlot, { lang })}
    </div>
  );
}
