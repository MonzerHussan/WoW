import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { completeLessonSchema } from "@/shared/schemas/lms.schema";
import { awardPoints } from "@/shared/services/points.service";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/lms/lessons/complete
 * Body: { lessonId: string }
 *
 * LMS→DNA contract (DOMAIN_CONTRACTS.md §5): a lesson only counts as
 * complete, and only earns LESSON_COMPLETE points, once verified here —
 * never trust a client "I finished it" flag on its own (TECH_DEBT #10).
 * "Verified" means: the lesson is actually visible to this user under RLS
 * (enrolled or free-preview) — a locked lesson simply won't be returned by
 * the select below. Idempotent: re-completing an already-completed lesson
 * is a no-op, not a repeat point grant.
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

  const parsed = completeLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lessonId" }, { status: 400 });
  }
  const { lessonId } = parsed.data;

  // RLS-gated: returns a row only if the lesson is a free preview or the
  // caller is enrolled in its course. A locked lesson yields no row here.
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    logger.error("lesson_complete_lookup_failed", { userId: user.id, lessonId, error: lessonError.message });
    return NextResponse.json({ error: "Failed to verify lesson" }, { status: 500 });
  }
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found or not accessible" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("completed")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (existing?.completed) {
    return NextResponse.json({ alreadyCompleted: true });
  }

  const { error: upsertError } = await supabase
    .from("lesson_progress")
    .upsert(
      { user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" }
    );

  if (upsertError) {
    logger.error("lesson_complete_upsert_failed", { userId: user.id, lessonId, error: upsertError.message });
    return NextResponse.json({ error: "Failed to record completion" }, { status: 500 });
  }

  try {
    const result = await awardPoints(supabase, user.id, "LESSON_COMPLETE");
    logger.info("lesson_completed", { userId: user.id, lessonId });
    return NextResponse.json({ alreadyCompleted: false, ...result });
  } catch (err) {
    // Progress is already saved — a points hiccup shouldn't look like the
    // lesson didn't complete. Log it and report the completion as-is.
    logger.error("lesson_complete_points_failed", { userId: user.id, lessonId, error: String(err) });
    return NextResponse.json({ alreadyCompleted: false, pointsError: true });
  }
}
