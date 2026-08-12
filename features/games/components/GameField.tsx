"use client";

import { useEffect, useState } from "react";
import { Lang } from "@/shared/types";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { GameKey, GameVariant } from "@/shared/schemas/game.schema";
import { getGenericScenarioById } from "@/features/games/services/game.service";
import { CharterBuilderField } from "@/features/games/components/fields/CharterBuilderField";
import { StakeholderDetectiveField } from "@/features/games/components/fields/StakeholderDetectiveField";
import { AssumptionsConstraintsField } from "@/features/games/components/fields/AssumptionsConstraintsField";
import { StrategyAlignmentField } from "@/features/games/components/fields/StrategyAlignmentField";
import { SpotterField } from "@/features/games/components/fields/SpotterField";

/** Dispatches to the right game's field component, fetching the exact
 *  scenario play_game() already picked (scenarioId) once, on mount —
 *  not re-picking independently. project_vs_operations_race needs no
 *  scenario at all (draws from the statement bank instead, both variants). */
export function GameField({
  gameKey,
  variant,
  scenarioId,
  projectName,
  lang,
  submitting,
  onSubmit,
}: {
  gameKey: GameKey;
  variant: GameVariant;
  scenarioId: string | null;
  projectName?: string;
  lang: Lang;
  submitting: boolean;
  onSubmit: (payload: Record<string, any>) => void;
}) {
  const [scenario, setScenario] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(!!scenarioId);

  useEffect(() => {
    if (!scenarioId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getGenericScenarioById(supabaseBrowser(), scenarioId).then((s) => {
      if (!cancelled) {
        setScenario(s?.payload || null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  if (loading) return null;

  switch (gameKey) {
    case "charter_builder":
      return <CharterBuilderField variant={variant} scenario={scenario} lang={lang} submitting={submitting} onSubmit={onSubmit} />;
    case "stakeholder_detective":
      return <StakeholderDetectiveField scenario={scenario} lang={lang} submitting={submitting} onSubmit={onSubmit} />;
    case "assumptions_constraints":
      return <AssumptionsConstraintsField variant={variant} scenario={scenario} lang={lang} submitting={submitting} onSubmit={onSubmit} />;
    case "strategy_alignment":
      return (
        <StrategyAlignmentField
          variant={variant}
          scenario={scenario}
          projectName={projectName}
          lang={lang}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      );
    case "project_vs_operations_race":
      return <SpotterField lang={lang} submitting={submitting} onSubmit={onSubmit} />;
    default:
      return null;
  }
}
