"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Input, FormField } from "@/shared/components/Input";
import { GameVariant } from "@/shared/schemas/game.schema";
import { charterBuilderPayloadSchema } from "@/shared/schemas/game.schema";

export function CharterBuilderField({
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
  const [vision, setVision] = useState("");
  const [objectives, setObjectives] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [coreTeam, setCoreTeam] = useState<{ name: string; role: string }[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);

  if (variant === "project") {
    // The real charter (037) is filled and approved in the project's own
    // Charter tab — completion here just re-checks the live project_charters
    // row server-side (038's complete_game_attempt), so the payload is empty.
    return (
      <div className="text-center py-2">
        <Button onClick={() => onSubmit({})} disabled={submitting}>
          {submitting ? t("games.submitting", lang) : t("games.submit", lang)}
        </Button>
      </div>
    );
  }

  function handleSubmit() {
    const parsed = charterBuilderPayloadSchema.safeParse({
      vision,
      objectives,
      deliverables,
      sponsorName,
      coreTeam: coreTeam.filter((m) => m.name.trim() && m.role.trim()),
      assumptions: assumptions.filter((a) => a.trim()),
      constraints: constraints.filter((c) => c.trim()),
      approved: true,
    });
    if (!parsed.success || !approved) return;
    onSubmit(parsed.data);
  }

  return (
    <div className="flex flex-col gap-3">
      {scenario && (
        <p className="text-xs text-ink-soft">
          {lang === "ar" ? scenario.brief_ar : scenario.brief_en}
        </p>
      )}
      <FormField label={t("projects.fieldVision", lang)}>
        <textarea className="field-input w-full min-h-[70px]" value={vision} onChange={(e) => setVision(e.target.value)} maxLength={2000} />
      </FormField>
      <FormField label={t("projects.fieldObjectives", lang)}>
        <textarea className="field-input w-full min-h-[70px]" value={objectives} onChange={(e) => setObjectives(e.target.value)} maxLength={2000} />
      </FormField>
      <FormField label={t("projects.fieldDeliverables", lang)}>
        <textarea className="field-input w-full min-h-[70px]" value={deliverables} onChange={(e) => setDeliverables(e.target.value)} maxLength={2000} />
      </FormField>
      <FormField label={t("projects.fieldSponsorName", lang)}>
        <Input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} maxLength={120} />
      </FormField>

      <div>
        <p className="field-label mb-2">{t("projects.fieldCoreTeam", lang)}</p>
        {coreTeam.map((m, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input
              placeholder={t("projects.coreTeamName", lang)}
              value={m.name}
              onChange={(e) => setCoreTeam((p) => p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
              className="flex-1"
            />
            <Input
              placeholder={t("projects.coreTeamRole", lang)}
              value={m.role}
              onChange={(e) => setCoreTeam((p) => p.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)))}
              className="flex-1"
            />
          </div>
        ))}
        <Button variant="ghost" onClick={() => setCoreTeam((p) => [...p, { name: "", role: "" }])}>
          {t("projects.addTeamMember", lang)}
        </Button>
      </div>

      <ListField label={t("projects.fieldAssumptions", lang)} addLabel={t("projects.addAssumption", lang)} items={assumptions} onChange={setAssumptions} />
      <ListField label={t("projects.fieldConstraints", lang)} addLabel={t("projects.addConstraint", lang)} items={constraints} onChange={setConstraints} />

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
        {t("games.approveCheckbox", lang)}
      </label>

      <Button onClick={handleSubmit} disabled={submitting || !approved}>
        {submitting ? t("games.submitting", lang) : t("games.submit", lang)}
      </Button>
    </div>
  );
}

function ListField({
  label,
  addLabel,
  items,
  onChange,
}: {
  label: string;
  addLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <p className="field-label mb-2">{label}</p>
      {items.map((it, i) => (
        <Input
          key={i}
          value={it}
          onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
          className="mb-2"
        />
      ))}
      <Button variant="ghost" onClick={() => onChange([...items, ""])}>
        {addLabel}
      </Button>
    </div>
  );
}
