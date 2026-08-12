"use client";

import { useMemo, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { BadgeRow, ContentDraftRow } from "@/shared/services/content-draft.service";

type FormState = { name: string; description: string; icon: string; pointsValue: string };

function emptyForm(): FormState {
  return { name: "", description: "", icon: "🏆", pointsValue: "0" };
}

function formFromBadge(row: BadgeRow): FormState {
  return {
    name: row.name,
    description: row.description || "",
    icon: row.icon || "",
    pointsValue: String(row.points_value),
  };
}

function formFromDraftPayload(payload: Record<string, unknown>): FormState {
  return {
    name: (payload.name as string) || "",
    description: (payload.description as string) || "",
    icon: (payload.icon as string) || "",
    pointsValue: String(payload.points_value ?? "0"),
  };
}

/** Draft/Publish editor for badges (062). */
export function BadgeEditor({
  badges,
  drafts,
  lang,
  onChanged,
}: {
  badges: BadgeRow[];
  drafts: ContentDraftRow[];
  lang: Lang;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const pendingDraftByTarget = useMemo(() => {
    const map: Record<string, ContentDraftRow> = {};
    for (const d of drafts) {
      if (d.status !== "draft") continue;
      const key = d.target_id || `new:${(d.payload as any)?.name}`;
      if (!map[key] || d.created_at > map[key].created_at) map[key] = d;
    }
    return map;
  }, [drafts]);

  function startEdit(row: BadgeRow) {
    const pending = pendingDraftByTarget[row.id];
    setForm(pending ? formFromDraftPayload(pending.payload) : formFromBadge(row));
    setEditingId(row.id);
    setError(null);
  }

  function startNew() {
    setForm(emptyForm());
    setEditingId("new");
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const points = Number(form.pointsValue);
    if (Number.isNaN(points) || points < 0) {
      setError(t("admin.contentInvalidScore", lang));
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/content/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTable: "badges",
          targetId: editingId === "new" ? null : editingId,
          action: "upsert",
          payload: { name: form.name, description: form.description, icon: form.icon, points_value: points },
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

  async function requestDelete(row: BadgeRow) {
    setError(null);
    try {
      const res = await fetch("/api/admin/content/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTable: "badges", targetId: row.id, action: "delete" }),
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
        <h3 className="font-display font-bold text-navy">{t("admin.contentBadgesHeading", lang)}</h3>
        <Button variant="ghost" onClick={startNew}>
          {t("admin.contentNewBadge", lang)}
        </Button>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {badges.map((row) => {
          const pending = pendingDraftByTarget[row.id];
          return (
            <div key={row.id} className="border border-line rounded-lg p-3 flex items-center justify-between gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink truncate">
                  {row.icon} {row.name}
                </p>
                {pending && (
                  <span className="text-xs font-bold text-orange-dark">
                    {pending.action === "delete" ? t("admin.contentPendingDelete", lang) : t("admin.contentPendingDraft", lang)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pending ? (
                  <Button variant="ghost" disabled={publishingId === pending.id} onClick={() => publish(pending.id)} className="text-xs">
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
          <input
            className="field-input"
            placeholder={t("admin.contentBadgeName", lang)}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <textarea
            className="field-input"
            rows={2}
            placeholder={t("admin.contentBadgeDescription", lang)}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="field-input"
              placeholder={t("admin.contentBadgeIcon", lang)}
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            />
            <input
              className="field-input"
              type="number"
              min={0}
              value={form.pointsValue}
              onChange={(e) => setForm((f) => ({ ...f, pointsValue: e.target.value }))}
            />
          </div>
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
