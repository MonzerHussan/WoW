"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { Card } from "@/shared/components/Feedback";
import { CreateCourseForm } from "@/features/instructor/components/CreateCourseForm";
import { CurriculumContributionSection } from "@/features/instructor/components/CurriculumContributionSection";
import { MyCourseSummary } from "@/features/instructor/services/instructor-course.service";
import { SharedCourse } from "@/features/instructor/services/curriculum-contribution.service";

/**
 * TECH_DEBT #27 (light group) — only this shell (Logo/title/links/toggle)
 * gets a real initialLang + working LangToggle; CreateCourseForm and
 * CurriculumContributionSection keep their own independent useLang("ar")
 * unchanged, same accepted gap as TECH_DEBT #18.
 */
export function InstructorCoursesPageContent({
  courses,
  sharedCourses,
  initialLang,
}: {
  courses: MyCourseSummary[];
  sharedCourses: SharedCourse[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-black text-2xl text-navy">{t("instructor.myCoursesTitle")}</h1>
        <Link href="/instructor/review" className="text-sm font-bold text-navy hover:underline">
          {t("instructor.reviewQueueLink")}
        </Link>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {courses.map((course) => (
          <Link key={course.id} href={`/instructor/courses/${course.id}`}>
            <Card className="p-5 hover:border-navy transition-colors">
              <p className="font-bold text-navy">{course.title}</p>
              {course.summary && <p className="text-sm text-ink-soft mt-1">{course.summary}</p>}
            </Card>
          </Link>
        ))}
        {courses.length === 0 && <p className="text-sm text-ink-soft">{t("instructor.noCoursesYet")}</p>}
      </div>

      <CreateCourseForm />

      <CurriculumContributionSection courses={sharedCourses} />
    </div>
  );
}
