import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { GamesHub } from "@/features/games/components/GamesHub";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

/**
 * A permanent top-level screen (navigation restructuring), always
 * reachable.
 *
 * Owner-reversed (042, navigation-restructuring batch item 9): this page
 * used to fetch `hasPassedLevel1FinalQuiz` and pass it to GamesHub as an
 * `unlocked` gate — that Level 1 final quiz requirement was deliberately
 * removed by explicit owner decision, not a bug. Generic games are now
 * unconditionally playable; play_game() (042) no longer checks quiz
 * history for the generic variant either. See 042's migration header and
 * DOMAIN_CONTRACTS.md for the full record.
 */
export default async function GamesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/games");

  const [shellData, agentState] = await Promise.all([
    getAppShellData(supabase, user.id),
    getAgentInitialState(supabase, user.id),
  ]);

  return (
    <>
      <GamesHub
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
