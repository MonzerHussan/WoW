import { SupabaseClient } from "@supabase/supabase-js";

export interface AgentInitialState {
  chosenName: string;
  needsNaming: boolean;
}

/**
 * "First use" (needsNaming) can't be read off chosen_name itself — it
 * always has a value (defaults to 'رفيق' via the 007b trigger), so its
 * mere presence can't distinguish "never asked" from "kept the default on
 * purpose". Using ai_conversations activity as the signal was tried first
 * and was wrong: a user who names their agent but hasn't sent a message
 * yet would be re-asked on every reload. Instead, reuse the row's own
 * updated_at (bumped by trg_agent_profiles_updated_at, 007b) — it only
 * moves once the row has been written to since creation, i.e. once
 * AgentNamePicker has actually saved a name.
 */
export async function getAgentInitialState(supabase: SupabaseClient, userId: string): Promise<AgentInitialState> {
  const { data: agentProfile } = await supabase
    .from("user_agent_profiles")
    .select("chosen_name, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    chosenName: agentProfile?.chosen_name || "رفيق",
    needsNaming: !agentProfile || agentProfile.updated_at === agentProfile.created_at,
  };
}
