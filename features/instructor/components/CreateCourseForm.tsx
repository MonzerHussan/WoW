"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";

const TRACKS = ["education", "employment", "promotion"] as const;

export function CreateCourseForm() {
  const router = useRouter();
  const { t } = useLang("ar");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<(typeof TRACKS)[number]>("education");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), track, summary: summary.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.somethingWentWrong"));
        return;
      }
      router.push(`/instructor/courses/${data.course.id}`);
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>{t("instructor.createCourseCta")}</Button>;
  }

  return (
    <div className="bg-white border border-line rounded-wow p-5 flex flex-col gap-3">
      {error && <ErrorState message={error} />}
      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.courseTitlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <select
        className="border border-line rounded-lg px-3 py-2 text-sm"
        value={track}
        onChange={(e) => setTrack(e.target.value as (typeof TRACKS)[number])}
      >
        <option value="education">{t("instructor.trackEducation")}</option>
        <option value="employment">{t("instructor.trackEmployment")}</option>
        <option value="promotion">{t("instructor.trackPromotion")}</option>
      </select>
      <textarea
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.courseSummaryPlaceholder")}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
      />
      <div className="flex gap-2">
        <Button onClick={handleCreate} disabled={loading || !title.trim()}>
          {loading ? t("instructor.creatingCourse") : t("instructor.createCourseSubmit")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
