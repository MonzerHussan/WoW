"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { Card, EmptyState, SectionTitle } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { SharedCourse } from "@/features/instructor/services/curriculum-contribution.service";
import { SuggestLessonForm } from "@/features/instructor/components/SuggestLessonForm";

export function CurriculumContributionSection({ courses }: { courses: SharedCourse[] }) {
  const router = useRouter();
  const { t } = useLang("ar");
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mt-10 pt-8 border-t border-line">
      <SectionTitle className="text-xl mb-1">{t("instructor.curriculumSectionTitle")}</SectionTitle>
      <p className="text-sm text-ink-soft mb-4">{t("instructor.curriculumSectionHint")}</p>

      {submitted && (
        <div className="mb-4 text-sm font-semibold text-navy bg-navy/5 rounded-lg px-4 py-3">
          {t("instructor.lessonProposalSubmitted")}
        </div>
      )}

      {courses.length === 0 ? (
        <EmptyState message={t("instructor.noSharedCourses")} icon="📘" />
      ) : (
        <div className="flex flex-col gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-navy">{course.title}</p>
                {openCourseId !== course.id && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpenCourseId(course.id);
                      setSubmitted(false);
                    }}
                    disabled={course.modules.length === 0}
                  >
                    {t("instructor.suggestLessonCta")}
                  </Button>
                )}
              </div>

              {openCourseId === course.id && (
                <div className="mt-4">
                  <SuggestLessonForm
                    modules={course.modules}
                    onCancel={() => setOpenCourseId(null)}
                    onSubmitted={() => {
                      setOpenCourseId(null);
                      setSubmitted(true);
                      router.refresh();
                    }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
