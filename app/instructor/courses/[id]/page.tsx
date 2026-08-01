import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getMyCourseDetail } from "@/features/instructor/services/instructor-course.service";
import { InstructorCourseDetailPageContent } from "@/features/instructor/components/InstructorCourseDetailPageContent";

export default async function InstructorCourseDetailPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect(`/login?redirectedFrom=/instructor/courses/${params.id}`);

  const course = await getMyCourseDetail(supabase, user.id, params.id);
  if (!course) notFound();

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <InstructorCourseDetailPageContent course={course} initialLang={initialLang} />
    </main>
  );
}
