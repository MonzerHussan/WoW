"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { addDecisionLogEntry } from "@/shared/services/decision-log.service";

/**
 * "Write & save" lesson exercise (Level 2 Unit 0's own brief): a single
 * free-text answer to a FIXED prompt, saved as one real decision_log row
 * — not the general 3-field form projects' own DecisionLogPanel offers,
 * because here the prompt is the lesson's, not something the learner
 * writes themselves. `situation` holds the prompt (so the row reads
 * standalone later), `decision` holds the learner's answer, `reason`
 * holds `sourceKey` (a stable slug identifying which lesson/exercise
 * this came from — e.g. "unit1_lesson_1_1_wbs_reflection"), matching the
 * existing "slug in a text column, UI translates if needed" convention.
 */
export function LessonReflectionForm({
  projectId,
  promptAr,
  promptEn,
  sourceKey,
  category = null,
  lang,
}: {
  projectId: string;
  promptAr: string;
  promptEn: string;
  sourceKey: string;
  category?: string | null;
  lang: Lang;
}) {
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!answer.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await addDecisionLogEntry(projectId, {
        situation: lang === "ar" ? promptAr : promptEn,
        decision: answer.trim(),
        reason: sourceKey,
        category,
      });
      if (insertError) {
        setError(t("level2.reflectionErrGeneric", lang));
        return;
      }
      setSaved(true);
    } catch {
      setError(t("level2.reflectionErrGeneric", lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy text-sm mb-2">{t("level2.reflectionTitle", lang)}</h3>
      <p className="text-sm text-ink mb-3">{lang === "ar" ? promptAr : promptEn}</p>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      {saved ? (
        <p className="text-sm font-semibold text-navy bg-navy/5 rounded-lg p-3">{t("level2.reflectionSaved", lang)}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            className="field-input min-h-[6rem]"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={500}
            placeholder={t("level2.reflectionPlaceholder", lang)}
          />
          <Button onClick={handleSave} disabled={saving || !answer.trim()}>
            {saving ? t("level2.reflectionSaving", lang) : t("level2.reflectionSave", lang)}
          </Button>
        </div>
      )}
    </Card>
  );
}
