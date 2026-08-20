"use client";

import { useState } from "react";
import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";
import { Card } from "@/shared/components/Feedback";
import { InstructorConversation } from "@/features/instructors/services/instructors.service";
import { AssignmentChat } from "@/features/instructors/components/AssignmentChat";

/**
 * The conversations list, shown to BOTH parties and identical for both —
 * a learner and an instructor are equals here. That symmetry is not a
 * simplification: 074's read policy and its send function are both
 * two-sided, so a UI that gave one party more would be inventing a
 * distinction the database does not make.
 *
 * Only ACCEPTED assignments appear, because only those can hold a
 * message (074 returns `assignment_not_accepted` otherwise). The list is
 * therefore a reflection of the rule, not an enforcement of it — the
 * refusal is tested directly against the function, not against this
 * component.
 *
 * Rendered nowhere unless there is at least one conversation: an empty
 * "no conversations" card on the instructors page would sit directly
 * beneath the existing empty-state for links and say the same thing
 * twice.
 */
export function ConversationsPanel({
  conversations,
  myUserId,
  lang,
}: {
  conversations: InstructorConversation[];
  myUserId: string;
  lang: Lang;
}) {
  const [openId, setOpenId] = useState<string | null>(
    conversations.length === 1 ? conversations[0].assignmentId : null
  );

  if (conversations.length === 0) return null;

  const open = conversations.find((c) => c.assignmentId === openId) || null;

  return (
    <section className="mb-8">
      <h2 className="font-display font-bold text-navy text-sm mb-1">
        {t("instructors.conversationsTitle", lang)}
      </h2>
      <p className="text-xs text-ink-soft mb-3">{t("instructors.conversationsIntro", lang)}</p>

      <div className="flex flex-col gap-2 mb-3">
        {conversations.map((c) => {
          const name = c.counterpartName || t("instructors.chatUnnamedParty", lang);
          const isOpen = c.assignmentId === openId;
          return (
            <Card key={c.assignmentId} className="p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : c.assignmentId)}
                className="w-full text-start p-4 flex items-center gap-3"
              >
                {c.counterpartAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.counterpartAvatarUrl}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                    🧑
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink truncate">{name}</p>
                  <p className="text-xs text-ink-soft truncate">
                    {c.iAmInstructor
                      ? t("instructors.chatRoleLearner", lang)
                      : t("instructors.chatRoleInstructor", lang)}
                    {c.context ? ` · ${c.context}` : ""}
                  </p>
                </div>
                <span className="text-xs font-bold text-navy shrink-0">
                  {isOpen ? t("instructors.chatClose", lang) : t("instructors.chatOpen", lang)}
                </span>
              </button>
            </Card>
          );
        })}
      </div>

      {/* Keyed on the assignment so switching conversations remounts the
          chat: its messages, its poll timer and its draft all belong to
          one thread and must not survive into another. */}
      {open && (
        <AssignmentChat
          key={open.assignmentId}
          conversation={open}
          myUserId={myUserId}
          lang={lang}
        />
      )}
    </section>
  );
}
