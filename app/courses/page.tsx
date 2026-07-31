import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getPublishedCourses } from "@/features/lms/services/course.service";
import { CoursesPageContent } from "@/features/lms/components/CoursesPageContent";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function CoursesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const courses = await getPublishedCourses(supabase);
  const initialLang = getServerLang();

  // Unlike /dashboard and /profile, this page is public (middleware does
  // not gate it), so `user` really can be null here — hence the explicit
  // branch instead of assuming a session the way those pages can.
  const agentState = user ? await getAgentInitialState(supabase, user.id) : null;

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-6xl mx-auto">
      <CoursesPageContent courses={courses} initialLang={initialLang} />
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
