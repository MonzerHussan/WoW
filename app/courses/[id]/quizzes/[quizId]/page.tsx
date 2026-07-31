import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { getQuizForTaking } from "@/features/lms/services/quiz.service";
import { QuizTaker } from "@/features/lms/components/QuizTaker";

export default async function QuizPage({ params }: { params: { id: string; quizId: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) {
    redirect(`/login?redirectedFrom=/courses/${params.id}/quizzes/${params.quizId}`);
  }

  const quiz = await getQuizForTaking(supabase, params.quizId, user.id);
  if (!quiz) {
    return (
      <main dir="rtl" className="min-h-screen px-5 py-10 max-w-2xl mx-auto text-center">
        <p className="text-ink-soft">{t("lms.lessonLocked", lang)}</p>
        <Link href={`/courses/${params.id}`} className="text-navy font-bold mt-4 inline-block">
          ← {t("lms.backToCourse", lang)}
        </Link>
      </main>
    );
  }

  // Only ever one direction, never a fabricated pair — a lesson quiz goes
  // back to its lesson, a standalone course exam back to the course.
  const backHref = quiz.lesson_id
    ? `/courses/${params.id}/lessons/${quiz.lesson_id}`
    : `/courses/${params.id}`;
  const backLabel = quiz.lesson_id ? t("lms.backToLesson", lang) : t("lms.backToCourse", lang);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-2xl mx-auto">
      <Link href={backHref} className="text-sm text-ink-soft hover:text-navy mb-4 inline-block">
        ← {backLabel}
      </Link>
      <h1 className="font-display font-black text-2xl text-navy mb-6">{quiz.title}</h1>
      <QuizTaker quiz={quiz} />
    </main>
  );
}
