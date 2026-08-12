"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { getPricingUnit } from "@/shared/services/pricing.service";
import { startKbAttempt, completeFinalBossAttempt, KbScenario, KbCompleteResult } from "@/features/level2/services/kb-game.client";

/**
 * Level 2's capstone — 4-6 randomly drawn crisis scenarios (046+061),
 * one decision each. Every answer is scored server-side against
 * kb_scoring_rules; the speed bonus is computed server-side from real
 * kb_game_attempts timestamps (created_at → now()) — this component
 * never measures or reports its own elapsed time, so there is nothing
 * here for a client to fake.
 */
export function FinalBossGame({ lang }: { lang: Lang }) {
  const [price, setPrice] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<KbScenario[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KbCompleteResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPricingUnit(supabaseBrowser(), "game_level2_final_boss").then((p) => {
      if (!cancelled) setPrice(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const res = await startKbAttempt("level2_final_boss");
      if (!res.allowed || !res.attemptId || !res.scenarios?.length) {
        setError(res.reason === "insufficient_balance" ? t("level2.errInsufficientBalance", lang) : t("level2.errGeneric", lang));
        return;
      }
      setAttemptId(res.attemptId);
      setScenarios(res.scenarios);
      setAnswers({});
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (!attemptId || !scenarios) return;
    const payload = scenarios.map((s) => ({ scenarioKey: s.scenarioKey, choiceKey: answers[s.scenarioKey] || "" }));
    setSubmitting(true);
    setError(null);
    try {
      const res = await completeFinalBossAttempt(attemptId, payload);
      setResult(res);
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setSubmitting(false);
    }
  }

  const allAnswered = !!scenarios?.length && scenarios.every((s) => !!answers[s.scenarioKey]);

  return (
    <Card className="p-5">
      <h3 className="font-display font-black text-lg text-navy mb-1">{t("level2.finalBossTitle", lang)}</h3>
      <p className="text-sm text-ink-soft mb-3">{t("level2.finalBossDesc", lang)}</p>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      {!attemptId && !result && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-soft">
            {t("level2.costPrefix", lang)} {price ?? "—"} {t("level2.coinsUnit", lang)}
          </span>
          <Button onClick={handleStart} disabled={starting || price === null}>
            {starting ? t("level2.starting", lang) : t("level2.playCta", lang)}
          </Button>
        </div>
      )}

      {attemptId && scenarios && !result && (
        <div className="flex flex-col gap-5">
          {scenarios.map((scenario, i) => {
            const choices: { key: string; label_ar: string; label_en: string }[] = scenario.body.choices || [];
            return (
              <div key={scenario.scenarioKey} className="border border-line rounded-xl p-4">
                <p className="text-xs font-bold text-orange-dark uppercase tracking-wide mb-1">
                  {t("level2.finalBossScenarioOf", lang)} {i + 1}/{scenarios.length} — {lang === "ar" ? scenario.titleAr : scenario.titleEn}
                </p>
                <p className="text-sm text-ink leading-relaxed mb-3">
                  {lang === "ar" ? scenario.body.context_ar : scenario.body.context_en}
                </p>
                <div className="flex flex-col gap-1.5">
                  {choices.map((choice) => (
                    <label
                      key={choice.key}
                      className={`text-sm rounded-lg px-3 py-2 border cursor-pointer transition ${
                        answers[scenario.scenarioKey] === choice.key ? "border-navy bg-navy/5 font-semibold" : "border-line hover:border-navy/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name={scenario.scenarioKey}
                        className="sr-only"
                        checked={answers[scenario.scenarioKey] === choice.key}
                        onChange={() => setAnswers((a) => ({ ...a, [scenario.scenarioKey]: choice.key }))}
                      />
                      {lang === "ar" ? choice.label_ar : choice.label_en}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? t("level2.submitting", lang) : t("level2.submit", lang)}
          </Button>
        </div>
      )}

      {result && result.completed && (
        <div className="text-center py-3">
          <p className="text-lg font-bold text-navy">{result.passed ? t("level2.passedTitle", lang) : t("level2.notPassedTitle", lang)}</p>
          <p className="text-sm text-ink-soft mt-1">
            {t("level2.scoreLabel", lang)}: {result.score}%
          </p>
          <div className="flex justify-center gap-4 mt-2 text-xs text-ink-soft">
            <span>
              {t("level2.contentScoreLabel", lang)}: {result.result?.contentScore}
            </span>
            <span>
              {t("level2.speedBonusLabel", lang)}: +{result.result?.speedBonus}
            </span>
          </div>
          {!result.passed && <p className="text-sm text-ink-soft mt-2">{t("level2.notPassedBody", lang)}</p>}
          <div className="text-start mt-4 flex flex-col gap-2">
            {result.result?.content?.items?.map((item, i) => (
              <div key={i} className="text-xs bg-bg rounded-lg p-2">
                {lang === "ar" ? item.feedbackAr : item.feedbackEn}
              </div>
            ))}
          </div>
          {!result.passed && (
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => {
                setResult(null);
                setAttemptId(null);
                setScenarios(null);
              }}
            >
              {t("level2.retryCta", lang)}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
