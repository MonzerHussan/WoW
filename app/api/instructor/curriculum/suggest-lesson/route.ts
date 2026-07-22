import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { suggestLessonSchema } from "@/shared/schemas/curriculum-contribution.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/instructor/curriculum/suggest-lesson
 * Body: { moduleId, titleAr, titleEn, bodyAr, bodyEn, vocabulary[5], toolboxAr?, toolboxEn? }
 *
 * Proposes a new lesson on one of WOW's own shared courses
 * (owner_type is null) — distinct from the personal-course path (014),
 * where an instructor owns and directly approves their own content. A
 * shared-course lesson always starts at review_status='nova_check_pending'
 * (015's RLS enforces this at insert regardless of what's sent here) and
 * only becomes visible to students once the owner casts an 'approved'
 * decision via /api/instructor/review/vote.
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: capability } = await supabase
    .from("user_capabilities")
    .select("capability")
    .eq("user_id", user.id)
    .eq("capability", "instructor")
    .maybeSingle();
  if (!capability) {
    return NextResponse.json({ error: "Instructor capability required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = suggestLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { moduleId, titleAr, titleEn, bodyAr, bodyEn, vocabulary, toolboxAr, toolboxEn } = parsed.data;

  const { data: moduleRow } = await supabase
    .from("modules")
    .select("id, course_id, courses(owner_type)")
    .eq("id", moduleId)
    .maybeSingle();

  if (!moduleRow || (moduleRow.courses as any)?.owner_type !== null) {
    return NextResponse.json({ error: "This module doesn't belong to a shared WOW course" }, { status: 400 });
  }

  const { count: lessonCount } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { data: lesson, error: insertError } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title: titleAr,
      translations: {
        ar: { title: titleAr, body: bodyAr },
        en: { title: titleEn, body: bodyEn },
      },
      content: {
        vocabulary,
        ...(toolboxAr ? { toolbox_ar: toolboxAr } : {}),
        ...(toolboxEn ? { toolbox_en: toolboxEn } : {}),
      },
      review_status: "nova_check_pending",
      last_edited_by: user.id,
      order_index: lessonCount || 0,
    })
    .select("id, title")
    .single();

  if (insertError || !lesson) {
    logger.error("curriculum_suggest_lesson_failed", { userId: user.id, error: insertError?.message });
    return NextResponse.json({ error: "Failed to submit lesson proposal" }, { status: 500 });
  }

  await supabase.from("content_contributions").insert({
    lesson_id: lesson.id,
    contributor_id: user.id,
    contribution_type: "created",
    language: "ar",
  });

  // Placeholder automated check (015) — see that function's own comment.
  // Failure here isn't fatal to the submission itself: the lesson still
  // exists at 'nova_check_pending' and can be advanced manually later;
  // we just log it rather than rolling back a successful insert.
  const { error: novaCheckError } = await supabase.rpc("run_nova_check_placeholder", { p_lesson_id: lesson.id });
  if (novaCheckError) {
    logger.error("curriculum_nova_check_placeholder_failed", { lessonId: lesson.id, error: novaCheckError.message });
  }

  logger.info("curriculum_lesson_suggested", { userId: user.id, lessonId: lesson.id, moduleId });

  return NextResponse.json({ lesson });
}
