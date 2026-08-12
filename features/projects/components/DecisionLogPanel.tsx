"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, EmptyState, ErrorState } from "@/shared/components/Feedback";
import { Input, FormField } from "@/shared/components/Input";
import { DecisionLogEntry } from "@/features/projects/services/project.service";
import { addDecisionLogEntry } from "@/features/projects/services/project.client";
import { addDecisionLogEntrySchema } from "@/shared/schemas/project.schema";

const CATEGORIES = ["assumption", "constraint", "risk"] as const;

export function DecisionLogPanel({
  projectId,
  entries,
  lang,
  onAdded,
}: {
  projectId: string;
  entries: DecisionLogEntry[];
  lang: Lang;
  onAdded: (entry: DecisionLogEntry) => void;
}) {
  const [situation, setSituation] = useState("");
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | "">("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const parsed = addDecisionLogEntrySchema.safeParse({
      situation,
      decision,
      reason,
      category: category || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t("common.somethingWentWrong", lang));
      return;
    }

    setAdding(true);
    setError(null);
    try {
      const { error: insertError } = await addDecisionLogEntry(projectId, parsed.data);
      if (insertError) {
        setError(t("common.somethingWentWrong", lang));
        return;
      }
      onAdded({
        id: `local-${Date.now()}`,
        situation: parsed.data.situation,
        decision: parsed.data.decision,
        reason: parsed.data.reason,
        category: parsed.data.category ?? null,
        created_at: new Date().toISOString(),
      });
      setSituation("");
      setDecision("");
      setReason("");
      setCategory("");
    } catch {
      setError(t("common.somethingWentWrong", lang));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-ink-soft mb-4">{t("projects.decisionLogIntro", lang)}</p>

      <Card className="p-4 mb-5 flex flex-col gap-3">
        {error && <ErrorState message={error} />}
        <FormField label={t("projects.fieldSituation", lang)}>
          <Input value={situation} onChange={(e) => setSituation(e.target.value)} maxLength={500} />
        </FormField>
        <FormField label={t("projects.fieldDecisionText", lang)}>
          <Input value={decision} onChange={(e) => setDecision(e.target.value)} maxLength={500} />
        </FormField>
        <FormField label={t("projects.fieldReason", lang)}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </FormField>
        <FormField label={t("projects.fieldCategory", lang)}>
          <select
            className="field-input"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
          >
            <option value="">—</option>
            <option value="assumption">{t("projects.categoryAssumption", lang)}</option>
            <option value="constraint">{t("projects.categoryConstraint", lang)}</option>
            <option value="risk">{t("projects.categoryRisk", lang)}</option>
          </select>
        </FormField>
        <Button
          onClick={handleAdd}
          disabled={adding || !situation.trim() || !decision.trim() || !reason.trim()}
        >
          {adding ? t("projects.adding", lang) : t("projects.addDecision", lang)}
        </Button>
      </Card>

      {entries.length === 0 ? (
        <EmptyState message={t("projects.emptyDecisionLog", lang)} icon="📋" />
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              {entry.category === "milestone" ? (
                <p className="text-sm font-bold text-navy">{t("projects.milestoneCharterApproved", lang)}</p>
              ) : (
                <>
                  <p className="text-sm text-ink">
                    <span className="font-bold">{t("projects.fieldSituation", lang)}:</span> {entry.situation}
                  </p>
                  <p className="text-sm text-ink">
                    <span className="font-bold">{t("projects.fieldDecisionText", lang)}:</span> {entry.decision}
                  </p>
                  <p className="text-sm text-ink">
                    <span className="font-bold">{t("projects.fieldReason", lang)}:</span> {entry.reason}
                  </p>
                </>
              )}
              <p className="text-xs text-ink-soft mt-1">{new Date(entry.created_at).toLocaleString(lang)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
