"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card, EmptyState, Loading } from "@/shared/components/Feedback";
import { listProjectRisks, ProjectRisk } from "@/shared/services/risk.service";

const STRATEGY_LABEL_KEY: Record<ProjectRisk["response_strategy"], "projects.riskStrategyAvoid" | "projects.riskStrategyMitigate" | "projects.riskStrategyTransfer" | "projects.riskStrategyAccept"> = {
  avoid: "projects.riskStrategyAvoid",
  mitigate: "projects.riskStrategyMitigate",
  transfer: "projects.riskStrategyTransfer",
  accept: "projects.riskStrategyAccept",
};

/**
 * Read-only top-3 display for the project workspace's Overview tab —
 * the full add/edit register is Level 2 Unit 5's own exercise
 * (RiskRegisterBuilder, features/level2). Both read the same
 * project_risks table through shared/services/risk.service.ts; this
 * component never writes.
 */
export function TopRisksWidget({ projectId, lang }: { projectId: string; lang: Lang }) {
  const [risks, setRisks] = useState<ProjectRisk[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProjectRisks(projectId)
      .then((data) => {
        if (!cancelled) setRisks(data.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setRisks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy text-sm mb-3">{t("projects.topRisksTitle", lang)}</h3>
      {risks === null ? (
        <Loading />
      ) : risks.length === 0 ? (
        <EmptyState message={t("projects.topRisksEmpty", lang)} icon="⚠️" />
      ) : (
        <div className="flex flex-col gap-2">
          {risks.map((risk) => (
            <div key={risk.id} className="flex items-center justify-between gap-3 border-b border-line/50 py-2 text-sm">
              <span className="text-ink truncate flex-1">{risk.description}</span>
              <span className="text-xs text-ink-soft flex-none">
                {t(STRATEGY_LABEL_KEY[risk.response_strategy], lang)} · {t("projects.riskScoreLabel", lang)}{" "}
                <b className="text-navy">{risk.risk_score}</b>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
