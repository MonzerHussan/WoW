"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { t, TranslationKey } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { SpeakButton } from "@/shared/components/SpeakButton";
import { LessonCompleteButton } from "@/features/lms/components/LessonCompleteButton";
import { LanguageTaskCard } from "@/features/lms/components/LanguageTaskCard";
import { LessonDetail } from "@/features/lms/services/lesson.service";

type Translate = (key: TranslationKey) => string;

interface ModuleClosing {
  optional_language_task?: string;
  coin_cost?: number;
  career_dna_skills?: string;
  series_episode?: string;
  listening_suggestion?: string;
  capstone_task?: string;
}

function VocabularyList({ vocabulary, t }: { vocabulary: { en: string; ar: string }[]; t: Translate }) {
  if (!vocabulary?.length) return null;
  return (
    <div className="bg-bg rounded-lg p-4 mb-6">
      <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.vocabularyTitle")}</h2>
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

interface GrammarPoint {
  title_en: string;
  title_ar: string;
  explanation_ar: string;
  examples?: { en: string; ar: string }[];
}

function GrammarPointCard({ point, lang }: { point: GrammarPoint; lang: Lang }) {
  if (!point) return null;
  const title = lang === "en" ? point.title_en : point.title_ar;
  return (
    <div className="bg-orange/5 rounded-lg p-4 mb-6">
      <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.grammarPointTitle", lang)}</h2>
      <p className="font-bold text-ink mb-2">{title}</p>
      {/* explanation_ar is always Arabic regardless of lang — deliberate, not a bug. */}
      <p className="text-sm text-ink leading-relaxed mb-3">{point.explanation_ar}</p>
      <div className="flex flex-col gap-2">
        {point.examples?.map((ex, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm border-b border-line/40 py-1">
            <span className="text-ink-soft">{ex.ar}</span>
            <span className="flex items-center gap-2 font-semibold text-ink">
              {ex.en}
              <SpeakButton text={ex.en} lang="en-US" label={t("lms.pronounceWord", lang)} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleClosingCard({ closing, t }: { closing: ModuleClosing; t: Translate }) {
  // optional_language_task/coin_cost render interactively via
  // LanguageTaskCard instead of as a passive row here.
  const rows: [string, string | number | undefined][] = [
    [t("lms.dnaSkillsNote"), closing.career_dna_skills],
    [t("lms.seriesEpisode"), closing.series_episode],
    [t("lms.listeningSuggestion"), closing.listening_suggestion],
    [t("lms.capstoneTask"), closing.capstone_task],
  ].filter(([, value]) => value !== undefined && value !== "") as [string, string | number][];

  if (rows.length === 0) return null;

  return (
    <div className="border border-line rounded-wow p-5 mb-8">
      <h2 className="font-display font-bold text-navy text-sm mb-3">{t("lms.moduleClosingTitle")}</h2>
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

/**
 * Reflects the user's actual toggle choice for THIS page only — like
 * every other useLang()+LangToggle usage in this codebase (onboarding,
 * auth forms, instructor forms), it's local component state, not a
 * persisted cross-page preference (no such mechanism exists anywhere
 * in the app yet). The bug this fixes is narrower and real: the page
 * used to hardcode "ar" with no toggle at all, so lessons.translations.en
 * and toolbox_en were completely unreachable even though the data exists.
 */
export function LessonView({
  lesson,
  hasUser,
  walletBalance,
  languageTaskSubmitted,
}: {
  lesson: LessonDetail;
  hasUser: boolean;
  walletBalance: number;
  languageTaskSubmitted: boolean;
}) {
  const { lang, setLang, dir, t } = useLang("ar");

  const content = lesson.content as {
    vocabulary?: { en: string; ar: string }[];
    toolbox_en?: string;
    toolbox_ar?: string;
    module_closing?: ModuleClosing;
    grammar_point?: GrammarPoint;
  };
  const localized = lesson.translations[lang] || lesson.translations["en"] || {};
  const toolboxText = lang === "ar" ? content.toolbox_ar : content.toolbox_en;

  return (
    <main dir={dir} className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/courses/${lesson.course_id}`} className="text-sm text-ink-soft hover:text-navy inline-block">
          ← {lesson.course_title}
        </Link>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-display font-black text-2xl text-navy">{localized.title || lesson.title}</h1>
        <SpeakButton text={lesson.title} lang="en-US" label={t("lms.listen")} />
      </div>

      {lesson.video_url && <video controls src={lesson.video_url} className="w-full rounded-wow mb-6" />}

      {localized.body && (
        <div className="mb-6">
          <p className="text-ink leading-relaxed">{localized.body}</p>
          {lang === "en" && (
            <div className="mt-2">
              <SpeakButton text={localized.body} lang="en-US" label={t("lms.listen")} />
            </div>
          )}
        </div>
      )}

      {toolboxText && (
        <div className="bg-navy/5 rounded-lg p-4 mb-6">
          <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.toolboxTitle")}</h2>
          <p className="text-sm text-ink">{toolboxText}</p>
        </div>
      )}

      {content.grammar_point && <GrammarPointCard point={content.grammar_point} lang={lang} />}

      {content.vocabulary && <VocabularyList vocabulary={content.vocabulary} t={t} />}

      {hasUser && (
        <div className="mb-8">
          <LessonCompleteButton lessonId={lesson.id} completed={lesson.completed} lang={lang} />
        </div>
      )}

      {hasUser && content.module_closing?.optional_language_task && typeof content.module_closing.coin_cost === "number" && (
        <div className="border border-line rounded-wow p-5 mb-8">
          <h2 className="font-display font-bold text-navy text-sm mb-3">{t("lms.languageTask")}</h2>
          <LanguageTaskCard
            lessonId={lesson.id}
            taskText={content.module_closing.optional_language_task}
            coinCost={content.module_closing.coin_cost}
            initialBalance={walletBalance}
            initialSubmitted={languageTaskSubmitted}
            lang={lang}
          />
        </div>
      )}

      {content.module_closing && <ModuleClosingCard closing={content.module_closing} t={t} />}

      {lesson.quizzes.length > 0 && (
        <div className="mt-4">
          <h2 className="font-display font-bold text-navy mb-3">{t("lms.quizzesForLesson")}</h2>
          <div className="flex flex-col gap-2">
            {lesson.quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/courses/${lesson.course_id}/quizzes/${quiz.id}`}
                className="text-sm font-semibold text-navy hover:underline"
              >
                {quiz.title} — {t("lms.takeQuiz")}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
