"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { AppShell } from "@/shared/components/AppShell";
import { CourseCatalog } from "@/features/lms/components/CourseCatalog";
import { CourseSummary } from "@/features/lms/services/course.service";

/**
 * The interactive half of /courses (035) — the page (server) fetches
 * the catalog and resolves the agent state, this owns
 * useLang(initialLang)/LangToggle. CourseCatalog itself stays a plain
 * function component (no "use client" needed — it has no hooks of its
 * own), just re-rendered with a fresh `lang` prop whenever this toggles.
 *
 * This page is public (middleware doesn't gate it) — `shell` is null for
 * a signed-out visitor, who gets the plain pre-existing header instead
 * of the signed-in 6-screen AppShell (wallet/nav/logout make no sense
 * without a session).
 */
export function CoursesPageContent({
  courses,
  initialLang,
  shell,
}: {
  courses: CourseSummary[];
  initialLang: Lang;
  shell: { walletBalance: number; agentChosenName: string } | null;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  const body = (
    <>
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("lms.catalogTitle")}</h1>
      <CourseCatalog courses={courses} lang={lang} />
    </>
  );

  if (shell) {
    return (
      <AppShell
        active="course"
        walletBalance={shell.walletBalance}
        agentChosenName={shell.agentChosenName}
        lang={lang}
        dir={dir}
        onLangChange={setLang}
      >
        <main className="min-h-screen px-5 py-10 max-w-6xl mx-auto">{body}</main>
      </AppShell>
    );
  }

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      {body}
    </div>
  );
}
