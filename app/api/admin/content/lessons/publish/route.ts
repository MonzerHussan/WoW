import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { publishLessonDraftSchema } from "@/shared/schemas/content-draft.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/content/lessons/publish
 * Body: { lessonId }
 *
 * publish_lesson_draft() (063) checks content.manage itself. For an
 * already-approved lesson this copies draft_content -> content and
 * clears draft_content — the live lesson is untouched until this call.
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

  const parsed = publishLessonDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("publish_lesson_draft", { p_lesson_id: parsed.data.lessonId });

  if (error) {
    if (error.code === "42501") {
      logger.warn("admin_lesson_publish_denied", { userId: user.id, lessonId: parsed.data.lessonId });
      return NextResponse.json({ error: "ليست لديك صلاحية إدارة المحتوى" }, { status: 403 });
    }
    logger.error("admin_lesson_publish_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to publish lesson" }, { status: 500 });
  }

  if (data?.published !== true) {
    return NextResponse.json({ error: data?.reason || "Publish rejected" }, { status: 409 });
  }

  logger.info("admin_lesson_published", { userId: user.id, lessonId: parsed.data.lessonId });

  return NextResponse.json({ ok: true });
}
