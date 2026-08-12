"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { AppShell } from "@/shared/components/AppShell";
import { CourseDetailView } from "@/features/lms/components/CourseDetailView";
import { CourseDetail } from "@/features/lms/services/course.service";
import { UpcomingLiveSession } from "@/features/lms/services/live-session.service";

/**
 * The interactive half of /courses/[id] (035) — same split as
 * CoursesPageContent for the catalog page.
 *
 * The LivingProjectBanner/GamesUnlockBanner that used to live here
 * (037/038) are gone as of the navigation restructuring: Projects and
 * Games are now permanent top-level screens in AppShell's own nav,
 * always reachable, so a promotional banner surfacing them from inside
 * the course page is redundant rather than helpful.
 */
export function CourseDetailPageContent({
  course,
  userId,
  liveSessions,
  initialLang,
  shell,
}: {
  course: CourseDetail;
  userId: string | null;
  liveSessions: UpcomingLiveSession[];
  initialLang: Lang;
  /** null for a signed-out visitor — this page is public. */
  shell: { walletBalance: number; agentChosenName: string } | null;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  const body = (
    <>
      <Link href="/courses" className="text-sm text-ink-soft hover:text-navy mb-6 inline-block">
        ← {t("lms.backToCatalog")}
      </Link>
      <CourseDetailView course={course} userId={userId} lang={lang} liveSessions={liveSessions} />
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
        <main className="min-h-screen px-5 py-10 max-w-4xl mx-auto">{body}</main>
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
