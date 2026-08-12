"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { t, TranslationKey } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { SpeakButton } from "@/shared/components/SpeakButton";
import { LessonCompleteButton } from "@/features/lms/components/LessonCompleteButton";
import { LanguageTaskCard } from "@/features/lms/components/LanguageTaskCard";
import { PronunciationPractice } from "@/features/lms/components/PronunciationPractice";
import { EntityDecisionCard, EntityDecisionScenario } from "@/features/lms/components/EntityDecisionCard";
import { LessonDetail, resolveLanguageTask } from "@/features/lms/services/lesson.service";

type Translate = (key: TranslationKey) => string;

interface ModuleClosing {
  optional_language_task?: string;
  coin_cost?: number;
  career_dna_skills?: string;
  series_episode?: string;
  listening_suggestion?: string;
  capstone_task?: string;
}

function VocabularyList({
  vocabulary,
  t,
  lessonId,
  lang,
  pronunciationCost,
}: {
  vocabulary: { en: string; ar: string }[];
  t: Translate;
  lessonId: string;
  lang: Lang;
  pronunciationCost: number | null;
}) {
  if (!vocabulary?.length) return null;
  return (
    <div className="bg-bg rounded-lg p-4 mb-6">
      <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.vocabularyTitle")}</h2>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {vocabulary.map((v, i) => (
          <div key={i} className="flex justify-between items-start gap-2 border-b border-line/60 py-1">
            <span className="font-semibold text-ink">{v.ar}</span>
            {/* Always available, in either page language — the whole point
                is hearing the English word, not reading the UI in English. */}
            <span className="flex flex-col items-start gap-1 text-ink-soft">
              <span className="flex items-center gap-2">
                {v.en}
                <SpeakButton text={v.en} lang="en-US" label={t("lms.pronounceWord")} />
              </span>
              <PronunciationPractice lessonId={lessonId} referenceText={v.en} lang={lang} coinCost={pronunciationCost} />
            </span>
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

function GrammarPointCard({
  point,
  lang,
  lessonId,
  pronunciationCost,
}: {
  point: GrammarPoint;
  lang: Lang;
  lessonId: string;
  pronunciationCost: number | null;
}) {
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
          <div key={i} className="flex items-start justify-between gap-2 text-sm border-b border-line/40 py-1">
            <span className="text-ink-soft">{ex.ar}</span>
            <span className="flex flex-col items-start gap-1 font-semibold text-ink">
              <span className="flex items-center gap-2">
                {ex.en}
                <SpeakButton text={ex.en} lang="en-US" label={t("lms.pronounceWord", lang)} />
              </span>
              <PronunciationPractice lessonId={lessonId} referenceText={ex.en} lang={lang} coinCost={pronunciationCost} />
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
 * The AR/EN choice here now persists across pages and reloads — see
 * `useLang`, which stores it in localStorage. (This comment previously
 * said no such mechanism existed; it does now.) The original bug this
 * view fixed remains worth remembering: the page used to hardcode "ar"
 * with no toggle at all, so `lessons.translations.en` and `toolbox_en`
 * were unreachable even though the data was always there.
 */
export function LessonView({
  lesson,
  hasUser,
  walletBalance,
  languageTaskSubmitted,
  languageTaskCost,
  pronunciationCost,
  initialLang = "ar",
}: {
  lesson: LessonDetail;
  hasUser: boolean;
  walletBalance: number;
  languageTaskSubmitted: boolean;
  /** From pricing_units (024), resolved server-side. Null means the price couldn't be read. */
  languageTaskCost: number | null;
  pronunciationCost: number | null;
  /** Server-read cookie (035) — eliminates the flash-then-correct this
   *  page used to have as the only one of the five migrated pages still
   *  defaulting blind to "ar". Optional/defaulted so nothing else that
   *  renders LessonView without it breaks. */
  initialLang?: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  const content = lesson.content as {
    vocabulary?: { en: string; ar: string }[];
    toolbox_en?: string;
    toolbox_ar?: string;
    module_closing?: ModuleClosing;
    grammar_point?: GrammarPoint;
    entity_decisions?: EntityDecisionScenario[];
  };
  const localized = lesson.translations[lang] || lesson.translations["en"] || {};
  const toolboxText = lang === "ar" ? content.toolbox_ar : content.toolbox_en;
  // content.language_task (023, any lesson) or the original
  // module_closing.optional_language_task (009, the 6 module endings).
  const languageTask = resolveLanguageTask(lesson.content);

  return (
    <main dir={dir} className="min-h-screen px-5 pb-10 max-w-3xl mx-auto">
      {/* Sticky so the language toggle stays reachable while reading a long
          lesson — bg-bg matches the body so scrolled content can't show
          through it. */}
      <div className="sticky top-0 z-10 bg-bg flex items-center justify-between py-4 mb-2 -mx-5 px-5">
        <Link href={`/courses/${lesson.course_id}`} className="text-sm text-ink-soft hover:text-navy inline-block">
          ← {lesson.course_title}
        </Link>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-display font-black text-2xl text-navy">{localized.title || lesson.title}</h1>
        {/* Only in EN mode, where `localized` IS the English translation —
            speaking the Arabic title with an en-US voice would be nonsense. */}
        {lang === "en" && localized.title && (
          <SpeakButton text={localized.title} lang="en-US" label={t("lms.listen")} />
        )}
      </div>

      {lesson.video_url && <video controls src={lesson.video_url} className="w-full rounded-wow mb-6" />}

      {localized.body && (
        <div className="mb-6">
          <p className="text-ink leading-relaxed">{localized.body}</p>
          {lang === "en" && (
            <div className="mt-2 flex flex-col gap-1">
              <SpeakButton text={localized.body} lang="en-US" label={t("lms.listen")} />
              <PronunciationPractice
                lessonId={lesson.id}
                referenceText={localized.body}
                lang={lang}
                coinCost={pronunciationCost}
              />
            </div>
          )}
        </div>
      )}

      {/* Stated once per page rather than repeated under every widget:
          what the paid evaluation actually measures, and that no audio
          is stored. Required transparency, not decoration. */}
      <p className="text-xs text-ink-soft bg-bg rounded-lg p-3 mb-6 leading-relaxed">
        🎤 {t("lms.pronunciationDisclaimer")} {t("lms.recordingNotStored")}
      </p>

      {toolboxText && (
        <div className="bg-navy/5 rounded-lg p-4 mb-6">
          <h2 className="font-display font-bold text-navy text-sm mb-2">{t("lms.toolboxTitle")}</h2>
          <p className="text-sm text-ink">{toolboxText}</p>
        </div>
      )}

      {content.grammar_point && (
        <GrammarPointCard
          point={content.grammar_point}
          lang={lang}
          lessonId={lesson.id}
          pronunciationCost={pronunciationCost}
        />
      )}

      {content.vocabulary && (
        <VocabularyList
          vocabulary={content.vocabulary}
          t={t}
          lessonId={lesson.id}
          lang={lang}
          pronunciationCost={pronunciationCost}
        />
      )}

      {hasUser &&
        content.entity_decisions?.map((scenario) => (
          <EntityDecisionCard key={scenario.scenario_key} lessonId={lesson.id} scenario={scenario} lang={lang} />
        ))}

      {hasUser && (
        <div className="mb-8">
          <LessonCompleteButton lessonId={lesson.id} completed={lesson.completed} lang={lang} />
        </div>
      )}

      {/* No price, no card: showing a submit button whose cost we can't
          state would ask the user to spend an unknown amount. The route
          refuses the same case with a 503. */}
      {hasUser && languageTask && languageTaskCost !== null && (
        <div className="border border-line rounded-wow p-5 mb-8">
          <h2 className="font-display font-bold text-navy text-sm mb-3">{t("lms.languageTask")}</h2>
          <LanguageTaskCard
            lessonId={lesson.id}
            taskText={languageTask.taskText}
            coinCost={languageTaskCost}
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

      {(lesson.prevLesson || lesson.nextLesson) && (
        <nav className="flex items-center justify-between gap-3 mt-10 pt-5 border-t border-line">
          {/* Unavailable direction is omitted entirely, not rendered disabled. */}
          {lesson.prevLesson ? (
            <Link
              href={`/courses/${lesson.course_id}/lessons/${lesson.prevLesson.id}`}
              className="flex-1 rounded-xl border border-line px-4 py-3 hover:border-navy/40 transition"
            >
              <span className="block text-xs text-ink-soft mb-0.5">{t("lms.prevLesson")}</span>
              <span className="block text-sm font-semibold text-navy">{lesson.prevLesson.title}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {lesson.nextLesson && (
            <Link
              href={`/courses/${lesson.course_id}/lessons/${lesson.nextLesson.id}`}
              className="flex-1 rounded-xl border border-line px-4 py-3 hover:border-navy/40 transition text-end"
            >
              <span className="block text-xs text-ink-soft mb-0.5">{t("lms.nextLesson")}</span>
              <span className="block text-sm font-semibold text-navy">{lesson.nextLesson.title}</span>
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
