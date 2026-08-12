"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Input, FormField } from "@/shared/components/Input";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { getPricingUnit } from "@/shared/services/pricing.service";
import { startKbAttempt, completeEvmSimulatorAttempt, KbScenario, KbCompleteResult } from "@/features/level2/services/kb-game.client";

/**
 * CPI/SPI are the learner's OWN computed answers, scored server-side
 * against the scenario's real PV/EV/AC (complete_evm_simulator_attempt,
 * 046) — never computed or trusted here client-side. The management
 * response is the one genuine decision point, scored via kb_scoring_rules
 * like every other Level 2 decision.
 */
export function EvmSimulatorGame({ lang }: { lang: Lang }) {
  const [price, setPrice] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<KbScenario | null>(null);
  const [cpi, setCpi] = useState("");
  const [spi, setSpi] = useState("");
  const [responseKey, setResponseKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KbCompleteResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPricingUnit(supabaseBrowser(), "game_level2_evm_simulator").then((p) => {
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
      const res = await startKbAttempt("level2_evm_simulator");
      if (!res.allowed || !res.attemptId || !res.scenarios?.[0]) {
        setError(res.reason === "insufficient_balance" ? t("level2.errInsufficientBalance", lang) : t("level2.errGeneric", lang));
        return;
      }
      setAttemptId(res.attemptId);
      setScenario(res.scenarios[0]);
      setCpi("");
      setSpi("");
      setResponseKey(null);
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (!attemptId || !responseKey) return;
    const cpiNum = Number(cpi);
    const spiNum = Number(spi);
    if (!Number.isFinite(cpiNum) || !Number.isFinite(spiNum)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await completeEvmSimulatorAttempt(attemptId, cpiNum, spiNum, responseKey);
      setResult(res);
    } catch {
      setError(t("level2.errGeneric", lang));
    } finally {
      setSubmitting(false);
    }
  }

  const responses: { key: string; label_ar: string; label_en: string }[] = scenario?.body.responses || [];
  const canSubmit = cpi.trim() !== "" && spi.trim() !== "" && !!responseKey;

  return (
    <Card className="p-5">
      <h3 className="font-display font-black text-lg text-navy mb-1">{t("level2.evmSimulatorTitle", lang)}</h3>
      <p className="text-sm text-ink-soft mb-3">{t("level2.evmSimulatorDesc", lang)}</p>

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

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-bg rounded-lg p-2">
              <div className="text-xs text-ink-soft">{t("level2.pvLabel", lang)}</div>
              <div className="font-bold text-navy tabular-nums">{scenario.body.pv?.toLocaleString("en-US")}</div>
            </div>
            <div className="bg-bg rounded-lg p-2">
              <div className="text-xs text-ink-soft">{t("level2.evLabel", lang)}</div>
              <div className="font-bold text-navy tabular-nums">{scenario.body.ev?.toLocaleString("en-US")}</div>
            </div>
            <div className="bg-bg rounded-lg p-2">
              <div className="text-xs text-ink-soft">{t("level2.acLabel", lang)}</div>
              <div className="font-bold text-navy tabular-nums">{scenario.body.ac?.toLocaleString("en-US")}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("level2.cpiLabel", lang)}>
              <Input type="number" step="0.01" value={cpi} onChange={(e) => setCpi(e.target.value)} />
            </FormField>
            <FormField label={t("level2.spiLabel", lang)}>
              <Input type="number" step="0.01" value={spi} onChange={(e) => setSpi(e.target.value)} />
            </FormField>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">{t("level2.responseLabel", lang)}</h4>
            <div className="flex flex-col gap-1.5">
              {responses.map((r) => (
                <label
                  key={r.key}
                  className={`text-sm rounded-lg px-3 py-2 border cursor-pointer transition ${
                    responseKey === r.key ? "border-navy bg-navy/5 font-semibold" : "border-line hover:border-navy/30"
                  }`}
                >
                  <input type="radio" name="response" className="sr-only" checked={responseKey === r.key} onChange={() => setResponseKey(r.key)} />
                  {lang === "ar" ? r.label_ar : r.label_en}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
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
          <div className="flex justify-center gap-4 mt-3 text-sm">
            <span>{result.result?.cpiCorrect ? t("level2.cpiCorrect", lang) : t("level2.cpiIncorrect", lang)}</span>
            <span>{result.result?.spiCorrect ? t("level2.spiCorrect", lang) : t("level2.spiIncorrect", lang)}</span>
          </div>
          {result.result?.response?.items?.[0] && (
            <div className="text-start mt-4 text-xs bg-bg rounded-lg p-2">
              {lang === "ar" ? result.result.response.items[0].feedbackAr : result.result.response.items[0].feedbackEn}
            </div>
          )}
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
