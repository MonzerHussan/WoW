import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { getCourseDetail } from "@/features/lms/services/course.service";
import { getUpcomingLiveSessions } from "@/features/lms/services/live-session.service";
import { CourseDetailView } from "@/features/lms/components/CourseDetailView";

export default async function CoursePage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  const course = await getCourseDetail(supabase, params.id, user?.id ?? null);
  if (!course) notFound();

  const liveSessions = course.isEnrolled
    ? await getUpcomingLiveSessions(supabase, params.id, user?.id ?? null)
    : [];

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-4xl mx-auto">
      <Link href="/courses" className="text-sm text-ink-soft hover:text-navy mb-6 inline-block">
        ← {t("lms.backToCatalog", lang)}
      </Link>
      <CourseDetailView course={course} userId={user?.id ?? null} lang={lang} liveSessions={liveSessions} />
    </main>
  );
}
