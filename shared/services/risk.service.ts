import { supabaseBrowser } from "@/shared/lib/supabase/client";

/**
 * Lives in shared/ rather than features/projects or features/level2
 * because BOTH consume it — Level 2's RiskRegisterBuilder (the full
 * add/list exercise) and features/projects' TopRisksWidget (a read-only
 * top-3 display embedded in ProjectWorkspace) — and neither feature may
 * import the other. Same reasoning pricing.service.ts and
 * decision-log.service.ts already document for themselves.
 *
 * project_risks' own RLS ("owner reads/inserts", 056) already scopes
 * everything to projects the caller owns — no RPC wrapper needed.
 * risk_score is a DB-generated column (probability × impact); this
 * layer never computes or trusts a client-supplied score.
 */
export interface ProjectRisk {
  id: string;
  project_id: string;
  description: string;
  probability: number;
  impact: number;
  risk_score: number;
  response_strategy: "avoid" | "mitigate" | "transfer" | "accept";
  created_at: string;
}

export async function listProjectRisks(projectId: string): Promise<ProjectRisk[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("project_risks")
    .select("id, project_id, description, probability, impact, risk_score, response_strategy, created_at")
    .eq("project_id", projectId)
    .order("risk_score", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as ProjectRisk[];
}

export async function addProjectRisk(
  projectId: string,
  input: { description: string; probability: number; impact: number; responseStrategy: ProjectRisk["response_strategy"] }
) {
  const supabase = supabaseBrowser();
  return supabase
    .from("project_risks")
    .insert({
      project_id: projectId,
      description: input.description,
      probability: input.probability,
      impact: input.impact,
      response_strategy: input.responseStrategy,
    })
    .select("id, project_id, description, probability, impact, risk_score, response_strategy, created_at")
    .single();
}

export async function deleteProjectRisk(id: string) {
  const supabase = supabaseBrowser();
  return supabase.from("project_risks").delete().eq("id", id);
}
