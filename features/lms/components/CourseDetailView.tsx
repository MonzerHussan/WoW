import Link from "next/link";
import { t } from "@/shared/i18n/translations";
import { Card } from "@/shared/components/Feedback";
import { CourseDetail } from "@/features/lms/services/course.service";
import { UpcomingLiveSession } from "@/features/lms/services/live-session.service";
import { EnrollButton } from "@/features/lms/components/EnrollButton";
import { LiveSessionsUpcoming } from "@/features/lms/components/LiveSessionsUpcoming";

export function CourseDetailView({
  course,
  userId,
  lang = "ar" as const,
  liveSessions = [],
}: {
  course: CourseDetail;
  userId: string | null;
  lang?: "ar" | "en";
  liveSessions?: UpcomingLiveSession[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display font-black text-2xl text-navy mb-2">{course.title}</h1>
        {course.summary && <p className="text-ink-soft">{course.summary}</p>}
      </div>

      {userId && !course.isEnrolled && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-sm text-ink-soft">{t("lms.notEnrolledHint", lang)}</p>
          <EnrollButton courseId={course.id} userId={userId} />
        </Card>
      )}
      {course.isEnrolled && (
        <div className="text-sm font-semibold text-navy bg-navy/5 rounded-lg px-4 py-2 w-fit">
          ✅ {t("lms.enrolled", lang)}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {course.modules.map((module) => (
          <Card key={module.id} className="p-5">
            <h2 className="font-display font-bold text-navy mb-3">{module.title}</h2>
            <div className="flex flex-col divide-y divide-line">
              {module.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${course.id}/lessons/${lesson.id}`}
                  className="flex items-center justify-between py-3 hover:text-navy"
                >
                  <span className="text-sm font-semibold">{lesson.title}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-soft">
                    {lesson.is_free_preview && (
                      <span className="text-orange-dark font-bold">{t("lms.freePreview", lang)}</span>
                    )}
                    {lesson.duration_minutes != null && (
                      <span>
                        {lesson.duration_minutes} {t("lms.minutes", lang)}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
              {module.lessons.length === 0 && (
                <p className="py-3 text-xs text-ink-soft">{t("lms.lessonLocked", lang)}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {course.isEnrolled && userId && liveSessions.length > 0 && (
        <LiveSessionsUpcoming sessions={liveSessions} userId={userId} />
      )}

      {course.courseQuizzes.length > 0 && course.isEnrolled && (
        <Card className="p-5">
          <h2 className="font-display font-bold text-navy mb-3">{t("lms.courseAssessment", lang)}</h2>
          <div className="flex flex-col gap-2">
            {course.courseQuizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/courses/${course.id}/quizzes/${quiz.id}`}
                className="text-sm font-semibold text-navy hover:underline"
              >
                {quiz.title} — {t("lms.takeQuiz", lang)}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
