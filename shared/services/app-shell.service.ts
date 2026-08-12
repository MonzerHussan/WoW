import { SupabaseClient } from "@supabase/supabase-js";

export interface AppShellData {
  walletBalance: number;
  agentChosenName: string;
}

/**
 * The one small read every one of the 6 top-level screens + Dashboard
 * needs for the persistent header (wallet chip, dynamically-named "AI
 * Assist" nav label). Lives in shared/ rather than a feature because it
 * is consumed by every feature's top-level page — the same reasoning
 * pricing.service.ts already uses.
 *
 * REAL BUG FIXED HERE: `user_agent_profiles.chosen_name` is `not null
 * default 'رفيق'` (007b) — a NOT NULL placeholder, never a real chosen
 * name. The actual "has this user chosen a name yet" signal, used
 * correctly everywhere else in this codebase (getAgentInitialState,
 * getFreshAgentState), is `updated_at === created_at` (the row has never
 * been updated since its auto-created default). This function used to
 * return `chosen_name` as-is, so AppShell's nav pill and the AI Assist
 * screen showed "رفيق" as if it were a real name while FloatingAgent
 * (which does check needsNaming correctly) still prompted for one —
 * exactly the reported "'رفيق' still asks to be named from scratch"
 * symptom. Now this returns "" (AppShell's own designed fallback,
 * `agentChosenName || t("nav.aiAssistFallback")`) until a name has
 * genuinely been chosen, matching every other read site.
 */
export async function getAppShellData(supabase: SupabaseClient, userId: string): Promise<AppShellData> {
  const [{ data: wallet }, { data: agentProfile }] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
    supabase.from("user_agent_profiles").select("chosen_name, created_at, updated_at").eq("user_id", userId).maybeSingle(),
  ]);

  const needsNaming = !agentProfile || agentProfile.updated_at === agentProfile.created_at;

  return {
    walletBalance: wallet?.balance ?? 0,
    agentChosenName: needsNaming ? "" : agentProfile!.chosen_name,
  };
}
