import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { getMyCourseDetail } from "@/features/instructor/services/instructor-course.service";
import { InviteLinkCard } from "@/features/instructor/components/InviteLinkCard";
import { CourseContentManager } from "@/features/instructor/components/CourseContentManager";

export default async function InstructorCourseDetailPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) redirect(`/login?redirectedFrom=/instructor/courses/${params.id}`);

  const course = await getMyCourseDetail(supabase, user.id, params.id);
  if (!course) notFound();

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <Link href="/instructor/courses" className="text-sm text-ink-soft hover:text-navy mb-4 inline-block">
        ← {t("instructor.myCoursesTitle", lang)}
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
        🎥 {t("instructor.manageSessions", lang)}
      </Link>

      <CourseContentManager courseId={course.id} initialModules={course.modules} />
    </main>
  );
}
