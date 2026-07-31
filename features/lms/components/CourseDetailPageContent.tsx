"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { CourseDetailView } from "@/features/lms/components/CourseDetailView";
import { CourseDetail } from "@/features/lms/services/course.service";
import { UpcomingLiveSession } from "@/features/lms/services/live-session.service";

/**
 * The interactive half of /courses/[id] (035) — same split as
 * CoursesPageContent for the catalog page.
 */
export function CourseDetailPageContent({
  course,
  userId,
  liveSessions,
  initialLang,
}: {
  course: CourseDetail;
  userId: string | null;
  liveSessions: UpcomingLiveSession[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <Link href="/courses" className="text-sm text-ink-soft hover:text-navy mb-6 inline-block">
        ← {t("lms.backToCatalog")}
      </Link>
      <CourseDetailView course={course} userId={userId} lang={lang} liveSessions={liveSessions} />
    </div>
  );
}
