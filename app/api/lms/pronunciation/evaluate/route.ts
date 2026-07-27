import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { evaluatePronunciationSchema } from "@/shared/schemas/pronunciation.schema";
import { COIN_COSTS } from "@/shared/constants/coins";
import { getPricingUnit, PRICING_KEYS } from "@/shared/services/pricing.service";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/lms/pronunciation/evaluate
 * Body: { lessonId, referenceText, transcript }
 *
 * Charges for ONE agent evaluation of a spoken phrase. Repeatable by
 * design — there is no unique constraint and no per-lesson limit, since
 * drilling the same phrase repeatedly is the point (021).
 *
 * The transcript arrives already produced by the browser's
 * SpeechRecognition, so by the time this route runs the speech-to-text
 * step has demonstrably succeeded — which is what makes charging here
 * safe. The client never calls this on a failed or empty transcription
 * (and the schema's min(1) rejects it anyway), so a user never pays for
 * recognition that didn't work.
 *
 * No audio ever reaches this route. Only text.
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

  const parsed = evaluatePronunciationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { lessonId, referenceText, transcript } = parsed.data;

  // RLS-gated ("Lessons: enrolled or free preview") — a locked lesson
  // returns no row, same guard as every other lesson-scoped route.
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    logger.error("pronunciation_lesson_lookup_failed", { userId: user.id, lessonId, error: lessonError.message });
    return NextResponse.json({ error: "Failed to verify lesson" }, { status: 500 });
  }
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found or not accessible" }, { status: 403 });
  }

  // Authoritative price since 024: pricing_units, editable from
  // /admin/pricing. COIN_COSTS.PRONUNCIATION_EVALUATION survives only as
  // a documented last-resort fallback for the case where the pricing row
  // is unreadable — it is NOT the source of truth, and an admin's change
  // will never be reflected in it.
  const configuredCost = await getPricingUnit(supabase, PRICING_KEYS.pronunciation);
  const coinCost = configuredCost ?? COIN_COSTS.PRONUNCIATION_EVALUATION;
  if (configuredCost === null) {
    logger.warn("pronunciation_price_fallback", {
      userId: user.id,
      fallback: COIN_COSTS.PRONUNCIATION_EVALUATION,
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("pronunciation_attempts")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      reference_text: referenceText,
      transcript,
      coin_cost: coinCost,
    })
    .select("id")
    .single();

  if (insertError) {
    logger.error("pronunciation_insert_failed", { userId: user.id, lessonId, error: insertError.message });
    return NextResponse.json({ error: "Failed to record attempt" }, { status: 500 });
  }

  const { data: spent, error: spendError } = await supabase.rpc("spend_coins", {
    p_user: user.id,
    p_amount: coinCost,
    p_reason: "pronunciation_practice",
    p_ref_table: "pronunciation_attempts",
    p_ref_id: inserted.id,
  });

  // Roll the attempt row back on any charge failure — 021's DELETE
  // policy exists specifically to make this actually take effect
  // (see 018 for what happens when it doesn't).
  if (spendError) {
    await supabase.from("pronunciation_attempts").delete().eq("id", inserted.id);
    logger.error("pronunciation_spend_error", { userId: user.id, lessonId, error: spendError.message });
    return NextResponse.json({ error: "Failed to charge coins" }, { status: 500 });
  }

  if (!spent) {
    await supabase.from("pronunciation_attempts").delete().eq("id", inserted.id);
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    return NextResponse.json(
      { error: "رصيدك من الكوينز غير كافٍ لهذا التقييم", balance: wallet?.balance ?? 0, coinCost },
      { status: 402 }
    );
  }

  logger.info("pronunciation_evaluated", { userId: user.id, lessonId, coinCost });

  return NextResponse.json({ attemptId: inserted.id, coinCost });
}
