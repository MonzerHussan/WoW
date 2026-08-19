import { SupabaseClient } from "@supabase/supabase-js";

export interface IncomingInstructorRequest {
  assignmentId: string;
  learnerId: string;
  status: "pending" | "accepted" | "declined";
  priceCoins: number;
  context: string | null;
  createdAt: string;
}

/**
 * The INSTRUCTOR side: requests addressed to me. The mirror of
 * getMyInstructorLinks, which reads the same table from the learner's
 * end — both are covered by 040's single "participants read" policy
 * (instructor_id = auth.uid() OR learner_id = auth.uid()), so neither
 * needs a policy of its own.
 *
 * `price_coins` is read from the row, never recomputed or accepted from
 * a client: 040 stores it as a SNAPSHOT taken when the learner made the
 * request, so a later price change cannot alter what an already-pending
 * request costs. It is displayed only — accept_instructor_assignment()
 * re-reads the same column server-side when it actually charges (027's
 * rule: the client never supplies a price).
 *
 * NO LEARNER NAME. `profiles` SELECT is owner-only ("Profiles are
 * viewable by owner", plus a staff-only branch for role management), so
 * an instructor genuinely cannot read the requesting learner's name —
 * verified against pg_policies, not assumed. What the instructor gets
 * instead is the learner's own `context` note, the price and the date,
 * which is enough to accept or decline. Showing a name would need a new,
 * narrow profiles read policy scoped to assignment participants — a
 * security change that deserves its own round rather than riding along
 * with this UI.
 *
 * Since 076 only the learner can create an assignment, so every row here
 * is learner-initiated by construction; `initiated_by` is not surfaced.
 */
export async function getIncomingInstructorRequests(
  supabase: SupabaseClient,
  instructorId: string
): Promise<IncomingInstructorRequest[]> {
  const { data, error } = await supabase
    .from("instructor_assignments")
    .select("id, learner_id, status, price_coins, context, created_at")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    assignmentId: row.id,
    learnerId: row.learner_id,
    status: row.status,
    priceCoins: row.price_coins,
    context: row.context,
    createdAt: row.created_at,
  }));
}

/** Whether this user is set up as an instructor at all — the gate for
 *  showing the incoming-requests panel. An instructor_profiles row is
 *  what makes someone an instructor in 040's model. */
export async function isInstructor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("instructor_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

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
