import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getQuizForTaking } from "@/features/lms/services/quiz.service";
import { QuizPageContent } from "@/features/lms/components/QuizPageContent";

/**
 * Fixed a real RTL bug (navigation-restructuring batch, item 4): this
 * page used to hardcode `lang = "ar" as const` and `dir="rtl"`
 * unconditionally — the quiz question content itself is English-only in
 * the DB (no AR translation exists), so an English-reading visitor with
 * `dir="rtl"` saw their own question text forced right-aligned. Now
 * reads the real persisted language, same as every migrated page, and
 * QuizPageContent (the new client half) owns a working LangToggle this
 * page previously had none of at all.
 */
export default async function QuizPage({ params }: { params: { id: string; quizId: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) {
    redirect(`/login?redirectedFrom=/courses/${params.id}/quizzes/${params.quizId}`);
  }

  const quiz = await getQuizForTaking(supabase, params.quizId, user.id);

  // Only ever one direction, never a fabricated pair — a lesson quiz goes
  // back to its lesson, a standalone course exam back to the course.
  const backHref = quiz?.lesson_id
    ? `/courses/${params.id}/lessons/${quiz.lesson_id}`
    : `/courses/${params.id}`;

  return <QuizPageContent quiz={quiz} backHref={backHref} initialLang={initialLang} />;
}
