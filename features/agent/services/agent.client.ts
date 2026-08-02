import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { AGENT_CONTEXT_WINDOW } from "@/shared/constants/agent";

export type AgentMsg = { role: "user" | "assistant"; content: string };

/**
 * `lessonId` is optional and sent only by the floating agent on a lesson
 * page. Note that only the id travels — never lesson text — so the
 * route can fetch the real content under RLS instead of trusting the
 * client with what goes into the system prompt.
 *
 * No history parameter (033): the route derives its own context from
 * `agent_messages` server-side rather than trusting a client-supplied
 * transcript — the client only ever sends the new message.
 */
export async function sendAgentMessage(message: string, options?: { lessonId?: string }) {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, lessonId: options?.lessonId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Your agent is unavailable right now.");
  }
  return data.reply as string;
}

/**
 * Direct read under RLS ("Agent messages: owner reads") — no API route
 * needed, same reasoning as setAgentChosenName below. Used to restore
 * conversation history in the UI on load/open (033), closing the "dies
 * on every reload" half of TECH_DEBT #17. Same AGENT_CONTEXT_WINDOW the
 * server uses for its own OpenAI context, so what a user sees on screen
 * always matches what the agent actually remembers.
 */
export async function getRecentAgentMessages(userId: string): Promise<AgentMsg[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("agent_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(AGENT_CONTEXT_WINDOW);

  if (error || !data) return [];
  return data.reverse() as AgentMsg[];
}

/**
 * Plain RLS-guarded update ("Agent profile: owner", for all) — no points
 * or other side effects, so no dedicated API route.
 *
 * The `.select()` is the point, not decoration. Without it, an UPDATE
 * whose rows RLS filtered away returns **no error and no data** — the
 * silent-success class this codebase has already been bitten by three
 * times (018's rollback that never deleted, 015c's insert, and the whole
 * reason migration 030 exists). Here it would be especially nasty: the
 * name would appear to save, the picker would close, and the naming
 * screen would return on the next page because the database never
 * actually changed — indistinguishable, from the outside, from a
 * caching bug.
 *
 * Returning zero rows is therefore treated as a failure the user is
 * told about, rather than a success they later have to doubt. Found
 * while investigating TECH_DEBT #30; it was NOT the cause there (the
 * update was verified landing on three separate fresh accounts), but it
 * is a real hole regardless of what #30 turns out to be.
 */
export async function setAgentChosenName(userId: string, chosenName: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("user_agent_profiles")
    .update({ chosen_name: chosenName })
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) return { error };
  if (!data) return { error: { message: "Agent name update matched no row" } };
  return { error: null };
}

export interface FreshAgentState {
  chosenName: string;
  needsNaming: boolean;
}

/**
 * Direct read under RLS ("Agent profile: owner") — same reasoning as
 * getRecentAgentMessages above: the server props passed on first render
 * (initialChosenName AND initialNeedsNaming) can both be stale (Router
 * Cache), so components re-read on mount to pick up a rename made
 * moments earlier on a different page. needsNaming uses the exact same
 * updated_at/created_at formula as getAgentInitialState server-side
 * (agent.service.ts) — kept in sync by hand, not shared, since one is a
 * server-only Supabase client and the other a browser one.
 */
export async function getFreshAgentState(userId: string): Promise<FreshAgentState | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("user_agent_profiles")
    .select("chosen_name, created_at, updated_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return {
    chosenName: data.chosen_name as string,
    needsNaming: data.updated_at === data.created_at,
  };
}
