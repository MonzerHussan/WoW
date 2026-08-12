"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { getSpotterStatements, SpotterStatement } from "@/features/games/services/game.service";
import { spotterAnswerPayloadSchema } from "@/shared/schemas/game.schema";

/**
 * Timer is motivational only (brief's own explicit instruction — "ليس
 * عقابًا"), never disqualifying and never sent to the server: scoring
 * (038's complete_game_attempt) only ever looks at correctness.
 */
export function SpotterField({
  lang,
  submitting,
  onSubmit,
}: {
  lang: Lang;
  submitting: boolean;
  onSubmit: (payload: Record<string, any>) => void;
}) {
  const [statements, setStatements] = useState<SpotterStatement[]>([]);
  const [answers, setAnswers] = useState<Record<string, "project" | "operation">>({});
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    getSpotterStatements(supabaseBrowser(), 10).then(setStatements);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function choose(id: string, type: "project" | "operation") {
    setAnswers((a) => ({ ...a, [id]: type }));
  }

  function handleSubmit() {
    const payload = {
      answers: Object.entries(answers).map(([statementId, type]) => ({ statementId, type })),
    };
    const parsed = spotterAnswerPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    onSubmit(parsed.data);
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>{t("games.spotterInstructions", lang)}</span>
        <span className="tabular-nums">⏱ {elapsed}s</span>
      </div>

      {statements.map((s) => (
        <div key={s.id} className="border border-line rounded-lg p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-ink flex-1">{lang === "ar" ? s.text_ar : s.text_en}</p>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => choose(s.id, "project")}
              className={`px-2 py-1 text-xs rounded-full border font-bold transition ${
                answers[s.id] === "project" ? "bg-navy text-white border-navy" : "border-line text-ink-soft"
              }`}
            >
              {t("games.spotterProjectBtn", lang)}
            </button>
            <button
              type="button"
              onClick={() => choose(s.id, "operation")}
              className={`px-2 py-1 text-xs rounded-full border font-bold transition ${
                answers[s.id] === "operation" ? "bg-navy text-white border-navy" : "border-line text-ink-soft"
              }`}
            >
              {t("games.spotterOperationBtn", lang)}
            </button>
          </div>
        </div>
      ))}

      <Button onClick={handleSubmit} disabled={submitting || answeredCount < 5}>
        {submitting ? t("games.submitting", lang) : t("games.submit", lang)}
      </Button>
    </div>
  );
}
