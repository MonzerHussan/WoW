import { SupabaseClient } from "@supabase/supabase-js";

export interface MyInstructorLink {
  assignmentId: string;
  instructorId: string;
  instructorName: string;
  status: "pending" | "accepted" | "declined";
  initiatedBy: "instructor" | "learner";
  priceCoins: number;
  isAvailable: boolean;
  createdAt: string;
}

/**
 * Read-only for this pass (040): the instructors a learner is already
 * linked to, either direction. The request/accept flow itself is not
 * built yet — awaiting confirmation of the delivery mechanism proposed
 * alongside migration 040.
 */
export async function getMyInstructorLinks(supabase: SupabaseClient, learnerId: string): Promise<MyInstructorLink[]> {
  const { data, error } = await supabase
    .from("instructor_assignments")
    .select("id, instructor_id, status, initiated_by, price_coins, created_at")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const assignments = data || [];
  if (assignments.length === 0) return [];

  // instructor_profiles carries its own display_name (profiles' own
  // SELECT is owner-only, so a cross-table embed from a learner's
  // session would silently return null — see migration 040's comment).
  const instructorIds = [...new Set(assignments.map((a: any) => a.instructor_id))];
  const { data: instructorRows } = await supabase
    .from("instructor_profiles")
    .select("user_id, display_name, is_available")
    .in("user_id", instructorIds);
  const byInstructor = new Map((instructorRows || []).map((r: any) => [r.user_id, r]));

  return assignments.map((row: any) => {
    const ip = byInstructor.get(row.instructor_id);
    return {
      assignmentId: row.id,
      instructorId: row.instructor_id,
      instructorName: ip?.display_name || "",
      status: row.status,
      initiatedBy: row.initiated_by,
      priceCoins: row.price_coins,
      isAvailable: ip?.is_available ?? false,
      createdAt: row.created_at,
    };
  });
}
