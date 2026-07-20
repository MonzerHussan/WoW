"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { isOffline } from "@/shared/i18n/supabase-errors";
import { Lang } from "@/shared/types";
import { sendNovaMessage, NovaMsg } from "@/features/nova/services/nova.client";

export default function NovaChat({ lang = "ar" as Lang }) {
  const [messages, setMessages] = useState<NovaMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: NovaMsg = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendNovaMessage(userMsg.content, nextMessages.slice(0, -1));
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("[nova] send failed:", err);
      const content = isOffline() ? t("authErrors.offline", lang) : t("nova.unavailable", lang);
      setMessages((m) => [...m, { role: "assistant", content }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-line rounded-wow p-5 flex flex-col h-[420px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-purple flex items-center justify-center text-white font-display font-black text-sm">
          N
        </div>
        <h3 className="font-display font-bold text-navy text-sm">{t("nova.title", lang)}</h3>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pe-1">
        <div className="self-start bg-bg text-ink text-sm rounded-xl rounded-ss-sm px-3 py-2 max-w-[85%]">
          {t("nova.intro", lang)}
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
        {loading && <div className="self-start text-xs text-ink-soft px-3">{t("nova.thinking", lang)}</div>}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="field-input flex-1"
          placeholder={t("nova.placeholder", lang)}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-xl bg-navy text-white px-4 text-sm font-bold disabled:opacity-60"
        >
          {t("nova.send", lang)}
        </button>
      </div>
    </div>
  );
}
