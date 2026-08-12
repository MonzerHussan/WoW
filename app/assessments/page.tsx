import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getSkillsAndCertificates } from "@/features/profile/services/profile.service";
import { getPlacementResult, getPlacementState } from "@/features/agent/services/agent.service";
import { getMyQuizHistory } from "@/features/lms/services/quiz.service";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getMyBadges } from "@/features/games/services/game.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { AssessmentsContent } from "@/features/assessments/components/AssessmentsContent";
import { PlacementChat } from "@/features/agent/components/PlacementChat";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function AssessmentsPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/assessments");

  const [skillsAndCerts, placementResult, placementState, quizHistory, shellData, earnedBadges, agentState] = await Promise.all([
    getSkillsAndCertificates(supabase, user.id),
    getPlacementResult(supabase, user.id),
    getPlacementState(supabase, user.id),
    getMyQuizHistory(supabase, user.id),
    getAppShellData(supabase, user.id),
    getMyBadges(supabase, user.id),
    getAgentInitialState(supabase, user.id),
  ]);
  const gameBadges = earnedBadges.map((b) => ({ id: b.badge_id, name: b.name, icon: b.icon, earnedAt: b.earned_at }));

  return (
    <>
      <AssessmentsContent
        placementResult={placementResult}
        quizHistory={quizHistory}
        skills={skillsAndCerts.skills}
        certificates={skillsAndCerts.certificates}
        gameBadges={gameBadges}
        walletBalance={shellData.walletBalance}
        agentChosenName={shellData.agentChosenName}
        initialLang={initialLang}
        placementSlot={<PlacementChat initialPlaced={placementState.placed} initialLevel={placementState.englishLevel} lang={initialLang} />}
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
