"use client";

import { useEffect, useState } from "react";
import { t, TranslationKey } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { getPricingUnit, gamePricingKey } from "@/shared/services/pricing.service";
import { GameKey, GameVariant } from "@/shared/schemas/game.schema";
import { playGame, completeGameAttempt, PlayGameResult } from "@/features/games/services/game.client";

/**
 * The one orchestration shell every game (both variants) shares:
 * price display -> play_game() charge -> render the game-specific field
 * -> complete_game_attempt() -> badge result. Mirrors LanguageTaskCard's
 * charge-then-content shape (037/024), generalized across 5 games.
 */
export function GameShell({
  gameKey,
  variant,
  lang,
  projectId,
  titleKey,
  descKey,
  badgeNameKey,
  hintKey,
  renderField,
}: {
  gameKey: GameKey;
  variant: GameVariant;
  lang: Lang;
  projectId?: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  badgeNameKey: TranslationKey;
  /** Optional variant-specific explanatory line (e.g. "this uses your real charter"). */
  hintKey?: TranslationKey;
  renderField: (args: {
    attemptId: string;
    scenarioId: string | null;
    submitting: boolean;
    onSubmit: (payload: Record<string, any>) => void;
  }) => React.ReactNode;
}) {
  const [price, setPrice] = useState<number | null>(null);
  const [attempt, setAttempt] = useState<PlayGameResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ completed: boolean; badge?: string; already?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPricingUnit(supabaseBrowser(), gamePricingKey(gameKey, variant)).then((p) => {
      if (!cancelled) setPrice(p);
    });
    return () => {
      cancelled = true;
    };
  }, [gameKey, variant]);

  async function handlePlay() {
    setStarting(true);
    setError(null);
    try {
      const res = await playGame(gameKey, variant, { projectId });
      if (!res.allowed) {
        if (res.reason === "insufficient_balance") setError(t("games.errInsufficientBalance", lang));
        else if (res.reason === "quiz_not_passed") setError(t("games.errQuizNotPassed", lang));
        else setError(t("games.errGeneric", lang));
        return;
      }
      setAttempt(res);
    } catch {
      setError(t("games.errGeneric", lang));
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit(payload: Record<string, any>) {
    if (!attempt?.attemptId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await completeGameAttempt(attempt.attemptId, payload);
      if (!res.completed) {
        setResult({ completed: false });
        return;
      }
      setResult({ completed: true, badge: res.badge, already: res.already_completed });
    } catch {
      setError(t("games.errGeneric", lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-display font-black text-lg text-navy mb-1">{t(titleKey, lang)}</h3>
      <p className="text-sm text-ink-soft mb-3">{t(descKey, lang)}</p>
      {hintKey && <p className="text-xs text-ink-soft bg-bg rounded-lg p-2 mb-3">{t(hintKey, lang)}</p>}

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      {!attempt && !result && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-soft">
            {t("games.costPrefix", lang)} {price ?? "—"} {t("games.coinsUnit", lang)}
          </span>
          <Button onClick={handlePlay} disabled={starting || price === null}>
            {starting ? t("games.playing", lang) : t("games.playCta", lang)}
          </Button>
        </div>
      )}

      {attempt && attempt.attemptId && !result &&
        renderField({
          attemptId: attempt.attemptId,
          scenarioId: attempt.scenarioId ?? null,
          submitting,
          onSubmit: handleSubmit,
        })}

      {result && result.completed && (
        <div className="text-center py-3">
          <p className="text-lg font-bold text-navy">{t("games.completedTitle", lang)}</p>
          {result.badge && (
            <p className="text-sm text-ink-soft mt-1">
              {t("games.completedBadgeEarned", lang)}: {t(badgeNameKey, lang)}
            </p>
          )}
        </div>
      )}

      {result && !result.completed && (
        <div className="text-center py-3">
          <p className="text-sm font-bold text-orange-dark">{t("games.notYetTitle", lang)}</p>
          <p className="text-xs text-ink-soft mt-1 mb-3">{t("games.notYetBody", lang)}</p>
          <Button variant="ghost" onClick={() => setResult(null)}>
            {t("games.retryCta", lang)}
          </Button>
        </div>
      )}
    </Card>
  );
}
