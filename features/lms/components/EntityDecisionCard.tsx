"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card, ErrorState, Loading } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { supabaseBrowser } from "@/shared/lib/supabase/client";

export interface EntityDecisionChoice {
  key: string;
  label_ar: string;
  label_en: string;
  feedback_ar?: string;
  feedback_en?: string;
}

export interface EntityDecisionScenario {
  scenario_key: string;
  entity_type: string;
  entity_key: string;
  situation_ar: string;
  situation_en: string;
  choices: EntityDecisionChoice[];
}

/**
 * Renders a single lesson-embedded Entity Memory decision point (066).
 * Deltas are never present client-side at all — this component only
 * ever sends which choice key was picked; submit_lesson_entity_
 * decision() looks up the actual effect server-side from the lesson's
 * own content. Once decided, the choice is permanent (lesson_entity_
 * decisions' unique constraint) — this component checks that on mount
 * and shows the frozen outcome instead of the picker.
 */
export function EntityDecisionCard({ lessonId, scenario, lang }: { lessonId: string; scenario: EntityDecisionScenario; lang: Lang }) {
  const supabase = supabaseBrowser();
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [decidedChoiceKey, setDecidedChoiceKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("lesson_entity_decisions")
        .select("choice_key")
        .eq("lesson_id", lessonId)
        .eq("scenario_key", scenario.scenario_key)
        .maybeSingle();
      if (cancelled) return;
      if (data) setDecidedChoiceKey(data.choice_key);
      setLoadingExisting(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, scenario.scenario_key]);

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/lms/entity-decisions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, scenarioKey: scenario.scenario_key, choiceKey: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("lms.entityDecisionFailed", lang));
        return;
      }
      setDecidedChoiceKey(selected);
    } catch {
      setError(t("lms.entityDecisionFailed", lang));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return (
      <Card className="p-5 mb-6">
        <Loading />
      </Card>
    );
  }

  const decidedChoice = decidedChoiceKey ? scenario.choices.find((c) => c.key === decidedChoiceKey) : null;

  return (
    <Card className="p-5 mb-6">
      <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.entityDecisionTitle", lang)}</h2>
      <p className="text-ink leading-relaxed mb-4">{lang === "ar" ? scenario.situation_ar : scenario.situation_en}</p>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      {decidedChoice ? (
        <div className="flex flex-col gap-2">
          <div className="border border-navy bg-navy/5 rounded-lg px-3 py-2 text-sm font-semibold text-ink">
            {lang === "ar" ? decidedChoice.label_ar : decidedChoice.label_en}
          </div>
          {(decidedChoice.feedback_ar || decidedChoice.feedback_en) && (
            <p className="text-sm text-ink-soft leading-relaxed">
              {lang === "ar" ? decidedChoice.feedback_ar : decidedChoice.feedback_en}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scenario.choices.map((choice) => (
            <label
              key={choice.key}
              className={`text-sm rounded-lg px-3 py-2 border cursor-pointer transition ${
                selected === choice.key ? "border-navy bg-navy/5 font-semibold" : "border-line hover:border-navy/30"
              }`}
            >
              <input
                type="radio"
                name={scenario.scenario_key}
                className="sr-only"
                checked={selected === choice.key}
                onChange={() => setSelected(choice.key)}
              />
              {lang === "ar" ? choice.label_ar : choice.label_en}
            </label>
          ))}
          <Button onClick={submit} disabled={!selected || submitting} className="mt-2">
            {submitting ? t("lms.entityDecisionSubmitting", lang) : t("lms.entityDecisionSubmit", lang)}
          </Button>
        </div>
      )}
    </Card>
  );
}
