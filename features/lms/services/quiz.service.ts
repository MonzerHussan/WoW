import { SupabaseClient } from "@supabase/supabase-js";

export interface QuizQuestionForTaking {
  id: string;
  text: string;
  options: string[];
  points: number;
  order_index: number;
}

export interface QuizForTaking {
  id: string;
  title: string;
  assessment_mode: "auto" | "human" | "hybrid";
  passing_score: number;
  pmp_level: number | null;
  /** Set for lesson quizzes, null for standalone course exams — see the
   *  `num_nonnulls(course_id, lesson_id) = 1` check on `quizzes` (004). */
  lesson_id: string | null;
  questions: QuizQuestionForTaking[];
  alreadyAttempted: boolean;
}

/**
 * Server-side only (uses supabaseServer — never exposed to a client
 * component). Still strips `question.correct_index` defensively, but as
 * of migration 028 there is nothing left to strip: the key was moved out
 * to `quiz_answer_keys` (RLS on, zero policies) and physically removed
 * from the `question` jsonb, so no query — through this service or
 * straight to PostgREST — returns it any more. The strip stays as a
 * belt-and-braces guard in case a future seed reintroduces the field.
 */
export async function getQuizForTaking(
  supabase: SupabaseClient,
  quizId: string,
  userId: string
): Promise<QuizForTaking | null> {
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select(
      "id, title, assessment_mode, passing_score, pmp_level, lesson_id, quiz_questions(id, question, points, order_index)"
    )
    .eq("id", quizId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!quiz) return null;

  const { data: existingAttempt } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();

  const questions: QuizQuestionForTaking[] = ((quiz.quiz_questions as any[]) || [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => ({
      id: q.id,
      text: q.question?.text || "",
      options: q.question?.options || [],
      points: q.points,
      order_index: q.order_index,
    }));

  return {
    id: quiz.id,
    title: quiz.title,
    assessment_mode: quiz.assessment_mode,
    passing_score: quiz.passing_score,
    pmp_level: quiz.pmp_level,
    lesson_id: quiz.lesson_id,
    questions,
    alreadyAttempted: !!existingAttempt,
  };
}

export interface PendingAttempt {
  id: string;
  quiz_id: string;
  quiz_title: string;
  user_id: string;
  user_name: string;
  score: number | null;
  submitted_at: string;
  review_deadline: string | null;
}

export interface QuizHistoryRow {
  id: string;
  quizTitle: string;
  score: number | null;
  passed: boolean | null;
  submittedAt: string;
  gradedAt: string | null;
  pendingReview: boolean;
}

/** Owner's own quiz history for the Assessments screen — RLS-scoped to
 *  the caller already ("Attempts: owner reads own" or equivalent), so
 *  no explicit .eq(user_id) filter is needed to stay correctly scoped,
 *  but it's included anyway for an explicit, self-documenting query. */
export async function getMyQuizHistory(supabase: SupabaseClient, userId: string): Promise<QuizHistoryRow[]> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, score, passed, submitted_at, graded_at, graded_by, quizzes(title)")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((a: any) => ({
    id: a.id,
    quizTitle: a.quizzes?.title || "",
    score: a.score,
    passed: a.passed,
    submittedAt: a.submitted_at,
    gradedAt: a.graded_at,
    pendingReview: a.graded_by === null && a.passed === null,
  }));
}

/** Assessor queue: attempts awaiting human confirmation (human/hybrid, not yet graded). */
export async function getPendingAttempts(supabase: SupabaseClient): Promise<PendingAttempt[]> {
  // quiz_attempts has two FKs into profiles (user_id and graded_by), so the
  // embed target must be disambiguated with `!user_id` — plain
  // `profiles(...)` is ambiguous and PostgREST rejects it outright.
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, user_id, score, submitted_at, review_deadline, quizzes(title, assessment_mode), profiles!user_id(full_name)")
    .is("graded_by", null)
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || [])
    .filter((a: any) => a.quizzes?.assessment_mode !== "auto")
    .map((a: any) => ({
      id: a.id,
      quiz_id: a.quiz_id,
      quiz_title: a.quizzes?.title || "",
      user_id: a.user_id,
      user_name: a.profiles?.full_name || "",
      score: a.score,
      submitted_at: a.submitted_at,
      review_deadline: a.review_deadline,
    }));
}
