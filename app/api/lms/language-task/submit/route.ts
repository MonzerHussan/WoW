import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { submitLanguageTaskSchema } from "@/shared/schemas/lms.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/lms/language-task/submit
 * Body: { lessonId: string, response: string }
 *
 * First real call site for spend_coins() (007b) — still not wired to
 * /api/agent itself (deferred to the subscriptions sprint). The task
 * text and its coin cost are read from lessons.content->module_closing
 * here, server-side, never trusted from the client (same principle as
 * REASON_POINTS for points — CLAUDE.md #4).
 *
 * Order matters: insert the submission row first (its unique
 * (user_id, lesson_id) constraint is the actual anti-double-charge
 * guard), then spend the coins referencing that row. If the spend
 * fails (insufficient balance), the submission row is rolled back by
 * deleting it — a rejected payment shouldn't leave a "submitted"
 * record behind.
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

  const parsed = submitLanguageTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { lessonId, response } = parsed.data;

  // RLS-gated ("Lessons: enrolled or free preview") — a locked lesson
  // simply returns no row here, same pattern as lessons/complete.
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, content")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    logger.error("language_task_lookup_failed", { userId: user.id, lessonId, error: lessonError.message });
    return NextResponse.json({ error: "Failed to verify lesson" }, { status: 500 });
  }
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found or not accessible" }, { status: 403 });
  }

  const moduleClosing = (lesson.content as any)?.module_closing as
    | { optional_language_task?: string; coin_cost?: number }
    | undefined;

  if (!moduleClosing?.optional_language_task || typeof moduleClosing.coin_cost !== "number") {
    return NextResponse.json({ error: "This lesson has no language task" }, { status: 400 });
  }
  const taskText = moduleClosing.optional_language_task;
  const coinCost = moduleClosing.coin_cost;

  const { data: inserted, error: insertError } = await supabase
    .from("language_task_submissions")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      task_text_snapshot: taskText,
      response,
      coin_cost: coinCost,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "لقد سلّمت هذه المهمة من قبل" }, { status: 409 });
    }
    logger.error("language_task_insert_failed", { userId: user.id, lessonId, error: insertError.message });
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }

  const { data: spent, error: spendError } = await supabase.rpc("spend_coins", {
    p_user: user.id,
    p_amount: coinCost,
    p_reason: "language_task",
    p_ref_table: "language_task_submissions",
    p_ref_id: inserted.id,
  });

  if (spendError) {
    await supabase.from("language_task_submissions").delete().eq("id", inserted.id);
    logger.error("language_task_spend_error", { userId: user.id, lessonId, error: spendError.message });
    return NextResponse.json({ error: "Failed to charge coins" }, { status: 500 });
  }

  if (!spent) {
    await supabase.from("language_task_submissions").delete().eq("id", inserted.id);
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    return NextResponse.json(
      { error: "رصيدك من الكوينز غير كافٍ لهذه المهمة", balance: wallet?.balance ?? 0, coinCost },
      { status: 402 }
    );
  }

  logger.info("language_task_submitted", { userId: user.id, lessonId, coinCost });

  return NextResponse.json({ submissionId: inserted.id, taskText, response });
}
