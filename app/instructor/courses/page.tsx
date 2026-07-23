import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { getMyCourses } from "@/features/instructor/services/instructor-course.service";
import { getSharedCoursesWithModules } from "@/features/instructor/services/curriculum-contribution.service";
import { CreateCourseForm } from "@/features/instructor/components/CreateCourseForm";
import { CurriculumContributionSection } from "@/features/instructor/components/CurriculumContributionSection";
import { Card } from "@/shared/components/Feedback";

export default async function InstructorCoursesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) redirect("/login?redirectedFrom=/instructor/courses");

  const { data: capability } = await supabase
    .from("user_capabilities")
    .select("capability")
    .eq("user_id", user.id)
    .eq("capability", "instructor")
    .maybeSingle();

  if (!capability) {
    return (
      <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center">
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("instructor.instructorOnly", lang)}</p>
        <Link href="/profile" className="text-navy font-bold hover:underline">
          {t("instructor.goActivate", lang)}
        </Link>
      </main>
    );
  }

  const [courses, sharedCourses] = await Promise.all([
    getMyCourses(supabase, user.id),
    getSharedCoursesWithModules(supabase),
  ]);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <Logo className="h-8 mb-6" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-black text-2xl text-navy">{t("instructor.myCoursesTitle", lang)}</h1>
        <Link href="/instructor/review" className="text-sm font-bold text-navy hover:underline">
          {t("instructor.reviewQueueLink", lang)}
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
        {courses.length === 0 && <p className="text-sm text-ink-soft">{t("instructor.noCoursesYet", lang)}</p>}
      </div>

      <CreateCourseForm />

      <CurriculumContributionSection courses={sharedCourses} />
    </main>
  );
}
