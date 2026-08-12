import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { CommunityContent } from "@/features/community/components/CommunityContent";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function CommunityPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/community");

  const [{ data: profile }, shellData, agentState] = await Promise.all([
    supabase.from("profiles").select("full_name, account_type, avatar_url").eq("id", user.id).single(),
    getAppShellData(supabase, user.id),
    getAgentInitialState(supabase, user.id),
  ]);

  return (
    <>
      <CommunityContent
        fullName={profile?.full_name ?? null}
        accountType={profile?.account_type ?? "student"}
        avatarUrl={profile?.avatar_url ?? null}
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
