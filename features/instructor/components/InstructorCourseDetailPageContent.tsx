"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { InviteLinkCard } from "@/features/instructor/components/InviteLinkCard";
import { CourseContentManager } from "@/features/instructor/components/CourseContentManager";
import { MyCourseDetail } from "@/features/instructor/services/instructor-course.service";

/**
 * TECH_DEBT #27 (light group) — only this shell (Logo/breadcrumb/title/
 * toggle) gets a real initialLang + working LangToggle; InviteLinkCard
 * and CourseContentManager (which itself has 3 independent useLang("ar")
 * instances internally) keep their own, same accepted gap as #18.
 */
export function InstructorCourseDetailPageContent({
  course,
  initialLang,
}: {
  course: MyCourseDetail;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <Link href="/instructor/courses" className="text-sm text-ink-soft hover:text-navy mb-4 inline-block">
        ← {t("instructor.myCoursesTitle")}
      </Link>
      <h1 className="font-display font-black text-2xl text-navy mb-2">{course.title}</h1>
      {course.summary && <p className="text-ink-soft mb-4">{course.summary}</p>}

      <div className="mb-6">
        <InviteLinkCard inviteCode={course.invite_code} />
      </div>

      <Link
        href={`/instructor/courses/${course.id}/sessions`}
        className="text-sm font-bold text-navy hover:underline mb-6 inline-block"
      >
        🎥 {t("instructor.manageSessions")}
      </Link>

      <CourseContentManager courseId={course.id} initialModules={course.modules} />
    </div>
  );
}
