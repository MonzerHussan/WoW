export type NovaMsg = { role: "user" | "assistant"; content: string };

export async function sendNovaMessage(message: string, history: NovaMsg[]) {
  const res = await fetch("/api/nova", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Nova is unavailable right now.");
  }
  return data.reply as string;
}
