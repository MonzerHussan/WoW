import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import AgentChat from "@/features/agent/components/AgentChat";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const agentState = await getAgentInitialState(supabase, user.id);

  // Cross-feature composition happens here at the page level,
  // keeping features/dashboard and features/agent decoupled.
  return (
    <>
      <DashboardView
        assistantSlot={
          <AgentChat
            userId={user.id}
            initialChosenName={agentState.chosenName}
            initialNeedsNaming={agentState.needsNaming}
            lang="ar"
          />
        }
      />
      {/* Rendered only because `user` resolved above — a signed-out
          visitor never reaches this branch, so the floating agent is
          absent from the DOM entirely rather than hidden. */}
      <FloatingAgent
        userId={user.id}
        initialChosenName={agentState.chosenName}
        initialNeedsNaming={agentState.needsNaming}
      />
    </>
  );
}
