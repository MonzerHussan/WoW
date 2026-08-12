"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { GameVariant } from "@/shared/schemas/game.schema";
import { strategyAlignmentPayloadSchema } from "@/shared/schemas/game.schema";
import { sendAgentMessage } from "@/features/agent/services/agent.client";

export function StrategyAlignmentField({
  variant,
  scenario,
  projectName,
  lang,
  submitting,
  onSubmit,
}: {
  variant: GameVariant;
  scenario: Record<string, any> | null;
  projectName?: string;
  lang: Lang;
  submitting: boolean;
  onSubmit: (payload: Record<string, any>) => void;
}) {
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);

  const orgStrategy = scenario ? (lang === "ar" ? scenario.org_strategy_ar : scenario.org_strategy_en) : null;

  async function handleSubmit() {
    const parsed = strategyAlignmentPayloadSchema.safeParse({ response });
    if (!parsed.success) return;
    onSubmit(parsed.data);

    setFetchingFeedback(true);
    try {
      const subject = variant === "project" ? projectName || "مشروعي" : orgStrategy || "";
      const reply = await sendAgentMessage(
        `لعبة مواءمة الاستراتيجية: اربط هذا المشروع "${subject}" باستراتيجية منظمته.\n\nإجابة المتدرب:\n${response}\n\nمن فضلك أعطِ تغذية راجعة قصيرة ومشجعة بالإنجليزية على مدى وضوح الربط بين المشروع والاستراتيجية.`
      );
      setFeedback(reply);
    } catch {
      // Completion already succeeded; a feedback hiccup shouldn't look like the submission failed.
    } finally {
      setFetchingFeedback(false);
    }
  }

  if (feedback) {
    return <p className="text-sm text-ink leading-relaxed bg-bg rounded-lg p-4">{feedback}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {orgStrategy && (
        <p className="text-xs text-ink-soft">
          <span className="font-bold">{t("games.orgStrategyLabel", lang)}:</span> {orgStrategy}
        </p>
      )}
      <textarea
        className="field-input w-full min-h-[100px]"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder={t("games.responsePlaceholder", lang)}
        maxLength={2000}
      />
      <Button onClick={handleSubmit} disabled={submitting || fetchingFeedback || response.trim().length < 20}>
        {submitting || fetchingFeedback ? t("games.submitting", lang) : t("games.submit", lang)}
      </Button>
    </div>
  );
}
