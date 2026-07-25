"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { sendAgentMessage } from "@/features/agent/services/agent.client";

/**
 * The interactive half of a module's closing content — everything else
 * (series_episode, listening_suggestion, career_dna_skills, capstone_task)
 * stays a passive display row in ModuleClosingCard. This is the first
 * real spend_coins() (007b) call site: submit → /api/lms/language-task/submit
 * charges the coins server-side, then (only on success) the same message
 * is handed to the existing /api/agent chat path for feedback — no
 * second OpenAI call site.
 */
export function LanguageTaskCard({
  lessonId,
  taskText,
  coinCost,
  initialBalance,
  initialSubmitted,
}: {
  lessonId: string;
  taskText: string;
  coinCost: number;
  initialBalance: number;
  initialSubmitted: boolean;
}) {
  const { t } = useLang("ar");
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [balance, setBalance] = useState(initialBalance);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/lms/language-task/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, response }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setBalance(data.balance ?? balance);
          setError(t("lms.languageTaskInsufficientCoins"));
        } else if (res.status === 409) {
          setError(t("lms.languageTaskAlreadySubmitted"));
          setSubmitted(true);
        } else {
          setError(data?.error || t("common.somethingWentWrong"));
        }
        return;
      }

      setBalance((b) => b - coinCost);
      setSubmitted(true);

      try {
        const reply = await sendAgentMessage(
          `مهمة اللغة الإنجليزية لهذه الوحدة:\n"${taskText}"\n\nردّي:\n${response}\n\nمن فضلك أعطني تغذية راجعة بالإنجليزية على القواعد والوضوح والمحتوى، بأسلوب مشجّع.`,
          []
        );
        setFeedback(reply);
      } catch {
        // The submission itself already succeeded and is charged — a
        // feedback-fetch hiccup shouldn't look like the task failed.
      }
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <p className="text-sm font-bold text-navy bg-navy/5 rounded-lg px-4 py-2 w-fit">
          {t("lms.languageTaskSubmitted")}
        </p>
        {feedback && <p className="text-sm text-ink leading-relaxed mt-3 bg-bg rounded-lg p-4">{feedback}</p>}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink mb-2">{taskText}</p>
      <div className="flex items-center justify-between text-xs text-ink-soft mb-2">
        <span>
          {t("lms.coinCost")}: {coinCost} {t("lms.coinsUnit")}
        </span>
        <span>
          {t("lms.walletBalance")}: {balance} {t("lms.coinsUnit")}
        </span>
      </div>
      <textarea
        className="field-input w-full min-h-[120px] mb-3"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder={t("lms.languageTaskPlaceholder")}
      />
      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      <Button onClick={handleSubmit} disabled={submitting || response.trim().length < 20}>
        {submitting ? t("lms.languageTaskSubmitting") : t("lms.languageTaskSubmit")}
      </Button>
    </div>
  );
}
