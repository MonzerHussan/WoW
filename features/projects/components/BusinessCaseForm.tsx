"use client";

import { useState } from "react";
import { t, TranslationKey } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { ProjectDetail } from "@/features/projects/services/project.service";
import { updateBusinessCase } from "@/features/projects/services/project.client";
import { updateBusinessCaseSchema } from "@/shared/schemas/project.schema";

const FIELDS: { key: "problem" | "opportunity" | "valueCase" | "whyNow"; labelKey: TranslationKey }[] = [
  { key: "problem", labelKey: "projects.fieldProblem" },
  { key: "opportunity", labelKey: "projects.fieldOpportunity" },
  { key: "valueCase", labelKey: "projects.fieldValueCase" },
  { key: "whyNow", labelKey: "projects.fieldWhyNow" },
];

/** Free — no coin cost. Filling this in is content, not a purchase (037). */
export function BusinessCaseForm({ project, lang }: { project: ProjectDetail; lang: Lang }) {
  const [problem, setProblem] = useState(project.problem_statement || "");
  const [opportunity, setOpportunity] = useState(project.opportunity_statement || "");
  const [valueCase, setValueCase] = useState(project.value_case || "");
  const [whyNow, setWhyNow] = useState(project.why_now || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values: Record<(typeof FIELDS)[number]["key"], string> = { problem, opportunity, valueCase, whyNow };
  const setters: Record<(typeof FIELDS)[number]["key"], (v: string) => void> = {
    problem: setProblem,
    opportunity: setOpportunity,
    valueCase: setValueCase,
    whyNow: setWhyNow,
  };

  async function handleSave() {
    const parsed = updateBusinessCaseSchema.safeParse({
      problemStatement: problem.trim() || null,
      opportunityStatement: opportunity.trim() || null,
      valueCase: valueCase.trim() || null,
      whyNow: whyNow.trim() || null,
    });
    if (!parsed.success) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const { error: saveError } = await updateBusinessCase(project.id, parsed.data);
      if (saveError) {
        setError(t("common.somethingWentWrong", lang));
        return;
      }
      setSaved(true);
    } catch {
      setError(t("common.somethingWentWrong", lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{t("projects.businessCaseIntro", lang)}</p>
      {error && <ErrorState message={error} />}
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="field-label">{t(f.labelKey, lang)}</label>
          <textarea
            className="field-input w-full min-h-[90px]"
            value={values[f.key]}
            onChange={(e) => {
              setters[f.key](e.target.value);
              setSaved(false);
            }}
            maxLength={2000}
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("projects.saving", lang) : t("projects.save", lang)}
        </Button>
        {saved && <span className="text-xs font-bold text-navy">{t("projects.saved", lang)}</span>}
      </div>
    </div>
  );
}
