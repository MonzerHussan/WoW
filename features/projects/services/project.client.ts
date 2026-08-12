import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { CreateProjectInput, UpdateBusinessCaseInput, UpdateCharterInput } from "@/shared/schemas/project.schema";

export interface CreateProjectResult {
  allowed: boolean;
  reason?: "name_required" | "price_unavailable" | "insufficient_balance";
  projectId?: string;
  coinsCharged?: number;
  balance?: number;
  required?: number;
  balanceAfter?: number;
}

/**
 * The only path into `projects` (037) — everything else in this file is
 * an ordinary owner UPDATE, but creation costs coins, so it goes through
 * `create_project()` rather than a direct insert (which RLS refuses
 * outright; there is no insert policy on `projects` at all).
 */
export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("create_project", {
    p_name: input.name,
    p_sector: input.sector || null,
    p_country: input.country || null,
    p_organization: input.organization || null,
  });

  if (error) return { allowed: false };
  return data as CreateProjectResult;
}

/** Free — the mini business case is ordinary content, not a second paid action. */
export async function updateBusinessCase(projectId: string, input: UpdateBusinessCaseInput) {
  const supabase = supabaseBrowser();
  return supabase
    .from("projects")
    .update({
      problem_statement: input.problemStatement,
      opportunity_statement: input.opportunityStatement,
      value_case: input.valueCase,
      why_now: input.whyNow,
    })
    .eq("id", projectId);
}

/** Draft saves only — never touches is_approved, see updateCharterApproval below. */
export async function updateCharter(projectId: string, input: UpdateCharterInput) {
  const supabase = supabaseBrowser();
  return supabase
    .from("project_charters")
    .update({
      vision: input.vision,
      objectives: input.objectives,
      deliverables: input.deliverables,
      sponsor_name: input.sponsorName,
      sponsor_authority: input.sponsorAuthority,
      core_team: input.coreTeam,
      assumptions: input.assumptions,
      constraints: input.constraints,
    })
    .eq("project_id", projectId);
}

/**
 * The one explicit action that flips `is_approved` — kept separate from
 * `updateCharter` on purpose so a routine autosave can never trigger it
 * by accident. Firing this INSERTs a real decision_log row automatically
 * (037's `log_charter_approval()` trigger), not something this function
 * does itself.
 */
export async function approveCharter(projectId: string) {
  const supabase = supabaseBrowser();
  return supabase
    .from("project_charters")
    .update({ is_approved: true, approved_at: new Date().toISOString() })
    .eq("project_id", projectId);
}

export async function addDecisionLogEntry(
  projectId: string,
  entry: { situation: string; decision: string; reason: string; category?: string | null }
) {
  const supabase = supabaseBrowser();
  return supabase.from("decision_log").insert({
    project_id: projectId,
    situation: entry.situation,
    decision: entry.decision,
    reason: entry.reason,
    category: entry.category ?? null,
  });
}
