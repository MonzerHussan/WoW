import { SupabaseClient } from "@supabase/supabase-js";

export interface ProjectSummary {
  id: string;
  name: string;
  sector: string | null;
  country: string | null;
  organization: string | null;
  created_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  client: string | null;
  value_statement: string | null;
  started_at: string | null;
  problem_statement: string | null;
  opportunity_statement: string | null;
  value_case: string | null;
  why_now: string | null;
}

export interface CoreTeamMember {
  name: string;
  role: string;
}

export interface ProjectCharter {
  project_id: string;
  vision: string | null;
  objectives: string | null;
  deliverables: string | null;
  sponsor_name: string | null;
  sponsor_authority: string | null;
  core_team: CoreTeamMember[];
  assumptions: string[];
  constraints: string[];
  is_approved: boolean;
  approved_at: string | null;
}

export interface DecisionLogEntry {
  id: string;
  situation: string;
  decision: string;
  reason: string;
  category: string | null;
  created_at: string;
}

export interface ProjectReadiness {
  project_id: string;
  readiness_percent: number;
}

/** All of a trainee's own projects — multiple is the normal case (037, owner decision), not an edge case. */
export async function getMyProjects(supabase: SupabaseClient, userId: string): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, sector, country, organization, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as ProjectSummary[];
}

/**
 * One project with everything its workspace needs in one round trip.
 * RLS scopes all three reads to the owner already — no `.eq("owner_id", ...)`
 * needed here beyond the project row itself, and a non-owner id simply
 * returns null (matching getCourseDetail's own "RLS decides visibility,
 * not this function" shape).
 */
export async function getProjectWorkspace(
  supabase: SupabaseClient,
  projectId: string
): Promise<{
  project: ProjectDetail;
  charter: ProjectCharter;
  decisionLog: DecisionLogEntry[];
  readinessPercent: number;
} | null> {
  const [{ data: project, error: projectError }, { data: charter }, { data: decisionLog }, { data: readiness }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, name, sector, country, organization, client, value_statement, started_at, problem_statement, opportunity_statement, value_case, why_now, created_at"
        )
        .eq("id", projectId)
        .maybeSingle(),
      supabase.from("project_charters").select("*").eq("project_id", projectId).maybeSingle(),
      supabase
        .from("decision_log")
        .select("id, situation, decision, reason, category, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase.from("project_readiness").select("readiness_percent").eq("project_id", projectId).maybeSingle(),
    ]);

  if (projectError) throw new Error(projectError.message);
  if (!project) return null;

  return {
    project: project as ProjectDetail,
    // create_project() always inserts an empty charter row in the same
    // transaction as the project (037) — a null charter here means the
    // read was refused, not that one doesn't exist, so falling back to
    // an empty shape would hide an RLS problem rather than a real gap.
    charter: (charter as ProjectCharter) || {
      project_id: projectId,
      vision: null,
      objectives: null,
      deliverables: null,
      sponsor_name: null,
      sponsor_authority: null,
      core_team: [],
      assumptions: [],
      constraints: [],
      is_approved: false,
      approved_at: null,
    },
    decisionLog: (decisionLog || []) as DecisionLogEntry[],
    readinessPercent: readiness?.readiness_percent ?? 0,
  };
}
