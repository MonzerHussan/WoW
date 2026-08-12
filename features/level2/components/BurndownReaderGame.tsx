"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { getPricingUnit } from "@/shared/services/pricing.service";
import { startKbAttempt, completeBurndownReaderAttempt, KbScenario, KbCompleteResult } from "@/features/level2/services/kb-game.client";

interface DayRow {
  day: number;
  ideal: number;
  actual: number;
}
interface Question {
  key: string;
  text_ar: string;
  text_en: string;
  choices: { key: string; label_ar: string; label_en: string }[];
}

/**
 * Level 2 Unit 6's closing exercise — pure content reuse of the KB
 * engine (046/058), no chart library (confirmed none exists in this
 * project): the sprint's ideal/actual burndown is a plain text table,
 * not a rendered chart. Every answer is scored server-side against
 * kb_scoring_rules, same as Resource Optimizer.
 */
export function BurndownReaderGame({ lang }: { lang: Lang }) {
  const [price, setPrice] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<KbScenario | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KbCompleteResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPricingUnit(supabaseBrowser(), "game_level2_burndown_reader").then((p) => {
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
      const res = await startKbAttempt("level2_burndown_reader");
      if (!res.allowed || !res.attemptId || !res.scenarios?.[0]) {
        setError(res.reason === "insufficient_balance" ? t("level2.errInsufficientBalance", lang) : t("level2.errGeneric", lang));
        return;
      }
      setAttemptId(res.attemptId);
      setScenario(res.scenarios[0]);
      setAnswers({});
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (!attemptId || !scenario) return;
    const questions: Question[] = scenario.body.questions || [];
    const payload = questions.map((q) => ({ questionKey: q.key, answerKey: answers[q.key] || "" }));
    setSubmitting(true);
    setError(null);
    try {
      const res = await completeBurndownReaderAttempt(attemptId, payload);
      setResult(res);
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setSubmitting(false);
    }
  }

  const days: DayRow[] = scenario?.body.days || [];
  const questions: Question[] = scenario?.body.questions || [];
  const allAnswered = questions.length > 0 && questions.every((q) => !!answers[q.key]);

  return (
    <Card className="p-5">
      <h3 className="font-display font-black text-lg text-navy mb-1">{t("level2.burndownTitle", lang)}</h3>
      <p className="text-sm text-ink-soft mb-3">{t("level2.burndownDesc", lang)}</p>

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

      {attemptId && scenario && !result && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink leading-relaxed">{lang === "ar" ? scenario.body.context_ar : scenario.body.context_en}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-line text-xs text-ink-soft">
                  <th className="text-start py-1.5 pe-3">{t("level2.burndownDayLabel", lang)}</th>
                  <th className="text-start py-1.5 pe-3">{t("level2.burndownIdealLabel", lang)}</th>
                  <th className="text-start py-1.5">{t("level2.burndownActualLabel", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {days.map((row) => (
                  <tr key={row.day} className="border-b border-line/50">
                    <td className="py-1.5 pe-3 font-semibold">{row.day}</td>
                    <td className="py-1.5 pe-3 tabular-nums">{row.ideal}</td>
                    <td className="py-1.5 tabular-nums font-bold text-navy">{row.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4">
            {questions.map((q) => (
              <div key={q.key} className="border border-line rounded-xl p-3">
                <p className="font-bold text-sm text-navy mb-2">{lang === "ar" ? q.text_ar : q.text_en}</p>
                <div className="flex flex-col gap-1.5">
                  {q.choices.map((choice) => (
                    <label
                      key={choice.key}
                      className={`text-sm rounded-lg px-3 py-2 border cursor-pointer transition ${
                        answers[q.key] === choice.key ? "border-navy bg-navy/5 font-semibold" : "border-line hover:border-navy/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.key}
                        className="sr-only"
                        checked={answers[q.key] === choice.key}
                        onChange={() => setAnswers((a) => ({ ...a, [q.key]: choice.key }))}
                      />
                      {lang === "ar" ? choice.label_ar : choice.label_en}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

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
          {!result.passed && <p className="text-sm text-ink-soft mt-1">{t("level2.notPassedBody", lang)}</p>}
          <div className="text-start mt-4 flex flex-col gap-2">
            {result.result?.items?.map((item, i) => (
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
                setScenario(null);
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
