import { SupabaseClient } from "@supabase/supabase-js";

export interface IncomingInstructorRequest {
  assignmentId: string;
  learnerId: string;
  status: "pending" | "accepted" | "declined";
  priceCoins: number;
  context: string | null;
  createdAt: string;
  /** From get_my_assignment_counterparts() (077). Null when the row has
   *  no name to show — never a silent empty string. */
  learnerName: string | null;
  learnerAvatarUrl: string | null;
}

/**
 * The counterpart's display name for every assignment the caller is a
 * party to — one call for all of them (077).
 *
 * Deliberately NOT a join against `profiles`: that table's SELECT is
 * owner-only, so a join from either side silently resolves to null.
 * 077's SECURITY DEFINER function is the only path, and it returns
 * exactly two fields (name + avatar) rather than the row — an RLS
 * policy could not have done that, since RLS filters rows, not columns
 * (the lesson 063 recorded for lessons.draft_content).
 *
 * The function also decides WHICH name: display_name when the
 * counterpart is an instructor, full_name when they are a learner. That
 * choice lives in the database precisely so an instructor's real name
 * never leaves it, and so the same person shows one name everywhere.
 */
export async function getAssignmentCounterparts(
  supabase: SupabaseClient
): Promise<Map<string, { name: string | null; avatarUrl: string | null }>> {
  const { data, error } = await supabase.rpc("get_my_assignment_counterparts");
  if (error) {
    // Never fatal: a missing name degrades the card, it does not break
    // accepting or declining.
    console.error("[instructors] counterpart lookup failed:", error.message);
    return new Map();
  }
  const map = new Map<string, { name: string | null; avatarUrl: string | null }>();
  for (const row of (data || []) as any[]) {
    map.set(row.assignment_id, {
      name: row.counterpart_name || null,
      avatarUrl: row.counterpart_avatar_url || null,
    });
  }
  return map;
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
 * THE LEARNER'S NAME COMES FROM 077, NOT FROM A JOIN. `profiles` SELECT
 * is owner-only ("Profiles are viewable by owner", plus a staff-only
 * branch for role management), so an instructor cannot read the
 * requesting learner's row and any embed silently resolves to null.
 * `get_my_assignment_counterparts()` returns the name and avatar alone —
 * two fields, never the row. (This comment previously said the name was
 * unavailable, which was true before 077 and stale after it.)
 *
 * Since 076 only the learner can create an assignment, so every row here
 * is learner-initiated by construction; `initiated_by` is not surfaced.
 */
export async function getIncomingInstructorRequests(
  supabase: SupabaseClient,
  instructorId: string
): Promise<IncomingInstructorRequest[]> {
  const [{ data, error }, counterparts] = await Promise.all([
    supabase
      .from("instructor_assignments")
      .select("id, learner_id, status, price_coins, context, created_at")
      .eq("instructor_id", instructorId)
      .order("created_at", { ascending: false }),
    getAssignmentCounterparts(supabase),
  ]);

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => {
    const cp = counterparts.get(row.id);
    return {
      assignmentId: row.id,
      learnerId: row.learner_id,
      status: row.status,
      priceCoins: row.price_coins,
      context: row.context,
      createdAt: row.created_at,
      learnerName: cp?.name ?? null,
      learnerAvatarUrl: cp?.avatarUrl ?? null,
    };
  });
}

export interface InstructorConversation {
  assignmentId: string;
  /** The OTHER party, whoever the caller is. From 077 — display_name if
   *  they are the instructor, full_name if they are the learner. Null
   *  when the row has no name to show; the UI substitutes a label rather
   *  than falling back to an id. */
  counterpartName: string | null;
  counterpartAvatarUrl: string | null;
  /** Which side the CALLER is on — decides the header label only, never
   *  what they may read or write (both are symmetric here). */
  iAmInstructor: boolean;
  context: string | null;
  priceCoins: number;
  createdAt: string;
}

/**
 * Every conversation this user can hold: their ACCEPTED assignments,
 * from either side.
 *
 * `status = 'accepted'` is a filter here, not a permission. The
 * permission is in 074's send_instructor_message(), which returns
 * `assignment_not_accepted` regardless of what the client asks for —
 * so hiding a pending row from this list is a courtesy to the user, not
 * the thing that stops them writing into it. Tested as such.
 *
 * One query for both sides. 040's "participants read" policy is already
 * symmetric (`instructor_id = auth.uid() OR learner_id = auth.uid()`),
 * so a single `.or()` needs no new policy — and deliberately so: the
 * learner and the instructor are equals in a conversation, unlike in the
 * request flow where only one of them may accept.
 */
export async function getMyConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<InstructorConversation[]> {
  const [{ data, error }, counterparts] = await Promise.all([
    supabase
      .from("instructor_assignments")
      .select("id, instructor_id, learner_id, context, price_coins, created_at")
      .eq("status", "accepted")
      .or(`instructor_id.eq.${userId},learner_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    getAssignmentCounterparts(supabase),
  ]);

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => {
    const cp = counterparts.get(row.id);
    return {
      assignmentId: row.id,
      counterpartName: cp?.name ?? null,
      counterpartAvatarUrl: cp?.avatarUrl ?? null,
      iAmInstructor: row.instructor_id === userId,
      context: row.context,
      priceCoins: row.price_coins,
      createdAt: row.created_at,
    };
  });
}

export interface MyInstructorProfile {
  displayName: string;
  bio: string | null;
  expertiseTags: string[];
  yearsExperience: number | null;
  priceCoins: number;
  isAvailable: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  needsReview: boolean;
  reviewNote: string | null;
}

/**
 * This user's own instructor profile, or null if they have never
 * applied. Readable through 040's signed-in read policy — no special
 * access needed for one's own row.
 */
export async function getMyInstructorProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<MyInstructorProfile | null> {
  const { data } = await supabase
    .from("instructor_profiles")
    .select("display_name, bio, expertise_tags, years_experience, price_coins, is_available, approval_status, needs_review, review_note")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    displayName: data.display_name,
    bio: data.bio,
    expertiseTags: data.expertise_tags || [],
    yearsExperience: data.years_experience,
    priceCoins: data.price_coins,
    isAvailable: data.is_available,
    approvalStatus: data.approval_status,
    needsReview: data.needs_review,
    reviewNote: data.review_note,
  };
}

/**
 * Whether this user may act as an instructor — i.e. show the incoming
 * requests panel. Since 078 a row alone is not enough: a pending or
 * rejected applicant has a row but is not an instructor, and learners
 * cannot request them (the replaced 040 policy demands approval), so
 * they would only ever see an empty panel.
 */
export async function isInstructor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("instructor_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("approval_status", "approved")
    .maybeSingle();
  return !!data;
}

export interface InstructorReviewRow {
  userId: string;
  displayName: string;
  bio: string | null;
  expertiseTags: string[];
  yearsExperience: number | null;
  priceCoins: number;
  approvalStatus: "pending" | "approved" | "rejected";
  needsReview: boolean;
  updatedAt: string;
}

/**
 * The owner's review queue: ONE list with TWO reasons — a new
 * application (`pending`) or an approved profile edited afterwards
 * (`needs_review`). Kept as one queue because the owner's decision is
 * the same in both cases; the caller distinguishes them by the flags.
 *
 * Reading these rows needs no special policy: instructor_profiles has
 * been signed-in readable since 040. `users.manage` gates the ACTION,
 * not the sight of it — and the action is gated inside the function.
 */
export async function listInstructorsForReview(supabase: SupabaseClient): Promise<InstructorReviewRow[]> {
  const { data, error } = await supabase
    .from("instructor_profiles")
    .select("user_id, display_name, bio, expertise_tags, years_experience, price_coins, approval_status, needs_review, updated_at")
    .or("approval_status.eq.pending,needs_review.eq.true")
    .order("updated_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    displayName: r.display_name,
    bio: r.bio,
    expertiseTags: r.expertise_tags || [],
    yearsExperience: r.years_experience,
    priceCoins: r.price_coins,
    approvalStatus: r.approval_status,
    needsReview: r.needs_review,
    updatedAt: r.updated_at,
  }));
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
