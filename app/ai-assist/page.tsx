import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getRecentRecommendations } from "@/features/profile/services/profile.service";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { AiAssistContent } from "@/features/ai-assist/components/AiAssistContent";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function AiAssistPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/ai-assist");

  const [recommendations, shellData, agentState] = await Promise.all([
    getRecentRecommendations(supabase, user.id),
    getAppShellData(supabase, user.id),
    getAgentInitialState(supabase, user.id),
  ]);

  return (
    <>
      <AiAssistContent
        agentChosenName={shellData.agentChosenName}
        recommendations={recommendations}
        walletBalance={shellData.walletBalance}
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
