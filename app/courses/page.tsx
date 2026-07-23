import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { getPublishedCourses } from "@/features/lms/services/course.service";
import { CourseCatalog } from "@/features/lms/components/CourseCatalog";

export default async function CoursesPage() {
  const supabase = supabaseServer();
  const courses = await getPublishedCourses(supabase);
  const lang = "ar" as const;

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-6xl mx-auto">
      <Logo className="h-8 mb-6" />
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("lms.catalogTitle", lang)}</h1>
      <CourseCatalog courses={courses} lang={lang} />
    </main>
  );
}
