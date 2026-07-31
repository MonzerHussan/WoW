import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getCourseDetail } from "@/features/lms/services/course.service";
import { getUpcomingLiveSessions } from "@/features/lms/services/live-session.service";
import { CourseDetailPageContent } from "@/features/lms/components/CourseDetailPageContent";

export default async function CoursePage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  const course = await getCourseDetail(supabase, params.id, user?.id ?? null);
  if (!course) notFound();

  const liveSessions = course.isEnrolled
    ? await getUpcomingLiveSessions(supabase, params.id, user?.id ?? null)
    : [];

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-4xl mx-auto">
      <CourseDetailPageContent
        course={course}
        userId={user?.id ?? null}
        liveSessions={liveSessions}
        initialLang={initialLang}
      />
    </main>
  );
}
