"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { QuizForTaking } from "@/features/lms/services/quiz.service";
import { QuizTaker } from "@/features/lms/components/QuizTaker";

/**
 * Owns the real useLang()/LangToggle this page previously had none of
 * at all (RTL bug fix, navigation-restructuring batch item 4) — dir now
 * genuinely reflects the persisted/toggled language instead of a
 * hardcoded "rtl".
 */
export function QuizPageContent({
  quiz,
  backHref,
  initialLang,
}: {
  quiz: QuizForTaking | null;
  backHref: string;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  if (!quiz) {
    return (
      <main dir={dir} className="min-h-screen px-5 py-10 max-w-2xl mx-auto text-center">
        <div className="flex justify-end mb-4">
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <p className="text-ink-soft">{t("lms.lessonLocked")}</p>
        <Link href={backHref} className="text-navy font-bold mt-4 inline-block">
          ← {t("lms.backToCourse")}
        </Link>
      </main>
    );
  }

  const backLabel = quiz.lesson_id ? t("lms.backToLesson") : t("lms.backToCourse");

  return (
    <main dir={dir} className="min-h-screen px-5 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href={backHref} className="text-sm text-ink-soft hover:text-navy inline-block">
          ← {backLabel}
        </Link>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy mb-6">{quiz.title}</h1>
      <QuizTaker quiz={quiz} lang={lang} />
    </main>
  );
}
