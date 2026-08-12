"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState, Loading } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";

interface WbsItem {
  id: string;
  parent_id: string | null;
  name: string;
  order_index: number;
}

/** Flattens the tree into display order (parent immediately followed by
 *  its children, depth-first) — used for both the tree view and the
 *  parent <select>'s option order/indentation. */
function flattenForDisplay(items: WbsItem[], parentId: string | null = null, depth = 0): { item: WbsItem; depth: number }[] {
  return items
    .filter((i) => i.parent_id === parentId)
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((item) => [{ item, depth }, ...flattenForDisplay(items, item.id, depth + 1)]);
}

/**
 * Interactive WBS builder (Level 2 Unit 1's own exercise) — writes
 * directly to project_wbs_items (043), no new RPC: the existing owner-
 * scoped RLS is enough, same simplicity DecisionLogPanel already uses
 * for decision_log. The root item (named after the project) is created
 * automatically on first load; the learner only ever adds work packages
 * under it or under each other.
 *
 * Deleting a parent with existing children is BLOCKED, not cascaded —
 * 049 made this a real DB-level guarantee (ON DELETE RESTRICT), not
 * just a UI check; the 23503 it raises is what triggers the message.
 */
export function WbsBuilder({ projectId, projectName, lang }: { projectId: string; projectName: string; lang: Lang }) {
  const [items, setItems] = useState<WbsItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { data, error: fetchError } = await supabase
      .from("project_wbs_items")
      .select("id, parent_id, name, order_index")
      .eq("project_id", projectId)
      .order("order_index");

    if (fetchError) {
      setError(t("level2.wbsErrGeneric", lang));
      setLoading(false);
      return;
    }

    let rows = data || [];
    if (rows.length === 0) {
      const { data: root, error: rootError } = await supabase
        .from("project_wbs_items")
        .insert({ project_id: projectId, parent_id: null, name: projectName, order_index: 0 })
        .select("id, parent_id, name, order_index")
        .single();

      if (rootError && rootError.code === "23505") {
        // Two concurrent loads both saw zero rows and both tried to
        // create the root (React StrictMode double-invokes effects in
        // dev — caught live, not theorized: 050's own migration header
        // has the full story). The unique index (050) lets exactly one
        // insert win; this one lost, so just re-read the real row.
        const { data: refetched } = await supabase
          .from("project_wbs_items")
          .select("id, parent_id, name, order_index")
          .eq("project_id", projectId)
          .order("order_index");
        rows = refetched || [];
      } else if (rootError || !root) {
        setError(t("level2.wbsErrGeneric", lang));
        setLoading(false);
        return;
      } else {
        rows = [root];
      }
    }

    setItems(rows);
    setParentId((prev) => prev ?? rows.find((r) => r.parent_id === null)?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const flat = useMemo(() => (items ? flattenForDisplay(items) : []), [items]);
  const root = items?.find((i) => i.parent_id === null) || null;
  const rootChildCount = items?.filter((i) => root && i.parent_id === root.id).length ?? 0;

  async function handleAdd() {
    if (!name.trim() || !parentId) return;
    setSaving(true);
    setError(null);
    const supabase = supabaseBrowser();
    const siblingCount = items?.filter((i) => i.parent_id === parentId).length ?? 0;
    const { data, error: insertError } = await supabase
      .from("project_wbs_items")
      .insert({ project_id: projectId, parent_id: parentId, name: name.trim(), order_index: siblingCount })
      .select("id, parent_id, name, order_index")
      .single();

    if (insertError || !data) {
      setError(t("level2.wbsErrGeneric", lang));
      setSaving(false);
      return;
    }

    setItems((prev) => [...(prev || []), data]);
    setName("");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setError(null);
    const supabase = supabaseBrowser();
    const { error: deleteError } = await supabase.from("project_wbs_items").delete().eq("id", id);

    if (deleteError) {
      // 23503 = foreign_key_violation — the RESTRICT constraint (049)
      // caught here specifically; anything else is a generic failure.
      if (deleteError.code === "23503") {
        setError(t("level2.wbsErrHasChildren", lang));
      } else {
        setError(t("level2.wbsErrGeneric", lang));
      }
      return;
    }

    setItems((prev) => (prev || []).filter((i) => i.id !== id));
  }

  if (loading) return <Loading label={t("level2.wbsLoading", lang)} />;

  return (
    <Card className="p-5">
      <h3 className="font-display font-black text-lg text-navy mb-1">{t("level2.wbsTitle", lang)}</h3>
      <p className="text-sm text-ink-soft mb-3">{t("level2.wbsDesc", lang)}</p>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-ink-soft">
          {rootChildCount >= 3 ? "✓ " : ""}
          {t("level2.wbsProgress", lang)}: {rootChildCount} / 3-5
        </span>
      </div>

      <div className="flex flex-col gap-1 mb-4">
        {flat.map(({ item, depth }) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-line/50"
            style={{ paddingInlineStart: `${depth * 1.25}rem` }}
          >
            <span className={depth === 0 ? "font-bold text-navy" : "text-ink"}>
              {depth > 0 && "— "}
              {item.name}
            </span>
            <div className="flex items-center gap-2 flex-none">
              <button
                type="button"
                className="text-xs text-navy hover:underline"
                onClick={() => {
                  setParentId(item.id);
                  nameInputRef.current?.focus();
                }}
              >
                {t("level2.wbsAddChild", lang)}
              </button>
              <button type="button" className="text-xs text-orange-dark hover:underline" onClick={() => handleDelete(item.id)}>
                {t("level2.wbsDelete", lang)}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={nameInputRef}
          className="field-input flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("level2.wbsNamePlaceholder", lang)}
          maxLength={200}
        />
        <select className="field-input sm:w-56" value={parentId ?? ""} onChange={(e) => setParentId(e.target.value)}>
          {flat.map(({ item, depth }) => (
            <option key={item.id} value={item.id}>
              {"— ".repeat(depth)}
              {item.name}
            </option>
          ))}
        </select>
        <Button onClick={handleAdd} disabled={saving || !name.trim()}>
          {saving ? t("level2.wbsAdding", lang) : t("level2.wbsAdd", lang)}
        </Button>
      </div>
    </Card>
  );
}
