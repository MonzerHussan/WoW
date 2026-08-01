"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { SessionsManager } from "@/features/instructor/components/SessionsManager";
import { InstructorLiveSession } from "@/features/instructor/services/live-session.service";

/**
 * TECH_DEBT #27 (light group) — only this shell (Logo/breadcrumb/title/
 * toggle) gets a real initialLang + working LangToggle; SessionsManager
 * keeps its own independent useLang("ar"), same accepted gap as #18.
 */
export function InstructorSessionsPageContent({
  courseId,
  courseTitle,
  instructorId,
  initialSessions,
  initialLang,
}: {
  courseId: string;
  courseTitle: string;
  instructorId: string;
  initialSessions: InstructorLiveSession[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <Link
        href={`/instructor/courses/${courseId}`}
        className="text-sm text-ink-soft hover:text-navy mb-4 inline-block"
      >
        ← {courseTitle}
      </Link>
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("instructor.sessionsTitle")}</h1>

      <SessionsManager courseId={courseId} instructorId={instructorId} initialSessions={initialSessions} />
    </div>
  );
}
