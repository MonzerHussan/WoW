"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { GameVariant } from "@/shared/schemas/game.schema";
import { assumptionsConstraintsPayloadSchema } from "@/shared/schemas/game.schema";

type Category = "assumption" | "constraint" | "risk";
const CATEGORIES: Category[] = ["assumption", "constraint", "risk"];
const CATEGORY_LABEL_KEY: Record<Category, "projects.categoryAssumption" | "projects.categoryConstraint" | "projects.categoryRisk"> = {
  assumption: "projects.categoryAssumption",
  constraint: "projects.categoryConstraint",
  risk: "projects.categoryRisk",
};

interface Row {
  text: string;
  category: Category | "";
}

export function AssumptionsConstraintsField({
  variant,
  scenario,
  lang,
  submitting,
  onSubmit,
}: {
  variant: GameVariant;
  scenario: Record<string, any> | null;
  lang: Lang;
  submitting: boolean;
  onSubmit: (payload: Record<string, any>) => void;
}) {
  const [rows, setRows] = useState<Row[]>([
    { text: "", category: "" },
    { text: "", category: "" },
    { text: "", category: "" },
    { text: "", category: "" },
  ]);

  const hints: string[] = scenario ? (lang === "ar" ? scenario.hints_ar : scenario.hints_en) || [] : [];

  function handleSubmit() {
    const parsed = assumptionsConstraintsPayloadSchema.safeParse({
      items: rows
        .filter((r) => r.text.trim() && r.category)
        .map((r) => ({ text: r.text, category: r.category as Category })),
    });
    if (!parsed.success) return;
    onSubmit(parsed.data);
  }

  return (
    <div className="flex flex-col gap-3">
      {hints.length > 0 && (
        <ul className="text-xs text-ink-soft list-disc ps-4">
          {hints.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
      {variant === "project" && <p className="text-xs text-ink-soft">{t("games.projectVariantSavesToLog", lang)}</p>}

      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder={t("games.fieldItemText", lang)}
            value={row.text}
            onChange={(e) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, text: e.target.value } : r)))}
            className="flex-1"
          />
          <select
            className="field-input"
            value={row.category}
            onChange={(e) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, category: e.target.value as Category } : r)))}
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(CATEGORY_LABEL_KEY[c], lang)}
              </option>
            ))}
          </select>
        </div>
      ))}

      <Button variant="ghost" onClick={() => setRows((p) => [...p, { text: "", category: "" }])}>
        {t("games.addItem", lang)}
      </Button>

      <p className="text-xs text-ink-soft">{t("games.needAtLeastFourAcrossThree", lang)}</p>

      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? t("games.submitting", lang) : t("games.submit", lang)}
      </Button>
    </div>
  );
}
