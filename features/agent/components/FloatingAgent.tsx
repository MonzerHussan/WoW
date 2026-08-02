"use client";

import { useState, useRef, useEffect } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import {
  sendAgentMessage,
  getRecentAgentMessages,
  getFreshAgentState,
  AgentMsg,
} from "@/features/agent/services/agent.client";
import { isOffline } from "@/shared/i18n/supabase-errors";
import { AgentNamePicker } from "@/features/agent/components/AgentNamePicker";
import { AgentVoiceCall } from "@/features/agent/components/AgentVoiceCall";

/**
 * The agent, reachable from anywhere — a floating button plus a small
 * chat panel, as opposed to `AgentChat`, which is a fixed card inside a
 * page's own layout.
 *
 * Deliberately NOT mounted in `app/layout.tsx`: it is composed per page
 * (dashboard, profile, courses, lesson player), each of which already
 * resolves the user server-side. That keeps the rule that a visitor who
 * isn't signed in never sees it at all — there is no client-side "hide
 * if no user" branch here, because the component is simply never
 * rendered for them. See TECH_DEBT for the route-group alternative once
 * the number of host pages grows.
 *
 * Conversation state is seeded once from `agent_messages` (033) the
 * first time the panel is opened — closing/reopening within the same
 * mount keeps it in memory as before; navigating to a fresh page
 * re-seeds from the same persisted history, closing the "dies on every
 * reload" half of TECH_DEBT #17.
 */
export function FloatingAgent({
  userId,
  initialChosenName,
  initialNeedsNaming,
  lang: initialLang = "ar" as Lang,
  lessonId,
}: {
  userId: string;
  initialChosenName: string;
  initialNeedsNaming: boolean;
  lang?: Lang;
  /** Set only on a lesson page: makes the agent aware of the material being read. */
  lessonId?: string;
}) {
  const { lang, dir, t } = useLang(initialLang);
  const [open, setOpen] = useState(false);
  const [chosenName, setChosenName] = useState(initialChosenName);
  const [needsNaming, setNeedsNaming] = useState(initialNeedsNaming);
  const [inCall, setInCall] = useState(false);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seeded once, the first time the panel is actually opened — not on
  // every page mount, since most pages that render this component are
  // never opened at all and the read would be wasted.
  useEffect(() => {
    if (!open || historyLoaded) return;
    setHistoryLoaded(true);
    getRecentAgentMessages(userId).then((past) => {
      if (past.length > 0) setMessages((m) => (m.length > 0 ? m : past));
    });
  }, [open, historyLoaded, userId]);

  // initialChosenName/initialNeedsNaming come from a server-rendered prop
  // that can be stale (Router Cache) right after naming/renaming on a
  // different page — re-read both directly on mount. needsNaming is only
  // ever corrected true -> false here, never the other way: if the local
  // state already trusts a saved name (e.g. onNamed just fired in this
  // same mount), a stale-in-the-opposite-direction read must not yank the
  // naming screen back over an open conversation.
  useEffect(() => {
    getFreshAgentState(userId).then((fresh) => {
      if (!fresh) return;
      setChosenName((c) => (c === fresh.chosenName ? c : fresh.chosenName));
      if (!fresh.needsNaming) setNeedsNaming(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // The panel is short; without this a reply can land below the fold and
  // look like nothing happened.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: AgentMsg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendAgentMessage(userMsg.content, { lessonId });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("[floating-agent] send failed:", err);
      const content = isOffline() ? t("authErrors.offline") : t("agent.unavailable");
      setMessages((m) => [...m, { role: "assistant", content }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div
          dir={dir}
          className="fixed bottom-24 end-5 z-50 w-[22rem] max-w-[calc(100vw-2.5rem)] h-[26rem] bg-white border border-line rounded-wow shadow-2xl flex flex-col p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple flex items-center justify-center text-white font-display font-black text-sm shrink-0">
              {chosenName.charAt(0)}
            </div>
            <h3 className="font-display font-bold text-navy text-sm flex-1 truncate">{chosenName}</h3>
            {/* Hidden until the agent has a name: naming is the first
                interaction by design (007b), and a paid call before it
                would talk to an agent the user hasn't met yet. Also
                hidden during a call — ending it is the call view's job. */}
            {!needsNaming && !inCall && (
              <button
                type="button"
                onClick={() => setInCall(true)}
                aria-label={t("agent.voiceCallStart")}
                title={t("agent.voiceCallStart")}
                className="text-ink-soft hover:text-navy text-base leading-none px-1"
              >
                📞
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("agent.floatingClose")}
              className="text-ink-soft hover:text-navy text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>

          {inCall ? (
            <AgentVoiceCall agentName={chosenName} lang={lang} onClose={() => setInCall(false)} />
          ) : needsNaming ? (
            <div className="flex-1 flex items-center overflow-y-auto">
              <AgentNamePicker
                userId={userId}
                onNamed={(name) => {
                  setChosenName(name);
                  setNeedsNaming(false);
                }}
              />
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 pe-1">
                <div className="self-start bg-bg text-ink text-sm rounded-xl rounded-ss-sm px-3 py-2 max-w-[90%]">
                  {t("agent.introPrefix")} {chosenName} {t("agent.introSuffix")}
                </div>
                {/* Only when the agent actually has the lesson in context —
                    the route builds that block from `lessonId`, so this
                    promise is not decorative. */}
                {lessonId && (
                  <div className="self-start bg-orange/10 text-ink text-xs rounded-xl px-3 py-2 max-w-[90%]">
                    {t("agent.lessonAwareIntro")}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-sm rounded-xl px-3 py-2 max-w-[90%] whitespace-pre-wrap ${
                      m.role === "user"
                        ? "self-end bg-navy text-white rounded-ee-sm"
                        : "self-start bg-bg text-ink rounded-ss-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="self-start text-xs text-ink-soft px-3">
                    {chosenName} {t("agent.thinking")}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <input
                  className="field-input flex-1 text-sm"
                  placeholder={t("agent.placeholder")}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button
                  onClick={send}
                  disabled={loading}
                  className="rounded-xl bg-navy text-white px-3 text-sm font-bold disabled:opacity-60"
                >
                  {t("agent.send")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* z-50 clears the lesson player's sticky header (z-10). */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t("agent.floatingClose") : t("agent.floatingOpen")}
        aria-expanded={open}
        className="fixed bottom-5 end-5 z-50 w-14 h-14 rounded-full bg-purple text-white text-2xl shadow-xl flex items-center justify-center hover:scale-105 transition"
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
