"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { MyModuleWithLessons } from "@/features/instructor/services/instructor-course.service";

function AddLessonForm({
  moduleId,
  nextOrder,
  onAdded,
}: {
  moduleId: string;
  nextOrder: number;
  onAdded: (lesson: { id: string; title: string; order_index: number }) => void;
}) {
  const { t } = useLang("ar");
  const [open, setOpen] = useState(false);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!titleAr.trim() || !bodyAr.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const translations: Record<string, { title: string; body: string }> = {
        ar: { title: titleAr.trim(), body: bodyAr.trim() },
      };
      if (titleEn.trim() || bodyEn.trim()) {
        translations.en = { title: titleEn.trim() || titleAr.trim(), body: bodyEn.trim() || bodyAr.trim() };
      }
      const { data, error: insertError } = await supabase
        .from("lessons")
        .insert({
          module_id: moduleId,
          title: titleAr.trim(),
          translations,
          video_url: videoUrl.trim() || null,
          order_index: nextOrder,
        })
        .select("id, title, order_index")
        .single();
      if (insertError || !data) {
        setError(translateAuthError(insertError, "ar"));
        return;
      }
      onAdded(data);
      setTitleAr("");
      setTitleEn("");
      setBodyAr("");
      setBodyEn("");
      setVideoUrl("");
      setOpen(false);
    } catch (err) {
      setError(translateAuthError(err, "ar"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-bold text-navy hover:underline py-2">
        + {t("instructor.addLesson")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-3 border-t border-line/60">
      {error && <ErrorState message={error} />}
      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.lessonTitleArPlaceholder")}
        value={titleAr}
        onChange={(e) => setTitleAr(e.target.value)}
      />
      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.lessonTitleEnPlaceholder")}
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
        placeholder={t("instructor.lessonBodyEnPlaceholder")}
        value={bodyEn}
        onChange={(e) => setBodyEn(e.target.value)}
        rows={3}
      />
      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.lessonVideoUrlPlaceholder")}
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={loading || !titleAr.trim() || !bodyAr.trim()}>
          {loading ? t("instructor.addingLesson") : t("instructor.addLessonSubmit")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

function AddModuleForm({
  courseId,
  nextOrder,
  onAdded,
}: {
  courseId: string;
  nextOrder: number;
  onAdded: (module: MyModuleWithLessons) => void;
}) {
  const { t } = useLang("ar");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { data, error: insertError } = await supabase
        .from("modules")
        .insert({ course_id: courseId, title: title.trim(), order_index: nextOrder })
        .select("id, title, order_index")
        .single();
      if (insertError || !data) {
        setError(translateAuthError(insertError, "ar"));
        return;
      }
      onAdded({ ...data, lessons: [] });
      setTitle("");
    } catch (err) {
      setError(translateAuthError(err, "ar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4 flex flex-col gap-2">
      {error && <ErrorState message={error} />}
      <div className="flex gap-2">
        <input
          className="border border-line rounded-lg px-3 py-2 text-sm flex-1"
          placeholder={t("instructor.moduleTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button onClick={handleAdd} disabled={loading || !title.trim()}>
          {loading ? t("instructor.addingModule") : t("instructor.addModule")}
        </Button>
      </div>
    </Card>
  );
}

export function CourseContentManager({
  courseId,
  initialModules,
}: {
  courseId: string;
  initialModules: MyModuleWithLessons[];
}) {
  const { t } = useLang("ar");
  const [modules, setModules] = useState(initialModules);

  return (
    <div className="flex flex-col gap-4">
      {modules.map((module) => (
        <Card key={module.id} className="p-5">
          <h3 className="font-display font-bold text-navy mb-2">{module.title}</h3>
          <div className="flex flex-col">
            {module.lessons.map((lesson) => (
              <div key={lesson.id} className="py-2 text-sm border-t border-line/60 first:border-t-0">
                {lesson.title}
              </div>
            ))}
            {module.lessons.length === 0 && (
              <p className="text-xs text-ink-soft py-2">{t("instructor.noLessonsYet")}</p>
            )}
          </div>
          <AddLessonForm
            moduleId={module.id}
            nextOrder={module.lessons.length}
            onAdded={(lesson) =>
              setModules((prev) =>
                prev.map((m) => (m.id === module.id ? { ...m, lessons: [...m.lessons, { ...lesson }] } : m))
              )
            }
          />
        </Card>
      ))}

      {modules.length === 0 && <p className="text-sm text-ink-soft">{t("instructor.noModulesYet")}</p>}

      <AddModuleForm
        courseId={courseId}
        nextOrder={modules.length}
        onAdded={(module) => setModules((prev) => [...prev, module])}
      />
    </div>
  );
}
