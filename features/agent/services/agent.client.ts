import { supabaseBrowser } from "@/shared/lib/supabase/client";

export type AgentMsg = { role: "user" | "assistant"; content: string };

/**
 * `lessonId` is optional and sent only by the floating agent on a lesson
 * page. Note that only the id travels — never lesson text — so the
 * route can fetch the real content under RLS instead of trusting the
 * client with what goes into the system prompt.
 */
export async function sendAgentMessage(
  message: string,
  history: AgentMsg[],
  options?: { lessonId?: string }
) {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, lessonId: options?.lessonId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Your agent is unavailable right now.");
  }
  return data.reply as string;
}

/**
 * Plain RLS-guarded update ("Agent profile: owner", for all) — no points
 * or other side effects, so no dedicated API route.
 */
export async function setAgentChosenName(userId: string, chosenName: string) {
  const supabase = supabaseBrowser();
  return supabase.from("user_agent_profiles").update({ chosen_name: chosenName }).eq("user_id", userId);
}
