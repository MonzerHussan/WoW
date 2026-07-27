import { SupabaseClient } from "@supabase/supabase-js";
import { auditLog } from "@/shared/lib/logger";

/**
 * Points are awarded ONLY through the verified security-definer functions
 * added in 027 (`award_lesson_points`, `award_quiz_points`). Since that
 * migration, `profiles.points` and `profiles.level` cannot be written from
 * a client session at all — a direct PATCH is refused with 42501.
 *
 * What changed and why: this module used to compute the new total in
 * TypeScript and `UPDATE profiles` through the caller's own session. That
 * worked, but it left the same write path open to anyone with a session
 * and a REST client — verified live, `{"points":999999,"level":99}`
 * succeeded. The amount now lives in SQL next to the event check, so a
 * caller cannot choose the reason, the amount, or the recipient.
 *
 * Badges are deliberately still awarded from here: `user_badges` has its
 * own "owner inserts own" policy (013) and no privileged column is
 * involved, so there is nothing to escalate.
 */

export interface PointsOutcome {
  /** False when the event was already paid out, or never happened. */
  awarded: boolean;
  points: number;
  level: number;
  newBadges: { id: string; name: string }[];
}

/**
 * LESSON_COMPLETE payout for a lesson this user genuinely completed. The
 * function verifies the `lesson_progress` row itself and refuses a second
 * payout for the same lesson, so calling it twice is safe — the second
 * call just returns false.
 */
export async function awardLessonPoints(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<PointsOutcome> {
  const { data, error } = await supabase.rpc("award_lesson_points", { p_lesson_id: lessonId });
  if (error) throw new Error(error.message);
  return finish(supabase, userId, data === true, "LESSON_COMPLETE");
}

/**
 * QUIZ_COMPLETE payout for a passed attempt. Used by BOTH quiz paths —
 * the auto-graded one (the student's own pass) and the assessor-confirmed
 * one — because 027 extended the single 013 function to accept either
 * rather than forking it. `quiz_attempts.points_awarded` keeps it to one
 * payout no matter which branch fires.
 */
export async function awardQuizPoints(
  supabase: SupabaseClient,
  userId: string,
  attemptId: string
): Promise<PointsOutcome> {
  const { data, error } = await supabase.rpc("award_quiz_points", { p_attempt_id: attemptId });
  if (error) throw new Error(error.message);
  return finish(supabase, userId, data === true, "QUIZ_COMPLETE");
}

/**
 * Reads back the authoritative total the function just wrote and unlocks
 * any badge whose threshold it crossed.
 *
 * Badge selection is now "every unearned badge at or below the current
 * total" rather than the old before/after delta window. Simpler and
 * strictly more correct: it self-heals if a badge was ever missed, and it
 * does not depend on knowing the previous balance — which this module no
 * longer computes.
 */
async function finish(
  supabase: SupabaseClient,
  userId: string,
  awarded: boolean,
  reason: string
): Promise<PointsOutcome> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("points, level")
    .eq("id", userId)
    .single();

  if (error || !profile) throw new Error(error?.message || "Profile not found");

  const newBadges = awarded ? await syncBadges(supabase, userId, profile.points) : [];

  auditLog("points_awarded", {
    userId,
    reason,
    awarded,
    points: profile.points,
    level: profile.level,
    newBadges: newBadges.length,
  });

  return { awarded, points: profile.points, level: profile.level, newBadges };
}

async function syncBadges(supabase: SupabaseClient, userId: string, points: number) {
  const { data: eligible } = await supabase
    .from("badges")
    .select("id, name, points_value")
    .lte("points_value", points);

  if (!eligible?.length) return [];

  const { data: held } = await supabase.from("user_badges").select("badge_id").eq("user_id", userId);
  const heldIds = new Set((held || []).map((b: any) => b.badge_id));

  const earned: { id: string; name: string }[] = [];
  for (const badge of eligible) {
    if (heldIds.has(badge.id)) continue;
    const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
    if (!error) earned.push({ id: badge.id, name: badge.name });
  }
  return earned;
}
