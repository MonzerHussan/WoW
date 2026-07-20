import { SupabaseClient } from "@supabase/supabase-js";
import { REASON_POINTS, PointsReason } from "@/shared/constants/points";
import { auditLog } from "@/shared/lib/logger";

/**
 * Server-side only. Awards points to a user for a known, server-verified
 * reason, recalculates their level, and unlocks any badges whose
 * points_value threshold has been crossed.
 *
 * Level formula: level = floor(points / 100) + 1  (tune as needed)
 *
 * Unchanged in behavior from the original lib/points.ts — only relocated
 * and switched to read amounts from the shared REASON_POINTS map instead
 * of a caller-supplied number, per the Sprint 1 security fix.
 */
export async function awardPoints(supabase: SupabaseClient, userId: string, reason: PointsReason) {
  const amount = REASON_POINTS[reason];

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("points, level")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message || "Profile not found");
  }

  const newPoints = profile.points + amount;
  const newLevel = Math.floor(newPoints / 100) + 1;
  const leveledUp = newLevel > profile.level;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ points: newPoints, level: newLevel })
    .eq("id", userId);

  if (updateError) throw new Error(updateError.message);

  const { data: eligibleBadges } = await supabase
    .from("badges")
    .select("id, name, points_value")
    .lte("points_value", newPoints)
    .gt("points_value", profile.points);

  const newlyEarned: { id: string; name: string }[] = [];

  if (eligibleBadges && eligibleBadges.length > 0) {
    for (const badge of eligibleBadges) {
      const { data: existing } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId)
        .eq("badge_id", badge.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
        newlyEarned.push({ id: badge.id, name: badge.name });
      }
    }
  }

  auditLog("points_awarded", { userId, reason, amount, newPoints, newLevel, leveledUp });

  return { points: newPoints, level: newLevel, leveledUp, newBadges: newlyEarned, reason };
}
