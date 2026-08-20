import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { reviewInstructorSchema } from "@/shared/schemas/instructor-profile.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/instructors/review
 * Body: { userId, approve, note? }
 *
 * Same shape as /api/admin/capabilities and /api/admin/roles: the
 * permission is verified INSIDE `review_instructor_application` (078)
 * against `users.manage`, which also writes the audit_log row. This
 * route adds shape validation and a readable error only — reaching it
 * without the permission still fails at the database with 42501.
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

  const parsed = reviewInstructorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { userId, approve, note } = parsed.data;

  const { data, error } = await supabase.rpc("review_instructor_application", {
    p_user_id: userId,
    p_approve: approve,
    p_note: note || null,
  });

  if (error) {
    // 42501 is the function's own refusal for a caller without
    // users.manage — surfaced as 403 rather than a generic 500.
    const forbidden = (error as { code?: string }).code === "42501";
    logger.error("instructor_review_failed", { actorId: user.id, targetId: userId, error: error.message });
    return NextResponse.json(
      { error: forbidden ? "Not authorized to review instructor applications" : "Review failed" },
      { status: forbidden ? 403 : 500 }
    );
  }

  if (!data?.reviewed) {
    return NextResponse.json({ error: data?.reason || "Review rejected" }, { status: 409 });
  }

  logger.info("instructor_reviewed", { actorId: user.id, targetId: userId, status: data.status });
  return NextResponse.json({ ok: true, status: data.status });
}
