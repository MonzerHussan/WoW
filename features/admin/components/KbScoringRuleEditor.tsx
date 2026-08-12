"use client";

import { useMemo, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { KbScoringRuleRow, ContentDraftRow } from "@/shared/services/content-draft.service";

type FormState = {
  ruleScope: string;
  scenarioKey: string;
  decisionKey: string;
  score: string;
  feedbackAr: string;
  feedbackEn: string;
};

function formFromRule(row: KbScoringRuleRow): FormState {
  return {
    ruleScope: row.rule_scope,
    scenarioKey: row.scenario_key,
    decisionKey: row.decision_key,
    score: String(row.score),
    feedbackAr: row.feedback_ar,
    feedbackEn: row.feedback_en,
  };
}

function formFromDraftPayload(payload: Record<string, unknown>): FormState {
  return {
    ruleScope: (payload.rule_scope as string) || "",
    scenarioKey: (payload.scenario_key as string) || "",
    decisionKey: (payload.decision_key as string) || "",
    score: String(payload.score ?? ""),
    feedbackAr: (payload.feedback_ar as string) || "",
    feedbackEn: (payload.feedback_en as string) || "",
  };
}

/** Draft/Publish editor for kb_scoring_rules (062) — grouped by scenario so the four choices A-D are edited together. */
export function KbScoringRuleEditor({
  rules,
  drafts,
  lang,
  onChanged,
}: {
  rules: KbScoringRuleRow[];
  drafts: ContentDraftRow[];
  lang: Lang;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const pendingDraftByTarget = useMemo(() => {
    const map: Record<string, ContentDraftRow> = {};
    for (const d of drafts) {
      if (d.status !== "draft" || !d.target_id) continue;
      if (!map[d.target_id] || d.created_at > map[d.target_id].created_at) map[d.target_id] = d;
    }
    return map;
  }, [drafts]);

  const grouped = useMemo(() => {
    const byScenario: Record<string, KbScoringRuleRow[]> = {};
    for (const r of rules) {
      const key = `${r.rule_scope}::${r.scenario_key}`;
      (byScenario[key] ||= []).push(r);
    }
    return byScenario;
  }, [rules]);

  function startEdit(row: KbScoringRuleRow) {
    const pending = pendingDraftByTarget[row.id];
    setForm(pending ? formFromDraftPayload(pending.payload) : formFromRule(row));
    setEditingId(row.id);
    setError(null);
  }

  async function save() {
    if (!form || !editingId) return;
    setSaving(true);
    setError(null);
    const scoreNum = Number(form.score);
    if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setError(t("admin.contentInvalidScore", lang));
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/content/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTable: "kb_scoring_rules",
          targetId: editingId,
          action: "upsert",
          payload: {
            rule_scope: form.ruleScope,
            scenario_key: form.scenarioKey,
            decision_key: form.decisionKey,
            score: scoreNum,
            feedback_ar: form.feedbackAr,
            feedback_en: form.feedbackEn,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("admin.contentSaveFailed", lang));
        return;
      }
      setEditingId(null);
      onChanged();
    } catch {
      setError(t("admin.contentSaveFailed", lang));
    } finally {
      setSaving(false);
    }
  }

  async function publish(draftId: string) {
    setPublishingId(draftId);
    setError(null);
    try {
      const res = await fetch("/api/admin/content/drafts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("admin.contentPublishFailed", lang));
        return;
      }
      onChanged();
    } catch {
      setError(t("admin.contentPublishFailed", lang));
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy mb-3">{t("admin.contentScoringRulesHeading", lang)}</h3>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {Object.entries(grouped).map(([key, group]) => (
          <div key={key} className="border border-line rounded-lg p-3">
            <p className="text-xs font-mono text-ink-soft mb-2">{key}</p>
            <div className="flex flex-col gap-1">
              {group.map((row) => {
                const pending = pendingDraftByTarget[row.id];
                return (
                  <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-bold">{row.decision_key}</span>
                    <span className="flex-1 truncate text-ink-soft">{row.score} — {lang === "ar" ? row.feedback_ar : row.feedback_en}</span>
                    {pending && <span className="text-xs font-bold text-orange-dark">{t("admin.contentPendingDraft", lang)}</span>}
                    {pending ? (
                      <Button variant="ghost" disabled={publishingId === pending.id} onClick={() => publish(pending.id)} className="text-xs">
                        {publishingId === pending.id ? t("admin.contentPublishing", lang) : t("admin.contentPublish", lang)}
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => startEdit(row)} className="text-xs">
                        {t("admin.contentEdit", lang)}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {editingId && form && (
        <div className="border-t border-line pt-4 mt-4 flex flex-col gap-2">
          <input
            className="field-input w-24"
            type="number"
            min={0}
            max={100}
            value={form.score}
            onChange={(e) => setForm((f) => (f ? { ...f, score: e.target.value } : f))}
          />
          <textarea
            className="field-input"
            rows={2}
            placeholder={t("admin.contentFeedbackAr", lang)}
            value={form.feedbackAr}
            onChange={(e) => setForm((f) => (f ? { ...f, feedbackAr: e.target.value } : f))}
          />
          <textarea
            className="field-input"
            rows={2}
            placeholder={t("admin.contentFeedbackEn", lang)}
            value={form.feedbackEn}
            onChange={(e) => setForm((f) => (f ? { ...f, feedbackEn: e.target.value } : f))}
          />
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? t("admin.contentSaving", lang) : t("admin.contentSaveDraft", lang)}
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              {t("admin.contentCancel", lang)}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
