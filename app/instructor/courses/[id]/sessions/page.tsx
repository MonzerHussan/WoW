import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getMyCourseDetail } from "@/features/instructor/services/instructor-course.service";
import { getMyLiveSessions } from "@/features/instructor/services/live-session.service";
import { InstructorSessionsPageContent } from "@/features/instructor/components/InstructorSessionsPageContent";

export default async function InstructorCourseSessionsPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect(`/login?redirectedFrom=/instructor/courses/${params.id}/sessions`);

  const course = await getMyCourseDetail(supabase, user.id, params.id);
  if (!course) notFound();

  const sessions = await getMyLiveSessions(supabase, params.id);

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <InstructorSessionsPageContent
        courseId={params.id}
        courseTitle={course.title}
        instructorId={user.id}
        initialSessions={sessions}
        initialLang={initialLang}
      />
    </main>
  );
}
