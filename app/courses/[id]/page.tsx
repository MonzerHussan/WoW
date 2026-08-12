import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getCourseDetail } from "@/features/lms/services/course.service";
import { getUpcomingLiveSessions } from "@/features/lms/services/live-session.service";
import { CourseDetailPageContent } from "@/features/lms/components/CourseDetailPageContent";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

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

  const [shellData, agentState] = user
    ? await Promise.all([getAppShellData(supabase, user.id), getAgentInitialState(supabase, user.id)])
    : [null, null];

  return (
    <>
      <CourseDetailPageContent
        course={course}
        userId={user?.id ?? null}
        liveSessions={liveSessions}
        initialLang={initialLang}
        shell={shellData}
      />
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
