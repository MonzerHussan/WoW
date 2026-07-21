import { supabaseBrowser } from "@/shared/lib/supabase/client";

export type AgentMsg = { role: "user" | "assistant"; content: string };

export async function sendAgentMessage(message: string, history: AgentMsg[]) {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
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
