"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { ErrorState } from "@/shared/components/Feedback";
import { InstructorConversation } from "@/features/instructors/services/instructors.service";
import {
  getAssignmentMessages,
  sendInstructorMessage,
  InstructorMsg,
  SendMessageFailureReason,
} from "@/features/instructors/services/instructor.client";

/**
 * A conversation between the two parties to an ACCEPTED assignment.
 *
 * Built on AgentChat's shape deliberately (same bubbles, same
 * self-end/self-start alignment, same input + send row), so the platform
 * has ONE way a conversation looks. Two differences, both forced by the
 * domain rather than chosen:
 *
 *   - Sides are decided by `senderId === myUserId`, not by a role field.
 *     Here both participants are people and either may start; the agent
 *     chat's user/assistant split has no equivalent.
 *   - It polls. The agent replies inside the same request, so AgentChat
 *     never needs to learn about a message it did not send. Here the
 *     other party writes independently, and without polling a reply is
 *     invisible until a manual reload — which for a paid conversation
 *     reads as the feature being broken.
 *
 * THE COUNTERPART'S NAME COMES FROM 077, and a raw id is never shown.
 * When the name is null the UI substitutes a generic label; falling back
 * to the uuid would leak an identifier and tell the reader nothing.
 */

/** Slow enough not to hammer PostgREST on an idle open tab, fast enough
 *  that a reply lands within a normal conversational pause. Only while a
 *  conversation is open — the interval is cleared on unmount and on
 *  switching conversations. */
const POLL_MS = 10_000;

function failureMessage(reason: SendMessageFailureReason, lang: Lang): string {
  switch (reason) {
    case "assignment_not_accepted":
      return t("instructors.chatErrNotAccepted", lang);
    case "not_authorized":
      return t("instructors.chatErrNotAuthorized", lang);
    case "assignment_not_found":
      return t("instructors.errNotFound", lang);
    case "empty_content":
      return t("instructors.chatErrEmpty", lang);
    default:
      return t("instructors.chatErrUnknown", lang);
  }
}

export function AssignmentChat({
  conversation,
  myUserId,
  lang,
}: {
  conversation: InstructorConversation;
  myUserId: string;
  lang: Lang;
}) {
  const [messages, setMessages] = useState<InstructorMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const assignmentId = conversation.assignmentId;

  const refresh = useCallback(async () => {
    const rows = await getAssignmentMessages(assignmentId);
    // Replace wholesale rather than merge: the server's ordering by
    // created_at is the truth, and a merge would have to reconcile the
    // optimistic row below against its real counterpart by content.
    setMessages(rows);
    setLoaded(true);
  }, [assignmentId]);

  useEffect(() => {
    setMessages([]);
    setLoaded(false);
    setError(null);
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);

    const result = await sendInstructorMessage(assignmentId, content);

    if (!result.ok) {
      // The text stays in the box on failure — retyping a message the
      // platform failed to deliver is the user paying for our error.
      setError(failureMessage(result.reason, lang));
      setSending(false);
      return;
    }

    setInput("");
    await refresh();
    setSending(false);
  }

  const counterpart = conversation.counterpartName || t("instructors.chatUnnamedParty", lang);

  return (
    <div className="bg-white border border-line rounded-wow p-5 flex flex-col h-[420px]">
      <div className="flex items-center gap-2 mb-3">
        {conversation.counterpartAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={conversation.counterpartAvatarUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center shrink-0 text-sm">
            🧑
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-display font-bold text-navy text-sm truncate">{counterpart}</h3>
          <p className="text-xs text-ink-soft">
            {conversation.iAmInstructor
              ? t("instructors.chatRoleLearner", lang)
              : t("instructors.chatRoleInstructor", lang)}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-2">
          <ErrorState message={error} />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 pe-1">
        {conversation.context && (
          <div className="self-start bg-bg text-ink-soft text-xs rounded-xl px-3 py-2 max-w-[85%]">
            {t("instructors.chatOriginalRequest", lang)}: {conversation.context}
          </div>
        )}

        {loaded && messages.length === 0 && (
          <p className="text-xs text-ink-soft px-1 py-2">{t("instructors.chatEmpty", lang)}</p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${
              m.senderId === myUserId
                ? "self-end bg-navy text-white rounded-ee-sm"
                : "self-start bg-bg text-ink rounded-ss-sm"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="field-input flex-1"
          placeholder={t("instructors.chatPlaceholder", lang)}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="rounded-xl bg-navy text-white px-4 text-sm font-bold disabled:opacity-60"
        >
          {sending ? t("instructors.chatSending", lang) : t("instructors.chatSend", lang)}
        </button>
      </div>
    </div>
  );
}
