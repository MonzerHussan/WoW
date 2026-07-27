import { NextResponse } from "next/server";

/**
 * RETIRED in migration 027. Returns 410 Gone.
 *
 * This route accepted any key from `REASON_POINTS` and paid it out with
 * no check that the underlying event had actually happened — it trusted
 * the *reason* even though Sprint 1 had already established that it must
 * never trust the *amount*. Nothing in the app ever called it (verified
 * before retiring it: zero client callers).
 *
 * Since 027, points can only be written by a security-definer function
 * that verifies one specific real event and refuses to pay twice for it:
 *   - award_lesson_points(lesson_id)  — checks the lesson_progress row
 *   - award_quiz_points(attempt_id)   — checks a real passed attempt
 * `profiles.points`/`level` are otherwise unwritable from any client
 * session, so this handler could not function even if it were kept.
 *
 * Deliberately an explicit 410 rather than a deletion: a silent 404 would
 * read as a routing mistake, and anything still pointing here should fail
 * loudly with a reason. The reasons that have no verified award path yet
 * (COURSE_COMPLETE, PMP_LEVEL_COMPLETE, FIRST_JOB_APPLICATION,
 * PROFILE_COMPLETED) each need their own event check before they can pay
 * out — see shared/constants/points.ts.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is retired. Points are awarded only by server-verified events (migration 027).",
    },
    { status: 410 }
  );
}
