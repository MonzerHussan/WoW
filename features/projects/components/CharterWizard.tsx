"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { Input, FormField } from "@/shared/components/Input";
import StepIndicator from "@/features/onboarding/components/StepIndicator";
import { ProjectCharter, CoreTeamMember } from "@/features/projects/services/project.service";
import { updateCharter, approveCharter } from "@/features/projects/services/project.client";
import { updateCharterSchema } from "@/shared/schemas/project.schema";

const STEP_COUNT = 5;

/**
 * This IS the future Charter Builder game (TASK_level1_living_project.md
 * §1c) — a step wizard on the same StepIndicator (onboarding) shape, not
 * a placeholder for a second screen to be built later. The games task
 * only needs to wire a badge to `charter.is_approved` becoming true.
 */
export function CharterWizard({
  projectId,
  charter,
  lang,
  onApproved,
}: {
  projectId: string;
  charter: ProjectCharter;
  lang: Lang;
  onApproved: (approvedAt: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [vision, setVision] = useState(charter.vision || "");
  const [objectives, setObjectives] = useState(charter.objectives || "");
  const [deliverables, setDeliverables] = useState(charter.deliverables || "");
  const [sponsorName, setSponsorName] = useState(charter.sponsor_name || "");
  const [sponsorAuthority, setSponsorAuthority] = useState(charter.sponsor_authority || "");
  const [coreTeam, setCoreTeam] = useState<CoreTeamMember[]>(charter.core_team);
  const [assumptions, setAssumptions] = useState<string[]>(charter.assumptions);
  const [constraints, setConstraints] = useState<string[]>(charter.constraints);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(charter.is_approved);
  const [approvedAt, setApprovedAt] = useState(charter.approved_at);

  async function saveDraft(): Promise<boolean> {
    const parsed = updateCharterSchema.safeParse({
      vision: vision.trim() || null,
      objectives: objectives.trim() || null,
      deliverables: deliverables.trim() || null,
      sponsorName: sponsorName.trim() || null,
      sponsorAuthority: sponsorAuthority.trim() || null,
      coreTeam: coreTeam.filter((m) => m.name.trim() && m.role.trim()),
      assumptions: assumptions.filter((a) => a.trim()),
      constraints: constraints.filter((c) => c.trim()),
    });
    if (!parsed.success) {
      setError(t("common.somethingWentWrong", lang));
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await updateCharter(projectId, parsed.data);
      if (saveError) {
        setError(t("common.somethingWentWrong", lang));
        return false;
      }
      return true;
    } catch {
      setError(t("common.somethingWentWrong", lang));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    const ok = await saveDraft();
    if (ok) setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }

  async function handleApprove() {
    const ok = await saveDraft();
    if (!ok) return;

    setApproving(true);
    setError(null);
    try {
      const { error: approveError } = await approveCharter(projectId);
      if (approveError) {
        setError(t("common.somethingWentWrong", lang));
        return;
      }
      const now = new Date().toISOString();
      setIsApproved(true);
      setApprovedAt(now);
      onApproved(now);
    } catch {
      setError(t("common.somethingWentWrong", lang));
    } finally {
      setApproving(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-ink-soft mb-4">{t("projects.charterIntro", lang)}</p>

      {isApproved && (
        <div className="mb-4 text-sm font-bold text-navy bg-navy/5 rounded-lg px-3 py-2">
          {t("projects.charterApproved", lang)}
          {approvedAt && (
            <span className="text-ink-soft font-normal">
              {" "}
              — {t("projects.charterApprovedOn", lang)} {new Date(approvedAt).toLocaleDateString(lang)}
            </span>
          )}
        </div>
      )}

      <StepIndicator total={STEP_COUNT} current={step} />
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <FormField label={t("projects.fieldVision", lang)}>
            <textarea
              className="field-input w-full min-h-[80px]"
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              maxLength={2000}
            />
          </FormField>
          <FormField label={t("projects.fieldObjectives", lang)}>
            <textarea
              className="field-input w-full min-h-[80px]"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              maxLength={2000}
            />
          </FormField>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <FormField label={t("projects.fieldDeliverables", lang)}>
            <textarea
              className="field-input w-full min-h-[80px]"
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              maxLength={2000}
            />
          </FormField>
          <FormField label={t("projects.fieldSponsorName", lang)}>
            <Input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} maxLength={120} />
          </FormField>
          <FormField label={t("projects.fieldSponsorAuthority", lang)}>
            <textarea
              className="field-input w-full min-h-[80px]"
              value={sponsorAuthority}
              onChange={(e) => setSponsorAuthority(e.target.value)}
              maxLength={500}
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="field-label mb-2">{t("projects.fieldCoreTeam", lang)}</p>
          <div className="flex flex-col gap-2 mb-3">
            {coreTeam.map((member, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder={t("projects.coreTeamName", lang)}
                  value={member.name}
                  onChange={(e) =>
                    setCoreTeam((prev) => prev.map((m, idx) => (idx === i ? { ...m, name: e.target.value } : m)))
                  }
                  className="flex-1"
                />
                <Input
                  placeholder={t("projects.coreTeamRole", lang)}
                  value={member.role}
                  onChange={(e) =>
                    setCoreTeam((prev) => prev.map((m, idx) => (idx === i ? { ...m, role: e.target.value } : m)))
                  }
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setCoreTeam((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-orange-dark shrink-0"
                >
                  {t("projects.remove", lang)}
                </button>
              </div>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setCoreTeam((prev) => [...prev, { name: "", role: "" }])}>
            {t("projects.addTeamMember", lang)}
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <ListEditor
            label={t("projects.fieldAssumptions", lang)}
            addLabel={t("projects.addAssumption", lang)}
            removeLabel={t("projects.remove", lang)}
            items={assumptions}
            onChange={setAssumptions}
          />
          <ListEditor
            label={t("projects.fieldConstraints", lang)}
            addLabel={t("projects.addConstraint", lang)}
            removeLabel={t("projects.remove", lang)}
            items={constraints}
            onChange={setConstraints}
          />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3 text-sm">
          <SummaryRow label={t("projects.fieldVision", lang)} value={vision} />
          <SummaryRow label={t("projects.fieldObjectives", lang)} value={objectives} />
          <SummaryRow label={t("projects.fieldDeliverables", lang)} value={deliverables} />
          <SummaryRow label={t("projects.fieldSponsorName", lang)} value={sponsorName} />
          <SummaryRow label={t("projects.fieldCoreTeam", lang)} value={coreTeam.map((m) => `${m.name} (${m.role})`).join(", ")} />
          <SummaryRow label={t("projects.fieldAssumptions", lang)} value={assumptions.join(" · ")} />
          <SummaryRow label={t("projects.fieldConstraints", lang)} value={constraints.join(" · ")} />
        </div>
      )}

      <div className="flex gap-2 mt-6">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving || approving}>
            ←
          </Button>
        )}
        {step < STEP_COUNT - 1 ? (
          <Button onClick={goNext} disabled={saving}>
            {saving ? t("projects.saving", lang) : t("common.next", lang)}
          </Button>
        ) : (
          <>
            <Button onClick={() => saveDraft()} disabled={saving || approving}>
              {saving ? t("projects.saving", lang) : t("projects.save", lang)}
            </Button>
            {!isApproved && (
              <Button onClick={handleApprove} disabled={approving || saving}>
                {approving ? t("projects.approving", lang) : t("projects.approveCharter", lang)}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ListEditor({
  label,
  addLabel,
  removeLabel,
  items,
  onChange,
}: {
  label: string;
  addLabel: string;
  removeLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <p className="field-label mb-2">{label}</p>
      <div className="flex flex-col gap-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={item}
              onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-xs text-orange-dark shrink-0"
            >
              {removeLabel}
            </button>
          </div>
        ))}
      </div>
      <Button variant="ghost" onClick={() => onChange([...items, ""])}>
        {addLabel}
      </Button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-ink-soft">{label}</p>
      <p className="text-ink">{value || "—"}</p>
    </div>
  );
}
