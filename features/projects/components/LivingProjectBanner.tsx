"use client";

import Link from "next/link";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card } from "@/shared/components/Feedback";

/**
 * The only "moment of birth" trigger point (037) — no first-course-visit
 * hook exists anywhere in the app (verified before building this), so
 * this banner on the course page is the pragmatic stand-in the design
 * doc itself allowed for. Always visible, never dismissed: the owner's
 * decision was multiple paid projects with no cap, so "New project"
 * stays live the same way it did before the first one existed — this
 * isn't a first-run-only banner that disappears, it just changes tone
 * once the trainee already has at least one.
 */
export function LivingProjectBanner({ lang, projectCount }: { lang: Lang; projectCount: number }) {
  return (
    <Card className="p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        {projectCount === 0 ? (
          <>
            <p className="font-display font-bold text-navy text-sm mb-1">{t("projects.bannerTitleFirst", lang)}</p>
            <p className="text-sm text-ink-soft">{t("projects.bannerBodyFirst", lang)}</p>
          </>
        ) : (
          <Link href="/project" className="text-sm font-bold text-navy hover:underline">
            {t("projects.myProjectsLink", lang)} ({projectCount})
          </Link>
        )}
      </div>
      <Link
        href="/project/new"
        className="shrink-0 rounded-xl bg-navy text-white px-4 py-2 text-sm font-bold text-center hover:bg-navy-soft transition"
      >
        {t("projects.newProjectCta", lang)}
      </Link>
    </Card>
  );
}
