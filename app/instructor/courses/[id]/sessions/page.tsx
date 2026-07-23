import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { getMyCourseDetail } from "@/features/instructor/services/instructor-course.service";
import { getMyLiveSessions } from "@/features/instructor/services/live-session.service";
import { SessionsManager } from "@/features/instructor/components/SessionsManager";

export default async function InstructorCourseSessionsPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) redirect(`/login?redirectedFrom=/instructor/courses/${params.id}/sessions`);

  const course = await getMyCourseDetail(supabase, user.id, params.id);
  if (!course) notFound();

  const sessions = await getMyLiveSessions(supabase, params.id);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <Logo className="h-8 mb-6" />
      <Link href={`/instructor/courses/${params.id}`} className="text-sm text-ink-soft hover:text-navy mb-4 inline-block">
        ← {course.title}
      </Link>
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("instructor.sessionsTitle", lang)}</h1>

      <SessionsManager courseId={params.id} instructorId={user.id} initialSessions={sessions} />
    </main>
  );
}
