import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getProjectWorkspace } from "@/features/projects/services/project.service";
import { ProjectWorkspace } from "@/features/projects/components/ProjectWorkspace";
import { getMyBadges, getMyCertificates } from "@/features/games/services/game.service";
import { ProjectGamesPanel } from "@/features/games/components/ProjectGamesPanel";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string };
}) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect(`/login?redirectedFrom=/project/${params.id}`);

  // RLS scopes this to the owner already — a non-owner id returns null
  // the same way a nonexistent one does, no separate "not yours" branch
  // to leak that the row exists at all.
  const workspace = await getProjectWorkspace(supabase, params.id);
  if (!workspace) notFound();

  // Games (038) — badges/certificates are account-wide, not per-project;
  // this is the one screen v3 decision 2 asked to surface them on (the
  // "coach and companion" screen). The generic-variant section used to
  // be gated on a passed Level 1 final quiz (hasPassedLevel1FinalQuiz) —
  // that gate was deliberately removed (042, navigation-restructuring
  // batch item 9), so it is no longer fetched here at all.
  const [badges, certificates, shellData, agentState] = await Promise.all([
    getMyBadges(supabase, user.id),
    getMyCertificates(supabase, user.id),
    getAppShellData(supabase, user.id),
    getAgentInitialState(supabase, user.id),
  ]);

  return (
    <>
      <ProjectWorkspace
        project={workspace.project}
        charter={workspace.charter}
        decisionLog={workspace.decisionLog}
        readinessPercent={workspace.readinessPercent}
        initialLang={initialLang}
        celebrate={searchParams.created === "1"}
        walletBalance={shellData.walletBalance}
        agentChosenName={shellData.agentChosenName}
        gamesSlot={
          <ProjectGamesPanel
            projectId={workspace.project.id}
            projectName={workspace.project.name}
            lang={initialLang}
            badges={badges}
            certificates={certificates}
          />
        }
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
