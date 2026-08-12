"use client";

import { useMemo, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { KbScenarioRow, ContentDraftRow } from "@/shared/services/content-draft.service";

type FormState = {
  ruleScope: string;
  scenarioKey: string;
  titleAr: string;
  titleEn: string;
  contextAr: string;
  contextEn: string;
  choicesJson: string;
  isActive: boolean;
};

function emptyForm(ruleScopes: string[]): FormState {
  return {
    ruleScope: ruleScopes[0] || "",
    scenarioKey: "",
    titleAr: "",
    titleEn: "",
    contextAr: "",
    contextEn: "",
    choicesJson: JSON.stringify(
      [
        { key: "A", label_ar: "", label_en: "" },
        { key: "B", label_ar: "", label_en: "" },
      ],
      null,
      2
    ),
    isActive: true,
  };
}

function formFromScenario(row: KbScenarioRow): FormState {
  return {
    ruleScope: row.rule_scope,
    scenarioKey: row.scenario_key,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    contextAr: row.body?.context_ar || "",
    contextEn: row.body?.context_en || "",
    choicesJson: JSON.stringify(row.body?.choices || [], null, 2),
    isActive: row.is_active,
  };
}

function formFromDraftPayload(payload: Record<string, unknown>): FormState {
  const body = (payload.body as any) || {};
  return {
    ruleScope: (payload.rule_scope as string) || "",
    scenarioKey: (payload.scenario_key as string) || "",
    titleAr: (payload.title_ar as string) || "",
    titleEn: (payload.title_en as string) || "",
    contextAr: body.context_ar || "",
    contextEn: body.context_en || "",
    choicesJson: JSON.stringify(body.choices || [], null, 2),
    isActive: payload.is_active !== false,
  };
}

/**
 * Draft/Publish editor for kb_scenarios (062) — every write goes
 * through content_drafts + publish_content_draft(), never a direct
 * table write. Plain textareas (choices as raw JSON) per the brief's
 * own §7 scope ("no rich editor for v1").
 */
export function KbScenarioEditor({
  scenarios,
  ruleScopes,
  drafts,
  lang,
  onChanged,
}: {
  scenarios: KbScenarioRow[];
  ruleScopes: string[];
  drafts: ContentDraftRow[];
  lang: Lang;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(ruleScopes));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // latest pending draft per target_id (or per "new" scenario_key+rule_scope combo for creates)
  const pendingDraftByTarget = useMemo(() => {
    const map: Record<string, ContentDraftRow> = {};
    for (const d of drafts) {
      if (d.status !== "draft") continue;
      const key = d.target_id || `new:${(d.payload as any)?.rule_scope}:${(d.payload as any)?.scenario_key}`;
      if (!map[key] || d.created_at > map[key].created_at) map[key] = d;
    }
    return map;
  }, [drafts]);

  function startEdit(row: KbScenarioRow) {
    const pending = pendingDraftByTarget[row.id];
    setForm(pending ? formFromDraftPayload(pending.payload) : formFromScenario(row));
    setEditingId(row.id);
    setError(null);
  }

  function startNew() {
    setForm(emptyForm(ruleScopes));
    setEditingId("new");
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    let choices;
    try {
      choices = JSON.parse(form.choicesJson);
    } catch {
      setError(t("admin.contentInvalidJson", lang));
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/content/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTable: "kb_scenarios",
          targetId: editingId === "new" ? null : editingId,
          action: "upsert",
          payload: {
            rule_scope: form.ruleScope,
            scenario_key: form.scenarioKey,
            title_ar: form.titleAr,
            title_en: form.titleEn,
            body: { context_ar: form.contextAr, context_en: form.contextEn, choices },
            is_active: form.isActive,
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

  async function requestDelete(row: KbScenarioRow) {
    setError(null);
    try {
      const res = await fetch("/api/admin/content/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTable: "kb_scenarios", targetId: row.id, action: "delete" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("admin.contentSaveFailed", lang));
        return;
      }
      onChanged();
    } catch {
      setError(t("admin.contentSaveFailed", lang));
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-navy">{t("admin.contentScenariosHeading", lang)}</h3>
        <Button variant="ghost" onClick={startNew}>
          {t("admin.contentNewScenario", lang)}
        </Button>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {scenarios.map((row) => {
          const pending = pendingDraftByTarget[row.id];
          return (
            <div key={row.id} className="border border-line rounded-lg p-3 flex items-center justify-between gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink truncate">
                  {lang === "ar" ? row.title_ar : row.title_en}{" "}
                  <span className="text-xs text-ink-soft font-mono">({row.rule_scope} / {row.scenario_key})</span>
                </p>
                {pending && (
                  <span className="text-xs font-bold text-orange-dark">
                    {pending.action === "delete" ? t("admin.contentPendingDelete", lang) : t("admin.contentPendingDraft", lang)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pending ? (
                  <Button
                    variant="ghost"
                    disabled={publishingId === pending.id}
                    onClick={() => publish(pending.id)}
                    className="text-xs"
                  >
                    {publishingId === pending.id ? t("admin.contentPublishing", lang) : t("admin.contentPublish", lang)}
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => startEdit(row)} className="text-xs">
                      {t("admin.contentEdit", lang)}
                    </Button>
                    <Button variant="ghost" onClick={() => requestDelete(row)} className="text-xs text-orange-dark">
                      {t("admin.contentDelete", lang)}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingId && (
        <div className="border-t border-line pt-4 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="field-input"
              value={form.ruleScope}
              onChange={(e) => setForm((f) => ({ ...f, ruleScope: e.target.value }))}
              disabled={editingId !== "new"}
            >
              {ruleScopes.map((rs) => (
                <option key={rs} value={rs}>
                  {rs}
                </option>
              ))}
            </select>
            <input
              className="field-input"
              placeholder="scenario_key"
              value={form.scenarioKey}
              onChange={(e) => setForm((f) => ({ ...f, scenarioKey: e.target.value }))}
              disabled={editingId !== "new"}
            />
          </div>
          <input
            className="field-input"
            placeholder={t("admin.contentTitleAr", lang)}
            value={form.titleAr}
            onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))}
          />
          <input
            className="field-input"
            placeholder={t("admin.contentTitleEn", lang)}
            value={form.titleEn}
            onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
          />
          <textarea
            className="field-input"
            rows={2}
            placeholder={t("admin.contentContextAr", lang)}
            value={form.contextAr}
            onChange={(e) => setForm((f) => ({ ...f, contextAr: e.target.value }))}
          />
          <textarea
            className="field-input"
            rows={2}
            placeholder={t("admin.contentContextEn", lang)}
            value={form.contextEn}
            onChange={(e) => setForm((f) => ({ ...f, contextEn: e.target.value }))}
          />
          <label className="text-xs text-ink-soft font-bold">{t("admin.contentChoicesJson", lang)}</label>
          <textarea
            className="field-input font-mono text-xs"
            rows={8}
            value={form.choicesJson}
            onChange={(e) => setForm((f) => ({ ...f, choicesJson: e.target.value }))}
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
