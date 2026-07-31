"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { sendAgentMessage } from "@/features/agent/services/agent.client";

/**
 * The lesson's writing task. Originally the interactive half of a
 * module's closing content — everything else (series_episode,
 * listening_suggestion, career_dna_skills, capstone_task) stays a
 * passive display row in ModuleClosingCard. Since 023 most tasks come
 * from `content.language_task` on ordinary mid-module lessons instead;
 * either way this component only receives an already-resolved
 * `taskText`/`coinCost` (see `resolveLanguageTask`) and never decides
 * the price itself. This is the first
 * real spend_coins() (007b) call site: submit → /api/lms/language-task/submit
 * charges the coins server-side, then (only on success) the same message
 * is handed to the existing /api/agent chat path for feedback — no
 * second OpenAI call site.
 *
 * `lang` is a prop, not this component's own useLang() — it shares one
 * toggle with the rest of the lesson page (LessonView), not a second
 * independent one.
 */
export function LanguageTaskCard({
  lessonId,
  taskText,
  coinCost,
  initialBalance,
  initialSubmitted,
  lang,
}: {
  lessonId: string;
  taskText: string;
  coinCost: number;
  initialBalance: number;
  initialSubmitted: boolean;
  lang: Lang;
}) {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  // Optional, not forced (item #5 of the UI review) — the browser's
  // native spellcheck defaulted on with no way to turn it off.
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);

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
          setError(t("lms.languageTaskInsufficientCoins", lang));
        } else if (res.status === 409) {
          setError(t("lms.languageTaskAlreadySubmitted", lang));
          setSubmitted(true);
        } else {
          setError(data?.error || t("common.somethingWentWrong", lang));
        }
        return;
      }

      setBalance((b) => b - coinCost);
      setSubmitted(true);

      try {
        const reply = await sendAgentMessage(
          // "لهذا الدرس", not "لهذه الوحدة": since 023 most of these
          // tasks belong to a single mid-module lesson, not a module ending.
          // Trailing instruction (item #11 of the UI review, product
          // decision): if the response isn't real, recognizable English
          // (random characters, keyboard-mashing), the agent must not
          // fabricate a full corrected version — it should decline
          // gently and ask for a genuine English attempt instead. Same
          // condition applied to PronunciationPractice's request below.
          `مهمة اللغة الإنجليزية لهذا الدرس:\n"${taskText}"\n\nردّي:\n${response}\n\nمن فضلك أعطني تغذية راجعة بالإنجليزية على القواعد والوضوح والمحتوى، بأسلوب مشجّع. لكن إن كان ردّي أعلاه غير مفهوم أو لا يحتوي كلمات إنجليزية حقيقية (نص عشوائي أو حروف عشوائية)، فلا تكتب لي تصحيحًا كاملًا جاهزًا — بدلًا من ذلك ارفضي بلطف واطلبي مني كتابة محاولة حقيقية بالإنجليزية أولاً.`
        );
        setFeedback(reply);
      } catch {
        // The submission itself already succeeded and is charged — a
        // feedback-fetch hiccup shouldn't look like the task failed.
      }
    } catch {
      setError(t("common.somethingWentWrong", lang));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <p className="text-sm font-bold text-navy bg-navy/5 rounded-lg px-4 py-2 w-fit">
          {t("lms.languageTaskSubmitted", lang)}
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
          {t("lms.coinCost", lang)}: {coinCost} {t("lms.coinsUnit", lang)}
        </span>
        <span>
          {t("lms.walletBalance", lang)}: {balance} {t("lms.coinsUnit", lang)}
        </span>
      </div>
      <textarea
        className="field-input w-full min-h-[120px] mb-2"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder={t("lms.languageTaskPlaceholder", lang)}
        spellCheck={spellcheckEnabled}
      />
      <label className="flex items-center gap-2 text-xs text-ink-soft mb-3 w-fit cursor-pointer">
        <input
          type="checkbox"
          checked={spellcheckEnabled}
          onChange={(e) => setSpellcheckEnabled(e.target.checked)}
        />
        {t("lms.spellcheckToggle", lang)}
      </label>
      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      <Button onClick={handleSubmit} disabled={submitting || response.trim().length < 20}>
        {submitting ? t("lms.languageTaskSubmitting", lang) : t("lms.languageTaskSubmit", lang)}
      </Button>
    </div>
  );
}
