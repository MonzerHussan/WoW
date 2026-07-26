"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { AgentMsg } from "@/features/agent/services/agent.client";
import { isOffline } from "@/shared/i18n/supabase-errors";

/**
 * The one-time English placement conversation — same chat anatomy as
 * AgentChat (bubbles, client-held history, Enter to send) pointed at
 * /api/agent/placement instead of /api/agent, plus three extra states:
 * the invitation card (not started), the completed card (level shown),
 * and mid-conversation completion when the server reports the agent
 * emitted its placement block. A 409 from the server also flips to
 * completed — the server-side guard is the source of truth, this UI
 * only reflects it.
 */
export function PlacementChat({
  initialPlaced,
  initialLevel,
  lang = "ar" as Lang,
}: {
  initialPlaced: boolean;
  initialLevel: string | null;
  lang?: Lang;
}) {
  const [placed, setPlaced] = useState(initialPlaced);
  const [level, setLevel] = useState<string | null>(initialLevel);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: AgentMsg = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, history: nextMessages.slice(0, -1) }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setPlaced(true);
        setLevel(data.level ?? null);
        return;
      }
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data?.error || t("agent.unavailable", lang) }]);
        return;
      }

      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.completed) {
        setPlaced(true);
        setLevel(data.level ?? null);
      }
    } catch (err) {
      console.error("[placement] send failed:", err);
      const content = isOffline() ? t("authErrors.offline", lang) : t("agent.unavailable", lang);
      setMessages((m) => [...m, { role: "assistant", content }]);
    } finally {
      setLoading(false);
    }
  }

  if (placed) {
    return (
      <div className="bg-white border border-line rounded-wow p-5 mb-6">
        <p className="text-sm font-bold text-navy">
          {t("placement.completedTitle", lang)}{" "}
          <span className="inline-block bg-navy text-white rounded-full px-3 py-0.5 text-sm font-black">{level}</span>
        </p>
        <p className="text-xs text-ink-soft mt-2">{t("placement.retestLater", lang)}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="bg-white border border-line rounded-wow p-5 mb-6">
        <h2 className="font-display font-bold text-navy text-sm mb-1">{t("placement.inviteTitle", lang)}</h2>
        <p className="text-sm text-ink-soft mb-3">{t("placement.inviteBody", lang)}</p>
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {t("placement.inviteCta", lang)}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-wow p-5 mb-6 flex flex-col h-[380px]">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pe-1">
        <div className="self-start bg-bg text-ink text-sm rounded-xl rounded-ss-sm px-3 py-2 max-w-[85%]">
          {t("placement.introBubble", lang)}
        </div>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${
              m.role === "user" ? "self-end bg-navy text-white rounded-ee-sm" : "self-start bg-bg text-ink rounded-ss-sm"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="self-start text-xs text-ink-soft px-3">{t("agent.thinking", lang)}</div>}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="field-input flex-1"
          dir="ltr"
          placeholder={t("placement.placeholder", lang)}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-xl bg-navy text-white px-4 text-sm font-bold disabled:opacity-60"
        >
          {t("agent.send", lang)}
        </button>
      </div>
    </div>
  );
}
