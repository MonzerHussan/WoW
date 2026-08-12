"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState, Loading } from "@/shared/components/Feedback";
import { listProjectRisks, addProjectRisk, deleteProjectRisk, ProjectRisk } from "@/shared/services/risk.service";

const LEVELS = [1, 2, 3, 4, 5] as const;
const STRATEGIES = ["avoid", "mitigate", "transfer", "accept"] as const;

const STRATEGY_LABEL_KEY: Record<(typeof STRATEGIES)[number], "projects.riskStrategyAvoid" | "projects.riskStrategyMitigate" | "projects.riskStrategyTransfer" | "projects.riskStrategyAccept"> = {
  avoid: "projects.riskStrategyAvoid",
  mitigate: "projects.riskStrategyMitigate",
  transfer: "projects.riskStrategyTransfer",
  accept: "projects.riskStrategyAccept",
};
const LEVEL_LABEL_KEY: Record<number, "level2.riskLevel1" | "level2.riskLevel2" | "level2.riskLevel3" | "level2.riskLevel4" | "level2.riskLevel5"> = {
  1: "level2.riskLevel1",
  2: "level2.riskLevel2",
  3: "level2.riskLevel3",
  4: "level2.riskLevel4",
  5: "level2.riskLevel5",
};

/**
 * Level 2 Unit 5's real deliverable — a genuine Risk Register for the
 * learner's own project. Writes directly to project_risks (056), no
 * RPC: RLS already scopes everything to the owner, and risk_score is a
 * DB-generated column (probability × impact) this component never
 * computes itself. TopRisksWidget (features/projects) reads the same
 * data read-only via the shared risk.service.ts — see that file's own
 * header for why the split exists.
 */
export function RiskRegisterBuilder({ projectId, lang }: { projectId: string; lang: Lang }) {
  const [risks, setRisks] = useState<ProjectRisk[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]>("mitigate");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjectRisks(projectId);
      setRisks(data);
    } catch {
      setError(t("level2.riskErrGeneric", lang));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleAdd() {
    if (!description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: insertError } = await addProjectRisk(projectId, {
        description: description.trim(),
        probability,
        impact,
        responseStrategy: strategy,
      });
      if (insertError || !data) {
        setError(t("level2.riskErrGeneric", lang));
        return;
      }
      setRisks((prev) => [...(prev || []), data as ProjectRisk].sort((a, b) => b.risk_score - a.risk_score));
      setDescription("");
    } catch {
      setError(t("level2.riskErrGeneric", lang));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await deleteProjectRisk(id);
    if (deleteError) {
      setError(t("level2.riskErrGeneric", lang));
      return;
    }
    setRisks((prev) => (prev || []).filter((r) => r.id !== id));
  }

  if (loading) return <Loading />;

  return (
    <Card className="p-5">
      <h3 className="font-display font-black text-lg text-navy mb-1">{t("level2.riskTitle", lang)}</h3>
      <p className="text-sm text-ink-soft mb-3">{t("level2.riskDesc", lang)}</p>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {(risks || []).length === 0 && <p className="text-sm text-ink-soft py-2">{t("level2.riskEmpty", lang)}</p>}
        {(risks || []).map((risk) => (
          <div key={risk.id} className="flex items-center justify-between gap-3 border-b border-line/50 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate">{risk.description}</p>
              <p className="text-xs text-ink-soft">
                {t("level2.riskProbabilityLabel", lang)} {risk.probability} × {t("level2.riskImpactLabel", lang)} {risk.impact} ={" "}
                <b className="text-navy">{risk.risk_score}</b> · {t(STRATEGY_LABEL_KEY[risk.response_strategy], lang)}
              </p>
            </div>
            <button type="button" className="text-xs text-orange-dark hover:underline flex-none" onClick={() => handleDelete(risk.id)}>
              {t("level2.riskDelete", lang)}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <input
          className="field-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("level2.riskDescPlaceholder", lang)}
          maxLength={300}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select className="field-input" value={probability} onChange={(e) => setProbability(Number(e.target.value))}>
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {t("level2.riskProbabilityLabel", lang)}: {t(LEVEL_LABEL_KEY[lvl], lang)}
              </option>
            ))}
          </select>
          <select className="field-input" value={impact} onChange={(e) => setImpact(Number(e.target.value))}>
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {t("level2.riskImpactLabel", lang)}: {t(LEVEL_LABEL_KEY[lvl], lang)}
              </option>
            ))}
          </select>
          <select className="field-input" value={strategy} onChange={(e) => setStrategy(e.target.value as (typeof STRATEGIES)[number])}>
            {STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {t(STRATEGY_LABEL_KEY[s], lang)}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleAdd} disabled={saving || !description.trim()}>
          {saving ? t("level2.riskAdding", lang) : t("level2.riskAdd", lang)}
        </Button>
      </div>
    </Card>
  );
}
