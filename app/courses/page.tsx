import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { getPublishedCourses } from "@/features/lms/services/course.service";
import { CourseCatalog } from "@/features/lms/components/CourseCatalog";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function CoursesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const courses = await getPublishedCourses(supabase);
  const lang = "ar" as const;

  // Unlike /dashboard and /profile, this page is public (middleware does
  // not gate it), so `user` really can be null here — hence the explicit
  // branch instead of assuming a session the way those pages can.
  const agentState = user ? await getAgentInitialState(supabase, user.id) : null;

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-6xl mx-auto">
      <Logo className="h-8 mb-6" />
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("lms.catalogTitle", lang)}</h1>
      <CourseCatalog courses={courses} lang={lang} />
      {user && agentState && (
        <FloatingAgent
          userId={user.id}
          initialChosenName={agentState.chosenName}
          initialNeedsNaming={agentState.needsNaming}
        />
      )}
    </main>
  );
}
