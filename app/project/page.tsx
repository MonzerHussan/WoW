import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getMyProjects } from "@/features/projects/services/project.service";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { MyProjectsList } from "@/features/projects/components/MyProjectsList";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function MyProjectsPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/project");

  const [projects, shellData, agentState] = await Promise.all([
    getMyProjects(supabase, user.id),
    getAppShellData(supabase, user.id),
    getAgentInitialState(supabase, user.id),
  ]);

  return (
    <>
      <MyProjectsList
        projects={projects}
        initialLang={initialLang}
        walletBalance={shellData.walletBalance}
        agentChosenName={shellData.agentChosenName}
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
