import { SupabaseClient } from "@supabase/supabase-js";
import { ContentDraftTargetTable } from "@/shared/schemas/content-draft.schema";

/**
 * Draft/Publish access for kb_scenarios, kb_scoring_rules, and badges
 * (062) — the three content tables with no prior review mechanism.
 * Lives in shared/ because both the PMP and English admin panels read
 * it (the two panels are one route each, but the same underlying data
 * and content.manage gate, per the owner's decision).
 *
 * pricing_units is deliberately absent here — see 062's own header:
 * RBAC.md already reserves it to finance.edit_rates via the existing
 * /admin/pricing screen.
 */
export interface ContentDraftRow {
  id: string;
  target_table: ContentDraftTargetTable;
  target_id: string | null;
  action: "upsert" | "delete";
  payload: Record<string, unknown>;
  status: "draft" | "published" | "discarded";
  created_by: string;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
}

export async function listContentDrafts(
  supabase: SupabaseClient,
  targetTable?: ContentDraftTargetTable
): Promise<ContentDraftRow[]> {
  let query = supabase
    .from("content_drafts")
    .select("id, target_table, target_id, action, payload, status, created_by, published_by, published_at, created_at")
    .order("created_at", { ascending: false });
  if (targetTable) query = query.eq("target_table", targetTable);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as ContentDraftRow[];
}

export interface KbScenarioRow {
  id: string;
  rule_scope: string;
  scenario_key: string;
  title_ar: string;
  title_en: string;
  body: {
    context_ar: string;
    context_en: string;
    choices: { key: string; label_ar: string; label_en: string }[];
  };
  is_active: boolean;
}

export async function listKbScenarios(supabase: SupabaseClient): Promise<KbScenarioRow[]> {
  const { data, error } = await supabase
    .from("kb_scenarios")
    .select("id, rule_scope, scenario_key, title_ar, title_en, body, is_active")
    .order("rule_scope")
    .order("scenario_key");

  if (error) throw new Error(error.message);
  return (data || []) as KbScenarioRow[];
}

export interface KbScoringRuleRow {
  id: string;
  rule_scope: string;
  scenario_key: string;
  decision_key: string;
  score: number;
  feedback_ar: string;
  feedback_en: string;
}

export async function listKbScoringRules(supabase: SupabaseClient): Promise<KbScoringRuleRow[]> {
  const { data, error } = await supabase
    .from("kb_scoring_rules")
    .select("id, rule_scope, scenario_key, decision_key, score, feedback_ar, feedback_en")
    .order("rule_scope")
    .order("scenario_key")
    .order("decision_key");

  if (error) throw new Error(error.message);
  return (data || []) as KbScoringRuleRow[];
}

export interface BadgeRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  points_value: number;
}

export async function listBadges(supabase: SupabaseClient): Promise<BadgeRow[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("id, name, description, icon, points_value")
    .order("name");

  if (error) throw new Error(error.message);
  return (data || []) as BadgeRow[];
}

/** For populating the rule_scope dropdown when authoring a new scenario. */
export async function listKbRuleScopes(supabase: SupabaseClient): Promise<{ rule_scope: string; label_ar: string; label_en: string }[]> {
  const { data, error } = await supabase.from("kb_rule_scopes").select("rule_scope, label_ar, label_en").order("rule_scope");
  if (error) throw new Error(error.message);
  return (data || []) as { rule_scope: string; label_ar: string; label_en: string }[];
}
