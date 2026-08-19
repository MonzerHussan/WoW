import { supabaseBrowser } from "@/shared/lib/supabase/client";

/**
 * The two responses an instructor can give. They deliberately take
 * different routes, and that asymmetry is the point:
 *
 *   ACCEPT goes through accept_instructor_assignment() (074) and only
 *   through it. Accepting CHARGES the learner, and migration 075 exists
 *   because the RLS policy used to let a client PATCH status straight to
 *   'accepted' — same end state, no money moved, no coin_transactions
 *   row. That policy now permits only 'declined', so this RPC is the one
 *   remaining door and there is no client-side path to fall back on.
 *
 *   DECLINE stays a plain PATCH. It moves no money, so there is nothing
 *   to protect and a definer function would add ceremony for no security
 *   gain — the reasoning recorded in 075's own header.
 *
 * Neither call sends a price. The amount is read server-side from the
 * assignment row (027's rule: a client never supplies a value that
 * decides what it is charged).
 */

export type AcceptResult =
  | { ok: true; coinsCharged: number }
  | { ok: false; reason: AcceptFailureReason; balance?: number; required?: number };

/** Mirrors exactly what 074's function can return, plus the 42501 it
 *  raises for a non-participant, plus a catch-all for anything else. */
export type AcceptFailureReason =
  | "assignment_not_found"
  | "not_pending"
  | "insufficient_balance"
  | "not_authorized"
  | "unknown";

export async function acceptAssignment(assignmentId: string): Promise<AcceptResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("accept_instructor_assignment", {
    p_assignment_id: assignmentId,
  });

  if (error) {
    // 42501 is raised (not returned as jsonb) for "not the invited
    // instructor" and for an unauthenticated caller — the function
    // deliberately treats identity as an exception, not a soft outcome.
    console.error("[instructors] accept failed:", error);
    const notAuthorized = error.code === "42501";
    return { ok: false, reason: notAuthorized ? "not_authorized" : "unknown" };
  }

  const result = data as {
    accepted?: boolean;
    reason?: string;
    coinsCharged?: number;
    balance?: number;
    required?: number;
  } | null;

  if (result?.accepted) {
    return { ok: true, coinsCharged: result.coinsCharged ?? 0 };
  }

  const known: AcceptFailureReason[] = ["assignment_not_found", "not_pending", "insufficient_balance"];
  const reason = known.includes(result?.reason as AcceptFailureReason)
    ? (result?.reason as AcceptFailureReason)
    : "unknown";

  return { ok: false, reason, balance: result?.balance, required: result?.required };
}

export type DeclineResult = { ok: true } | { ok: false; reason: "not_pending" | "unknown" };

/**
 * The `.select()` is not decoration. With RLS, an UPDATE whose rows are
 * filtered away returns NO error and NO data — the silent-success class
 * this codebase has been bitten by repeatedly (018, 015c, and the whole
 * reason migration 030 exists). Here it would mean the button appearing
 * to work while the request stayed pending. Zero rows is therefore
 * treated as a failure the instructor is told about.
 *
 * The policy also requires status = 'pending' in its USING clause, so a
 * request already answered elsewhere filters to zero rows rather than
 * being silently re-declined — which is exactly the "not_pending" case.
 */
export async function declineAssignment(assignmentId: string): Promise<DeclineResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("instructor_assignments")
    .update({ status: "declined" })
    .eq("id", assignmentId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[instructors] decline failed:", error);
    return { ok: false, reason: "unknown" };
  }
  if (!data) return { ok: false, reason: "not_pending" };
  return { ok: true };
}
