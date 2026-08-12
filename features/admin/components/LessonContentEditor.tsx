"use client";

import { useEffect, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card, ErrorState, Loading } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import {
  AdminCourseRow,
  AdminModuleRow,
  AdminLessonListRow,
  listModulesForCourse,
  listLessonsForModule,
  getLessonForEditing,
  saveLessonDraft,
  publishLessonDraft,
} from "@/shared/services/lesson-content.service";

/**
 * Shared PMP/English lesson editor (§0.1/§3 of the CMS brief — the
 * owner's own decision after the "no separate English data domain"
 * finding: two routes, one underlying editor). `scope="english"`
 * narrows the textarea to content.grammar_point/content.language_task
 * only, merging back into the full content object on save so nothing
 * else in the lesson is touched. `scope="pmp"` edits the whole content
 * object directly.
 *
 * Draft semantics come entirely from save_lesson_draft/
 * publish_lesson_draft (063) — this component never decides whether an
 * edit goes to `content` or `draft_content`; it always shows whichever
 * one is currently "the thing being edited" (draft_content if a draft
 * is already pending, otherwise the live content) and lets the DB
 * function route the write correctly based on review_status.
 */
export function LessonContentEditor({
  scope,
  courses,
  lang,
}: {
  scope: "pmp" | "english";
  courses: AdminCourseRow[];
  lang: Lang;
}) {
  const supabase = supabaseBrowser();

  const [courseId, setCourseId] = useState<string>(courses[0]?.id || "");
  const [modules, setModules] = useState<AdminModuleRow[]>([]);
  const [moduleId, setModuleId] = useState<string>("");
  const [lessons, setLessons] = useState<AdminLessonListRow[]>([]);
  const [lessonId, setLessonId] = useState<string>("");

  const [baseContent, setBaseContent] = useState<Record<string, unknown> | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);

  const [pmpJson, setPmpJson] = useState("");
  const [grammarJson, setGrammarJson] = useState("");
  const [languageTaskJson, setLanguageTaskJson] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    setModuleId("");
    setLessons([]);
    setLessonId("");
    listModulesForCourse(supabase, courseId).then(setModules).catch(() => setModules([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (!moduleId) return;
    setLessonId("");
    listLessonsForModule(supabase, moduleId).then(setLessons).catch(() => setLessons([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  useEffect(() => {
    if (!lessonId) {
      setBaseContent(null);
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    getLessonForEditing(supabase, lessonId)
      .then((row) => {
        if (!row) {
          setError(t("admin.contentLessonNotFound", lang));
          return;
        }
        const editable = (row.draft_content ?? row.content) as Record<string, unknown>;
        setBaseContent(editable);
        setReviewStatus(row.review_status);
        setHasPendingDraft(row.draft_content !== null);
        setPmpJson(JSON.stringify(editable, null, 2));
        setGrammarJson(JSON.stringify(editable.grammar_point ?? {}, null, 2));
        setLanguageTaskJson(JSON.stringify(editable.language_task ?? {}, null, 2));
      })
      .catch(() => setError(t("admin.contentLessonNotFound", lang)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function save() {
    if (!baseContent || !lessonId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    let merged: Record<string, unknown>;
    try {
      if (scope === "pmp") {
        merged = JSON.parse(pmpJson);
      } else {
        merged = { ...baseContent, grammar_point: JSON.parse(grammarJson), language_task: JSON.parse(languageTaskJson) };
      }
    } catch {
      setError(t("admin.contentInvalidJson", lang));
      setSaving(false);
      return;
    }
    try {
      const res = await saveLessonDraft(supabase, lessonId, merged);
      if (!res.saved) {
        setError(res.reason || t("admin.contentSaveFailed", lang));
        return;
      }
      setMessage(t("admin.contentDraftSaved", lang));
      setHasPendingDraft(true);
      setBaseContent(merged);
    } catch {
      setError(t("admin.contentSaveFailed", lang));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!lessonId) return;
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await publishLessonDraft(supabase, lessonId);
      if (!res.published) {
        setError(res.reason || t("admin.contentPublishFailed", lang));
        return;
      }
      setMessage(t("admin.contentPublished", lang));
      setHasPendingDraft(false);
      if (reviewStatus !== "approved") setReviewStatus("approved");
    } catch {
      setError(t("admin.contentPublishFailed", lang));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy mb-3">
        {scope === "pmp" ? t("admin.contentLessonsPmpHeading", lang) : t("admin.contentLessonsEnglishHeading", lang)}
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <select className="field-input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select className="field-input" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
          <option value="">{t("admin.contentSelectModule", lang)}</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <select className="field-input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
          <option value="">{t("admin.contentSelectLesson", lang)}</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title} {l.has_pending_draft ? "•" : ""} {l.review_status && l.review_status !== "approved" ? `(${l.review_status})` : ""}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      {message && <p className="text-sm font-bold text-navy mb-3">{message}</p>}

      {loading && <Loading />}

      {!loading && baseContent && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-soft">{t("admin.contentReviewStatus", lang)}:</span>
            <span className="font-bold">{reviewStatus}</span>
            {hasPendingDraft && <span className="font-bold text-orange-dark">— {t("admin.contentPendingDraft", lang)}</span>}
          </div>

          {scope === "pmp" ? (
            <>
              <label className="text-xs text-ink-soft font-bold">{t("admin.contentFullJson", lang)}</label>
              <textarea
                className="field-input font-mono text-xs"
                rows={16}
                value={pmpJson}
                onChange={(e) => setPmpJson(e.target.value)}
              />
            </>
          ) : (
            <>
              <label className="text-xs text-ink-soft font-bold">{t("admin.contentGrammarPointJson", lang)}</label>
              <textarea
                className="field-input font-mono text-xs"
                rows={10}
                value={grammarJson}
                onChange={(e) => setGrammarJson(e.target.value)}
              />
              <label className="text-xs text-ink-soft font-bold">{t("admin.contentLanguageTaskJson", lang)}</label>
              <textarea
                className="field-input font-mono text-xs"
                rows={6}
                value={languageTaskJson}
                onChange={(e) => setLanguageTaskJson(e.target.value)}
              />
            </>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? t("admin.contentSaving", lang) : t("admin.contentSaveDraft", lang)}
            </Button>
            <Button variant="ghost" onClick={publish} disabled={publishing || !hasPendingDraft && reviewStatus === "approved"}>
              {publishing ? t("admin.contentPublishing", lang) : t("admin.contentPublish", lang)}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
