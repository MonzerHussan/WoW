import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { quizSubmitSchema } from "@/shared/schemas/lms.schema";
import { awardPoints } from "@/shared/services/points.service";
import { recordQuizPassSkills, recomputeEmployabilityScore } from "@/features/lms/services/dna.service";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/lms/quizzes/submit
 * Body: { quizId: string, answers: { [questionId]: number } }
 *
 * Every question in this schema is multiple-choice (question.correct_index)
 * — there is no open-ended question type — so the score is always
 * auto-computed here, for every assessment_mode. What differs by mode is
 * whether `passed` is final immediately:
 *   auto   -> passed is final now; award points + DNA effects here.
 *   human/hybrid -> passed stays null pending assessor confirmation
 *                   (app/api/lms/quizzes/grade/route.ts); no points/DNA
 *                   effects until then.
 * One attempt per quiz per user (enforced here, not by a DB constraint) —
 * prevents re-submitting an auto-graded quiz to farm points.
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = quizSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { quizId, answers } = parsed.data;

  // RLS ("Quizzes: enrolled read") already restricts this to quizzes the
  // caller is enrolled in — a null result means not accessible.
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, assessment_mode, passing_score, quiz_questions(id, question, points)")
    .eq("id", quizId)
    .maybeSingle();

  if (quizError) {
    logger.error("quiz_submit_lookup_failed", { userId: user.id, quizId, error: quizError.message });
    return NextResponse.json({ error: "Failed to load quiz" }, { status: 500 });
  }
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found or not accessible" }, { status: 403 });
  }

  const { data: existingAttempt } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingAttempt) {
    return NextResponse.json({ error: "Already attempted" }, { status: 409 });
  }

  const questions = (quiz.quiz_questions as any[]) || [];
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0) || 1;
  const earnedPoints = questions.reduce((sum, q) => {
    const correctIndex = q.question?.correct_index;
    return answers[q.id] === correctIndex ? sum + (q.points || 1) : sum;
  }, 0);
  const score = Math.round((earnedPoints / totalPoints) * 10000) / 100;
  const autoPassed = score >= quiz.passing_score;
  const isAuto = quiz.assessment_mode === "auto";

  const { data: attempt, error: insertError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      answers,
      score,
      passed: isAuto ? autoPassed : null,
    })
    .select("id")
    .single();

  if (insertError || !attempt) {
    logger.error("quiz_submit_insert_failed", { userId: user.id, quizId, error: insertError?.message });
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }

  if (!isAuto) {
    logger.info("quiz_submitted_pending_review", { userId: user.id, quizId, attemptId: attempt.id });
    return NextResponse.json({ pendingReview: true, score });
  }

  logger.info("quiz_submitted_auto", { userId: user.id, quizId, attemptId: attempt.id, passed: autoPassed });

  if (!autoPassed) {
    return NextResponse.json({ pendingReview: false, passed: false, score });
  }

  try {
    await awardPoints(supabase, user.id, "QUIZ_COMPLETE");
    await recordQuizPassSkills(supabase, user.id, quizId, attempt.id, score, { type: "system", id: null });
    await recomputeEmployabilityScore(supabase, user.id);
  } catch (err) {
    logger.error("quiz_pass_dna_effects_failed", { userId: user.id, quizId, error: String(err) });
  }

  return NextResponse.json({ pendingReview: false, passed: true, score });
}
