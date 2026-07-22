import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { castReviewVoteSchema } from "@/shared/schemas/curriculum-contribution.schema";
import { logger } from "@/shared/lib/logger";

const VOTE_TO_STATUS: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  needs_revision: "human_review",
};

/**
 * POST /api/instructor/review/vote
 * Body: { lessonId, vote: 'approve' | 'reject' | 'needs_revision' }
 *
 * Two entirely different outcomes depending on who's calling, per the
 * owner's explicit, binding rule (mirrors 008's own "voter_type='owner'
 * requires content.manage" design):
 *  - content.manage holder (the owner's account, migration 015): this
 *    IS the decisive vote — it both records as voter_type='owner' and
 *    immediately transitions lessons.review_status. Peer votes already
 *    cast have no bearing on this decision either way.
 *  - instructor/assessor capability holder (anyone else): a peer vote
 *    only — recorded as voter_type='peer_instructor'/'peer_assessor',
 *    informative context on the review queue, never touches
 *    review_status.
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

  const parsed = castReviewVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { lessonId, vote } = parsed.data;

  const [{ data: capabilities }, { data: hasContentManage }] = await Promise.all([
    supabase.from("user_capabilities").select("capability").eq("user_id", user.id),
    supabase.rpc("has_permission", { perm: "content.manage" }),
  ]);
  const caps = (capabilities || []).map((c: any) => c.capability as string);

  if (hasContentManage) {
    const { error: voteError } = await supabase.from("content_review_votes").insert({
      lesson_id: lessonId,
      voter_type: "owner",
      voter_id: user.id,
      vote,
    });
    if (voteError) {
      logger.error("curriculum_owner_vote_failed", { userId: user.id, lessonId, error: voteError.message });
      return NextResponse.json({ error: "Failed to record decision" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("lessons")
      .update({ review_status: VOTE_TO_STATUS[vote] })
      .eq("id", lessonId);
    if (updateError) {
      logger.error("curriculum_owner_status_update_failed", { userId: user.id, lessonId, error: updateError.message });
      return NextResponse.json({ error: "Vote recorded but status update failed" }, { status: 500 });
    }

    logger.info("curriculum_owner_decision", { userId: user.id, lessonId, vote });
    return NextResponse.json({ decisive: true, review_status: VOTE_TO_STATUS[vote] });
  }

  const voterType = caps.includes("assessor") ? "peer_assessor" : caps.includes("instructor") ? "peer_instructor" : null;
  if (!voterType) {
    return NextResponse.json({ error: "Instructor or assessor capability required" }, { status: 403 });
  }

  const { error: peerVoteError } = await supabase.from("content_review_votes").insert({
    lesson_id: lessonId,
    voter_type: voterType,
    voter_id: user.id,
    vote,
  });
  if (peerVoteError) {
    logger.error("curriculum_peer_vote_failed", { userId: user.id, lessonId, error: peerVoteError.message });
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }

  logger.info("curriculum_peer_vote", { userId: user.id, lessonId, vote, voterType });
  return NextResponse.json({ decisive: false });
}
