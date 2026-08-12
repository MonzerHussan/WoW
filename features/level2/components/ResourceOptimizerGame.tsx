"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { getPricingUnit } from "@/shared/services/pricing.service";
import { startKbAttempt, completeResourceOptimizerAttempt, KbScenario, KbCompleteResult } from "@/features/level2/services/kb-game.client";

interface Task {
  key: string;
  name_ar: string;
  name_en: string;
  hours: number;
  depends_on_ar: string;
  depends_on_en: string;
  choices: { key: string; label_ar: string; label_en: string }[];
}
interface TeamMember {
  key: string;
  name_ar: string;
  name_en: string;
  role_ar: string;
  role_en: string;
  weekly_hours: number;
}

/**
 * Decision-point game, not a free simulation (owner's own instruction):
 * for each task the learner picks ONE of a small fixed set of choices —
 * never a free drag-and-drop allocation. Every combination is scored
 * server-side against kb_scoring_rules (046); this component never
 * computes or trusts a score itself.
 */
export function ResourceOptimizerGame({ lang }: { lang: Lang }) {
  const [price, setPrice] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<KbScenario | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KbCompleteResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPricingUnit(supabaseBrowser(), "game_level2_resource_optimizer").then((p) => {
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
      const res = await startKbAttempt("level2_resource_optimizer");
      if (!res.allowed || !res.attemptId || !res.scenarios?.[0]) {
        setError(res.reason === "insufficient_balance" ? t("level2.errInsufficientBalance", lang) : t("level2.errGeneric", lang));
        return;
      }
      setAttemptId(res.attemptId);
      setScenario(res.scenarios[0]);
      setChoices({});
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (!attemptId || !scenario) return;
    const tasks: Task[] = scenario.body.tasks || [];
    const assignments = tasks.map((task) => ({ taskKey: task.key, choiceKey: choices[task.key] || "" }));
    setSubmitting(true);
    setError(null);
    try {
      const res = await completeResourceOptimizerAttempt(attemptId, assignments);
      setResult(res);
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setSubmitting(false);
    }
  }

  const tasks: Task[] = scenario?.body.tasks || [];
  const team: TeamMember[] = scenario?.body.team || [];
  const allChosen = tasks.length > 0 && tasks.every((task) => !!choices[task.key]);

  return (
    <Card className="p-5">
      <h3 className="font-display font-black text-lg text-navy mb-1">{t("level2.resourceOptimizerTitle", lang)}</h3>
      <p className="text-sm text-ink-soft mb-3">{t("level2.resourceOptimizerDesc", lang)}</p>

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

          <div>
            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">{t("level2.teamLabel", lang)}</h4>
            <div className="flex flex-wrap gap-2">
              {team.map((member) => (
                <span key={member.key} className="text-xs bg-bg rounded-lg px-3 py-1.5">
                  <b>{lang === "ar" ? member.name_ar : member.name_en}</b> — {lang === "ar" ? member.role_ar : member.role_en} (
                  {member.weekly_hours} {t("level2.hoursUnit", lang)})
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wide">{t("level2.tasksLabel", lang)}</h4>
            {tasks.map((task) => (
              <div key={task.key} className="border border-line rounded-xl p-3">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="font-bold text-sm text-navy">{lang === "ar" ? task.name_ar : task.name_en}</span>
                  <span className="text-xs text-ink-soft whitespace-nowrap">
                    {task.hours} {t("level2.hoursUnit", lang)}
                  </span>
                </div>
                <p className="text-xs text-ink-soft mb-2">
                  {t("level2.dependsOnLabel", lang)}: {lang === "ar" ? task.depends_on_ar : task.depends_on_en}
                </p>
                <div className="flex flex-col gap-1.5">
                  {task.choices.map((choice) => (
                    <label
                      key={choice.key}
                      className={`text-sm rounded-lg px-3 py-2 border cursor-pointer transition ${
                        choices[task.key] === choice.key ? "border-navy bg-navy/5 font-semibold" : "border-line hover:border-navy/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name={task.key}
                        className="sr-only"
                        checked={choices[task.key] === choice.key}
                        onChange={() => setChoices((c) => ({ ...c, [task.key]: choice.key }))}
                      />
                      {lang === "ar" ? choice.label_ar : choice.label_en}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSubmit} disabled={!allChosen || submitting}>
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
