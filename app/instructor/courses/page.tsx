import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { getMyCourses } from "@/features/instructor/services/instructor-course.service";
import { getSharedCoursesWithModules } from "@/features/instructor/services/curriculum-contribution.service";
import { InstructorCoursesPageContent } from "@/features/instructor/components/InstructorCoursesPageContent";

export default async function InstructorCoursesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/instructor/courses");

  const { data: capability } = await supabase
    .from("user_capabilities")
    .select("capability")
    .eq("user_id", user.id)
    .eq("capability", "instructor")
    .maybeSingle();

  if (!capability) {
    return (
      <main
        dir={initialLang === "ar" ? "rtl" : "ltr"}
        className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center"
      >
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("instructor.instructorOnly", initialLang)}</p>
        <Link href="/profile" className="text-navy font-bold hover:underline">
          {t("instructor.goActivate", initialLang)}
        </Link>
      </main>
    );
  }

  const [courses, sharedCourses] = await Promise.all([
    getMyCourses(supabase, user.id),
    getSharedCoursesWithModules(supabase),
  ]);

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <InstructorCoursesPageContent courses={courses} sharedCourses={sharedCourses} initialLang={initialLang} />
    </main>
  );
}
