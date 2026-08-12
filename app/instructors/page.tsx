import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getMyInstructorLinks } from "@/features/instructors/services/instructors.service";
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

  const [links, shellData, agentState] = await Promise.all([
    getMyInstructorLinks(supabase, user.id),
    getAppShellData(supabase, user.id),
    getAgentInitialState(supabase, user.id),
  ]);

  return (
    <>
      <InstructorsContent
        links={links}
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
