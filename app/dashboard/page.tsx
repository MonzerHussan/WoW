import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const agentState = await getAgentInitialState(supabase, user.id);

  // The fixed AgentChat card that used to fill DashboardView's
  // assistantSlot was removed by owner decision once the floating agent
  // shipped: two chat surfaces on one page, each with its own separate
  // history, confused more than they helped. The floating agent is now
  // the only way to reach the agent from here — and it is the same one
  // available on every other signed-in page.
  //
  // Rendered only because `user` resolved above; a signed-out visitor
  // never reaches this branch.
  return (
    <>
      <DashboardView />
      <FloatingAgent
        userId={user.id}
        initialChosenName={agentState.chosenName}
        initialNeedsNaming={agentState.needsNaming}
      />
    </>
  );
}
