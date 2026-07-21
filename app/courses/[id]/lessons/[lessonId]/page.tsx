import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { getLessonDetail } from "@/features/lms/services/lesson.service";
import { LessonCompleteButton } from "@/features/lms/components/LessonCompleteButton";

interface ModuleClosing {
  optional_language_task?: string;
  coin_cost?: number;
  career_dna_skills?: string;
  series_episode?: string;
  listening_suggestion?: string;
  capstone_task?: string;
}

function VocabularyList({ vocabulary }: { vocabulary: { en: string; ar: string }[] }) {
  if (!vocabulary?.length) return null;
  return (
    <div className="bg-bg rounded-lg p-4 mb-6">
      <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.vocabularyTitle", "ar")}</h2>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {vocabulary.map((v, i) => (
          <div key={i} className="flex justify-between border-b border-line/60 py-1">
            <span className="font-semibold text-ink">{v.ar}</span>
            <span className="text-ink-soft">{v.en}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleClosingCard({ closing }: { closing: ModuleClosing }) {
  const lang = "ar" as const;
  const rows: [string, string | number | undefined][] = [
    [t("lms.languageTask", lang), closing.optional_language_task],
    [t("lms.coinCost", lang), closing.coin_cost],
    [t("lms.dnaSkillsNote", lang), closing.career_dna_skills],
    [t("lms.seriesEpisode", lang), closing.series_episode],
    [t("lms.listeningSuggestion", lang), closing.listening_suggestion],
    [t("lms.capstoneTask", lang), closing.capstone_task],
  ].filter(([, value]) => value !== undefined && value !== "") as [string, string | number][];

  if (rows.length === 0) return null;

  return (
    <div className="border border-line rounded-wow p-5 mb-8">
      <h2 className="font-display font-bold text-navy text-sm mb-3">{t("lms.moduleClosingTitle", lang)}</h2>
      <div className="flex flex-col gap-3">
        {rows.map(([label, value], i) => (
          <div key={i}>
            <p className="text-xs font-bold text-ink-soft mb-0.5">{label}</p>
            <p className="text-sm text-ink">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  const lesson = await getLessonDetail(supabase, params.lessonId, user?.id ?? null);
  if (!lesson) {
    return (
      <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto text-center">
        <p className="text-ink-soft">{t("lms.lessonLocked", lang)}</p>
        <Link href={`/courses/${params.id}`} className="text-navy font-bold mt-4 inline-block">
          ← {t("lms.backToCatalog", lang)}
        </Link>
      </main>
    );
  }

  const content = lesson.content as {
    vocabulary?: { en: string; ar: string }[];
    toolbox_en?: string;
    toolbox_ar?: string;
    module_closing?: ModuleClosing;
  };
  const localized = lesson.translations[lang] || lesson.translations["en"] || {};
  const toolboxText = lang === "ar" ? content.toolbox_ar : content.toolbox_en;

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <Link href={`/courses/${lesson.course_id}`} className="text-sm text-ink-soft hover:text-navy mb-4 inline-block">
        ← {lesson.course_title}
      </Link>
      <h1 className="font-display font-black text-2xl text-navy mb-4">{localized.title || lesson.title}</h1>

      {lesson.video_url && <video controls src={lesson.video_url} className="w-full rounded-wow mb-6" />}

      {localized.body && <p className="text-ink leading-relaxed mb-6">{localized.body}</p>}

      {toolboxText && (
        <div className="bg-navy/5 rounded-lg p-4 mb-6">
          <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.toolboxTitle", lang)}</h2>
          <p className="text-sm text-ink">{toolboxText}</p>
        </div>
      )}

      {content.vocabulary && <VocabularyList vocabulary={content.vocabulary} />}

      {user && (
        <div className="mb-8">
          <LessonCompleteButton lessonId={lesson.id} completed={lesson.completed} />
        </div>
      )}

      {content.module_closing && <ModuleClosingCard closing={content.module_closing} />}

      {lesson.quizzes.length > 0 && (
        <div className="mt-4">
          <h2 className="font-display font-bold text-navy mb-3">{t("lms.quizzesForLesson", lang)}</h2>
          <div className="flex flex-col gap-2">
            {lesson.quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/courses/${lesson.course_id}/quizzes/${quiz.id}`}
                className="text-sm font-semibold text-navy hover:underline"
              >
                {quiz.title} — {t("lms.takeQuiz", lang)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
