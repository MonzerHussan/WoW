"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { stakeholderDetectivePayloadSchema } from "@/shared/schemas/game.schema";

type Quadrant = "manage_closely" | "keep_satisfied" | "keep_informed" | "monitor";
const QUADRANTS: Quadrant[] = ["manage_closely", "keep_satisfied", "keep_informed", "monitor"];
const QUADRANT_LABEL_KEY: Record<Quadrant, "games.quadrantManageClosely" | "games.quadrantKeepSatisfied" | "games.quadrantKeepInformed" | "games.quadrantMonitor"> = {
  manage_closely: "games.quadrantManageClosely",
  keep_satisfied: "games.quadrantKeepSatisfied",
  keep_informed: "games.quadrantKeepInformed",
  monitor: "games.quadrantMonitor",
};

interface Row {
  name: string;
  quadrant: Quadrant | "";
  justification: string;
}

export function StakeholderDetectiveField({
  scenario,
  lang,
  submitting,
  onSubmit,
}: {
  scenario: Record<string, any> | null;
  lang: Lang;
  submitting: boolean;
  onSubmit: (payload: Record<string, any>) => void;
}) {
  const [rows, setRows] = useState<Row[]>([{ name: "", quadrant: "", justification: "" }]);

  const candidates: string[] = scenario ? (lang === "ar" ? scenario.candidate_stakeholders_ar : scenario.candidate_stakeholders_en) || [] : [];

  function handleSubmit() {
    const parsed = stakeholderDetectivePayloadSchema.safeParse({
      stakeholders: rows
        .filter((r) => r.name.trim() && r.quadrant && r.justification.trim())
        .map((r) => ({ name: r.name, quadrant: r.quadrant as Quadrant, justification: r.justification })),
    });
    if (!parsed.success) return;
    onSubmit(parsed.data);
  }

  return (
    <div className="flex flex-col gap-3">
      {candidates.length > 0 && (
        <p className="text-xs text-ink-soft">
          {candidates.join(" · ")}
        </p>
      )}

      {rows.map((row, i) => (
        <div key={i} className="border border-line rounded-lg p-3 flex flex-col gap-2">
          <Input
            placeholder={t("games.fieldStakeholderName", lang)}
            value={row.name}
            onChange={(e) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))}
          />
          <select
            className="field-input"
            value={row.quadrant}
            onChange={(e) =>
              setRows((p) => p.map((r, idx) => (idx === i ? { ...r, quadrant: e.target.value as Quadrant } : r)))
            }
          >
            <option value="">{t("games.fieldQuadrant", lang)}</option>
            {QUADRANTS.map((q) => (
              <option key={q} value={q}>
                {t(QUADRANT_LABEL_KEY[q], lang)}
              </option>
            ))}
          </select>
          <Input
            placeholder={t("games.fieldJustification", lang)}
            value={row.justification}
            onChange={(e) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, justification: e.target.value } : r)))}
          />
        </div>
      ))}

      <Button variant="ghost" onClick={() => setRows((p) => [...p, { name: "", quadrant: "", justification: "" }])}>
        {t("games.addStakeholder", lang)}
      </Button>

      <p className="text-xs text-ink-soft">{t("games.needAtLeastThree", lang)}</p>

      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? t("games.submitting", lang) : t("games.submit", lang)}
      </Button>
    </div>
  );
}
