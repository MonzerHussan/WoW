import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { gradeAttemptSchema } from "@/shared/schemas/lms.schema";
import { recordQuizPassSkills } from "@/features/lms/services/dna.service";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/lms/quizzes/grade
 * Body: { attemptId: string, approve: boolean, note?: string }
 *
 * Assessor-only (checked via user_capabilities below — mirrors the RLS
 * policy "Attempts: assessors read pending"). Confirms or overrides the
 * auto-computed score/pass on a human/hybrid attempt. There is no
 * open-ended question type in the schema (multiple-choice only), so the
 * assessor is confirming the computed result, not entering a free score —
 * `approve: false` means "reject the auto result", not "grade manually".
 * Only on approval do points and the LMS→DNA quiz-pass effects fire.
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: capability } = await supabase
    .from("user_capabilities")
    .select("capability")
    .eq("user_id", user.id)
    .eq("capability", "assessor")
    .maybeSingle();
  if (!capability) {
    return NextResponse.json({ error: "Assessor capability required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = gradeAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { attemptId, approve } = parsed.data;

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, user_id, score, graded_by, quizzes(passing_score)")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.graded_by) {
    return NextResponse.json({ error: "Already graded" }, { status: 409 });
  }

  const passingScore = (attempt.quizzes as any)?.passing_score ?? 100;
  const metPassingScore = (attempt.score ?? 0) >= passingScore;
  const finalPassed = approve && metPassingScore;

  const { error: updateError } = await supabase
    .from("quiz_attempts")
    .update({ passed: finalPassed, graded_by: user.id, graded_at: new Date().toISOString() })
    .eq("id", attemptId);

  if (updateError) {
    logger.error("quiz_grade_update_failed", { assessorId: user.id, attemptId, error: updateError.message });
    return NextResponse.json({ error: "Failed to save grading" }, { status: 500 });
  }

  logger.info("quiz_graded", { assessorId: user.id, attemptId, passed: finalPassed });

  if (finalPassed) {
    try {
      // Points go through a security-definer RPC (migration 013), not a
      // direct profiles UPDATE — an assessor's session has no RLS grant
      // to write another user's profile, and deliberately never will
      // (that's the same client-trusted-points hole CLAUDE.md rule #4
      // already fixed once). The function itself re-verifies this exact
      // attempt is real, passed, and graded by the caller before paying
      // out, and guards against being replayed for the same attempt.
      const { data: paid, error: pointsError } = await supabase.rpc("award_quiz_points", {
        p_attempt_id: attemptId,
      });
      if (pointsError || !paid) {
        logger.error("quiz_grade_points_failed", { attemptId, error: pointsError?.message, paid });
      }

      await recordQuizPassSkills(supabase, attempt.user_id, attempt.quiz_id, attempt.id, attempt.score || 0, {
        type: "assessor",
        id: user.id,
      });

      // Employability recompute on assessor-confirmed passes is
      // deliberately deferred (owner decision) — career_scores currently
      // only has an owner-insert policy (013), which doesn't cover this
      // path (auth.uid() here is the assessor, not the student). Revisit
      // with a similarly-scoped safe function when this is prioritized.
    } catch (err) {
      logger.error("quiz_grade_dna_effects_failed", { attemptId, error: String(err) });
    }
  }

  return NextResponse.json({ passed: finalPassed });
}
