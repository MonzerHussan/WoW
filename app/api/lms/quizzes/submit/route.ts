import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { quizSubmitSchema } from "@/shared/schemas/lms.schema";
import { awardQuizPoints } from "@/shared/services/points.service";
import { recordQuizPassSkills, recomputeEmployabilityScore } from "@/features/lms/services/dna.service";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/lms/quizzes/submit
 * Body: { quizId: string, answers: { [questionId]: number } }
 *
 * Every question is multiple-choice, so the score is always computed
 * server-side for every assessment_mode. What differs by mode is whether
 * `passed` is final immediately:
 *   auto         -> passed is final now; award points + DNA effects here.
 *   human/hybrid -> passed stays null pending assessor confirmation
 *                   (app/api/lms/quizzes/grade/route.ts); no points/DNA
 *                   effects until then.
 *
 * SCORING MOVED INTO THE DATABASE (migration 028). This route used to
 * fetch each question's `correct_index` and compare in TypeScript, which
 * meant the answer key had to be readable by the caller's own session —
 * and it was, to anyone who skipped this route and queried PostgREST
 * directly. The key now lives in `quiz_answer_keys` (RLS on, zero
 * policies) and `submit_quiz_attempt()` does the comparison inside the
 * database, returning only an aggregate score. This route never sees a
 * correct answer, and neither can anything else outside that function.
 *
 * Enrollment and the one-attempt-per-quiz rule also moved into the
 * function, where they are checked in the same transaction as the insert
 * rather than as a separate round-trip.
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

  // One call: entitlement, the one-attempt rule, scoring against the
  // isolated answer key, and the insert — all inside the transaction.
  const { data: result, error: rpcError } = await supabase.rpc("submit_quiz_attempt", {
    p_quiz_id: quizId,
    p_answers: answers,
  });

  if (rpcError) {
    // 42501 = not authenticated / not enrolled, 42704 = no such quiz.
    if (rpcError.code === "42501" || rpcError.code === "42704") {
      return NextResponse.json({ error: "Quiz not found or not accessible" }, { status: 403 });
    }
    logger.error("quiz_submit_failed", { userId: user.id, quizId, error: rpcError.message });
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }

  const outcome = result as {
    already_attempted: boolean;
    attempt_id?: string;
    score?: number;
    pending_review?: boolean;
    passed?: boolean | null;
  };

  if (outcome.already_attempted) {
    return NextResponse.json({ error: "Already attempted" }, { status: 409 });
  }

  const score = outcome.score ?? 0;
  const isAuto = !outcome.pending_review;
  const autoPassed = outcome.passed === true;
  const attemptId = outcome.attempt_id!;

  if (!isAuto) {
    logger.info("quiz_submitted_pending_review", { userId: user.id, quizId, attemptId });
    return NextResponse.json({ pendingReview: true, score });
  }

  logger.info("quiz_submitted_auto", { userId: user.id, quizId, attemptId, passed: autoPassed });

  if (!autoPassed) {
    return NextResponse.json({ pendingReview: false, passed: false, score });
  }

  try {
    // 027: the auto-graded path now claims its points through the same
    // award_quiz_points() function the assessor path uses — it accepts
    // this branch only when the attempt is the caller's own, passed, on
    // an assessment_mode='auto' quiz, and not already paid out.
    await awardQuizPoints(supabase, user.id, attemptId);
    await recordQuizPassSkills(supabase, user.id, quizId, attemptId, score, { type: "system", id: null });
    await recomputeEmployabilityScore(supabase, user.id);
  } catch (err) {
    logger.error("quiz_pass_dna_effects_failed", { userId: user.id, quizId, error: String(err) });
  }

  return NextResponse.json({ pendingReview: false, passed: true, score });
}
