import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { saveLessonDraftSchema } from "@/shared/schemas/content-draft.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/content/lessons/draft
 * Body: { lessonId, content }
 *
 * save_lesson_draft() (063) checks content.manage itself and decides
 * whether to write `content` directly (unpublished lesson) or
 * `draft_content` (already-live lesson) based on the row's own
 * review_status — this route never makes that decision.
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

  const parsed = saveLessonDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("save_lesson_draft", {
    p_lesson_id: parsed.data.lessonId,
    p_content: parsed.data.content,
  });

  if (error) {
    if (error.code === "42501") {
      logger.warn("admin_lesson_draft_denied", { userId: user.id, lessonId: parsed.data.lessonId });
      return NextResponse.json({ error: "ليست لديك صلاحية إدارة المحتوى" }, { status: 403 });
    }
    logger.error("admin_lesson_draft_save_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }

  if (data?.saved !== true) {
    return NextResponse.json({ error: data?.reason || "Save rejected" }, { status: 404 });
  }

  logger.info("admin_lesson_draft_saved", { userId: user.id, lessonId: parsed.data.lessonId });

  return NextResponse.json({ ok: true });
}
