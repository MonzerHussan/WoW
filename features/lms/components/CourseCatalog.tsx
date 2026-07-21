import Link from "next/link";
import { t } from "@/shared/i18n/translations";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { CourseSummary } from "@/features/lms/services/course.service";

const TRACK_LABEL: Record<string, { ar: string; en: string }> = {
  education: { ar: "تعليم", en: "Education" },
  employment: { ar: "توظيف", en: "Employment" },
  promotion: { ar: "ترقية", en: "Promotion" },
};

export function CourseCatalog({ courses, lang = "ar" as const }: { courses: CourseSummary[]; lang?: "ar" | "en" }) {
  if (courses.length === 0) {
    return <EmptyState message={t("lms.catalogEmpty", lang)} icon="📚" />;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((course) => (
        <Link key={course.id} href={`/courses/${course.id}`}>
          <Card className="p-5 h-full hover:border-navy/40 transition flex flex-col gap-3">
            {course.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.cover_url} alt="" className="w-full h-32 object-cover rounded-xl" />
            )}
            <span className="text-xs font-bold text-orange-dark bg-orange/10 w-fit rounded-full px-2.5 py-1">
              {TRACK_LABEL[course.track]?.[lang] || course.track}
            </span>
            <h3 className="font-display font-black text-navy">{course.title}</h3>
            {course.summary && <p className="text-sm text-ink-soft line-clamp-2">{course.summary}</p>}
          </Card>
        </Link>
      ))}
    </div>
  );
}
