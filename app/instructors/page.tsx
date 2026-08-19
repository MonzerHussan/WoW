import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import {
  getMyInstructorLinks,
  getIncomingInstructorRequests,
  isInstructor as checkIsInstructor,
} from "@/features/instructors/services/instructors.service";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { InstructorsContent } from "@/features/instructors/components/InstructorsContent";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function InstructorsPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/instructors");

  const [links, shellData, agentState, instructor] = await Promise.all([
    getMyInstructorLinks(supabase, user.id),
    getAppShellData(supabase, user.id),
    getAgentInitialState(supabase, user.id),
    checkIsInstructor(supabase, user.id),
  ]);

  // Only fetched for actual instructors — a learner has no incoming
  // requests by definition, and RLS would return an empty set anyway.
  const incomingRequests = instructor
    ? await getIncomingInstructorRequests(supabase, user.id)
    : [];

  return (
    <>
      <InstructorsContent
        links={links}
        incomingRequests={incomingRequests}
        isInstructor={instructor}
        walletBalance={shellData.walletBalance}
        agentChosenName={shellData.agentChosenName}
        initialLang={initialLang}
      />
      <FloatingAgent
        userId={user.id}
        initialChosenName={agentState.chosenName}
        initialNeedsNaming={agentState.needsNaming}
        lang={initialLang}
      />
    </>
  );
}
