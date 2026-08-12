import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getPublishedCourses } from "@/features/lms/services/course.service";
import { CoursesPageContent } from "@/features/lms/components/CoursesPageContent";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function CoursesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const courses = await getPublishedCourses(supabase);
  const initialLang = getServerLang();

  // Unlike /dashboard, this page is public (middleware does not gate
  // it), so `user` really can be null here — hence the explicit branch
  // instead of assuming a session the way the signed-in-only pages can.
  const [agentState, shellData] = user
    ? await Promise.all([getAgentInitialState(supabase, user.id), getAppShellData(supabase, user.id)])
    : [null, null];

  return (
    <>
      <CoursesPageContent courses={courses} initialLang={initialLang} shell={shellData} />
      {user && agentState && (
        <FloatingAgent
          userId={user.id}
          initialChosenName={agentState.chosenName}
          initialNeedsNaming={agentState.needsNaming}
          lang={initialLang}
        />
      )}
    </>
  );
}
