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

export interface AgentEnrollmentContext {
  courseId: string;
  courseTitle: string;
  progress: number;
  status: string;
}

/**
 * The user's own enrollments, for the agent's "what have you actually
 * started" grounding — distinct from the full published catalog (which
 * is platform-wide, not user-specific). RLS ("Enrollments are viewable
 * by owner") already scopes this to the caller.
 */
export async function getEnrollmentContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AgentEnrollmentContext[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id, progress, status, courses(title)")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data || []).map((e: any) => ({
    courseId: e.course_id,
    courseTitle: e.courses?.title || "",
    progress: e.progress,
    status: e.status,
  }));
}
