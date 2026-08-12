import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { submitEntityDecisionSchema } from "@/shared/schemas/entity-decision.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/lms/entity-decisions/submit
 * Body: { lessonId, scenarioKey, choiceKey }
 *
 * submit_lesson_entity_decision() (066) does all the real work: looks
 * up the authored delta for this exact choice inside the lesson's own
 * content server-side, and applies it via apply_entity_memory_event()
 * (064) — this route only validates shape. The client never sends a
 * delta value, only which choice it picked.
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

  const parsed = submitEntityDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("submit_lesson_entity_decision", {
    p_lesson_id: parsed.data.lessonId,
    p_scenario_key: parsed.data.scenarioKey,
    p_choice_key: parsed.data.choiceKey,
  });

  if (error) {
    logger.error("entity_decision_submit_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to submit decision" }, { status: 500 });
  }

  if (!data?.submitted) {
    return NextResponse.json({ error: data?.reason || "Submission rejected" }, { status: 409 });
  }

  logger.info("entity_decision_submitted", {
    userId: user.id,
    lessonId: parsed.data.lessonId,
    scenarioKey: parsed.data.scenarioKey,
    choiceKey: parsed.data.choiceKey,
  });

  return NextResponse.json({ ok: true, result: data });
}
