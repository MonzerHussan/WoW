"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { SharedModule } from "@/features/instructor/services/curriculum-contribution.service";

const EMPTY_VOCAB = Array.from({ length: 5 }, () => ({ ar: "", en: "" }));

export function SuggestLessonForm({
  modules,
  onSubmitted,
  onCancel,
}: {
  modules: SharedModule[];
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const { t } = useLang("ar");
  const [moduleId, setModuleId] = useState(modules[0]?.id || "");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [vocabulary, setVocabulary] = useState(EMPTY_VOCAB);
  const [toolboxAr, setToolboxAr] = useState("");
  const [toolboxEn, setToolboxEn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateVocab(index: number, field: "ar" | "en", value: string) {
    setVocabulary((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

  const vocabularyComplete = vocabulary.every((v) => v.ar.trim() && v.en.trim());
  const canSubmit =
    moduleId && titleAr.trim() && titleEn.trim() && bodyAr.trim().length >= 10 && bodyEn.trim().length >= 10 && vocabularyComplete;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/curriculum/suggest-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          titleAr: titleAr.trim(),
          titleEn: titleEn.trim(),
          bodyAr: bodyAr.trim(),
          bodyEn: bodyEn.trim(),
          vocabulary: vocabulary.map((v) => ({ ar: v.ar.trim(), en: v.en.trim() })),
          toolboxAr: toolboxAr.trim() || undefined,
          toolboxEn: toolboxEn.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.somethingWentWrong"));
        return;
      }
      onSubmitted();
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-3">
      {error && <ErrorState message={error} />}

      <label className="text-xs font-bold text-ink-soft">{t("instructor.suggestLessonModule")}</label>
      <select className="border border-line rounded-lg px-3 py-2 text-sm" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>

      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.lessonTitleArPlaceholder")}
        value={titleAr}
        onChange={(e) => setTitleAr(e.target.value)}
      />
      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.suggestTitleEnPlaceholder")}
        value={titleEn}
        onChange={(e) => setTitleEn(e.target.value)}
      />
      <textarea
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.lessonBodyArPlaceholder")}
        value={bodyAr}
        onChange={(e) => setBodyAr(e.target.value)}
        rows={3}
      />
      <textarea
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.suggestBodyEnPlaceholder")}
        value={bodyEn}
        onChange={(e) => setBodyEn(e.target.value)}
        rows={3}
      />

      <label className="text-xs font-bold text-ink-soft">{t("instructor.vocabularyLabel")}</label>
      <div className="flex flex-col gap-2">
        {vocabulary.map((pair, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="border border-line rounded-lg px-3 py-2 text-sm flex-1"
              placeholder={`${t("instructor.vocabArPlaceholder")} ${i + 1}`}
              value={pair.ar}
              onChange={(e) => updateVocab(i, "ar", e.target.value)}
            />
            <input
              className="border border-line rounded-lg px-3 py-2 text-sm flex-1"
              placeholder={`${t("instructor.vocabEnPlaceholder")} ${i + 1}`}
              value={pair.en}
              onChange={(e) => updateVocab(i, "en", e.target.value)}
            />
          </div>
        ))}
      </div>

      <label className="text-xs font-bold text-ink-soft">{t("instructor.toolboxOptionalLabel")}</label>
      <textarea
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.toolboxArPlaceholder")}
        value={toolboxAr}
        onChange={(e) => setToolboxAr(e.target.value)}
        rows={2}
      />
      <textarea
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.toolboxEnPlaceholder")}
        value={toolboxEn}
        onChange={(e) => setToolboxEn(e.target.value)}
        rows={2}
      />

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
          {loading ? t("instructor.submittingLesson") : t("instructor.submitLessonProposal")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {t("common.cancel")}
        </Button>
      </div>
    </Card>
  );
}
