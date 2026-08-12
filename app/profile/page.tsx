import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

/**
 * Second navigation-restructuring round: Profile is now the real,
 * always-present nav tab showing what /dashboard used to show (DNA,
 * scores, capabilities, wallet, avatar) — "only the entry point
 * changed," per the owner's own instruction. /dashboard now redirects
 * here instead of the reverse.
 */
export default async function ProfilePage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectedFrom=/profile");

  const agentState = await getAgentInitialState(supabase, user.id);

  return (
    <>
      <DashboardView />
      <FloatingAgent
        userId={user.id}
        initialChosenName={agentState.chosenName}
        initialNeedsNaming={agentState.needsNaming}
        lang={getServerLang()}
      />
    </>
  );
}
