"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { CourseCatalog } from "@/features/lms/components/CourseCatalog";
import { CourseSummary } from "@/features/lms/services/course.service";

/**
 * The interactive half of /courses (035) — the page (server) fetches
 * the catalog and resolves the agent state, this owns
 * useLang(initialLang)/LangToggle. CourseCatalog itself stays a plain
 * function component (no "use client" needed — it has no hooks of its
 * own), just re-rendered with a fresh `lang` prop whenever this toggles.
 */
export function CoursesPageContent({
  courses,
  initialLang,
}: {
  courses: CourseSummary[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("lms.catalogTitle")}</h1>
      <CourseCatalog courses={courses} lang={lang} />
    </div>
  );
}
