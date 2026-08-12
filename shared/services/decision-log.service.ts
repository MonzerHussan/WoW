import { supabaseBrowser } from "@/shared/lib/supabase/client";

/**
 * Lives in shared/ rather than features/projects because a second
 * feature now writes decision_log rows too (Level 2's lesson-embedded
 * reflection exercises) and neither may import the other — same
 * reasoning pricing.service.ts already documents for itself.
 *
 * decision_log's own RLS ("owner adds entries", 037) already scopes
 * this to projects the caller owns — no RPC wrapper needed, a direct
 * insert is sufficient and matches how features/projects' own
 * DecisionLogPanel already writes this table.
 */
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
