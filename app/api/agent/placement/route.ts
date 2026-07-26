import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { callAgentWithRetry } from "@/shared/lib/openai";
import { buildPlacementSystemPrompt, extractPlacementBlock } from "@/features/agent/prompt";
import { placementRequestSchema, placementResultSchema } from "@/shared/schemas/placement.schema";
import { rateLimit } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";

// Same reasoning as /api/agent: our own 15s timeout + one retry can
// exceed Vercel Hobby's 10s default.
export const maxDuration = 30;

// 15 messages / 10 min: a full 8-exchange placement fits with headroom,
// abuse doesn't. NOTE this in-memory limiter is the ONLY thing bounding
// abandoned-and-restarted placement conversations (the once-only guard
// below fires only after a COMPLETED placement) — a real OpenAI cost
// exposure tracked explicitly in TECH_DEBT.md, same severity as the
// simulated-purchase warning.
const RATE_LIMIT = { limit: 15, windowMs: 10 * 60 * 1000 };

// When the client-held history reaches this length (~7 exchanges), the
// model is ordered to conclude NOW — the conversation cannot outgrow its
// 5-8 exchange design no matter how chatty the model gets.
const FORCE_CONCLUDE_AT = 14;

/**
 * POST /api/agent/placement
 * Body: { message, history } — same client-held-history model as /api/agent.
 *
 * The one-time free English placement conversation. ORDER IS LOAD-BEARING:
 * the "already placed" check runs before the rate limiter and before any
 * OpenAI call — a completed user costs us a single indexed SELECT, never
 * a model invocation. The user_language_profiles PRIMARY KEY backstops
 * the race two parallel tabs could win past this check (23505 -> 409).
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // THE once-only guard — server-side, before OpenAI, per explicit owner
  // decision. Hiding the button client-side is presentation, not protection.
  const { data: existing } = await supabase
    .from("user_language_profiles")
    .select("english_level")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    logger.info("placement_already_done", { userId: user.id, level: existing.english_level });
    return NextResponse.json(
      { error: "Placement already completed", level: existing.english_level },
      { status: 409 }
    );
  }

  const rl = rateLimit(`agent-placement:${user.id}`, RATE_LIMIT);
  if (!rl.allowed) {
    logger.warn("placement_rate_limited", { userId: user.id });
    return NextResponse.json(
      { error: "Too many messages. Please wait a moment." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = placementRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { message, history } = parsed.data;

  const { data: agentProfile } = await supabase
    .from("user_agent_profiles")
    .select("chosen_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const agentName = agentProfile?.chosen_name || "رفيق";

  const messages: any[] = [
    { role: "system", content: buildPlacementSystemPrompt(agentName) },
    ...history,
    { role: "user", content: message },
  ];
  if (history.length >= FORCE_CONCLUDE_AT) {
    messages.push({
      role: "system",
      content:
        "The conversation has reached its length limit. Conclude warmly NOW and output the placement block in this reply.",
    });
  }

  let rawReply: string;
  try {
    rawReply = await callAgentWithRetry(messages);
  } catch (err) {
    logger.error("placement_call_exhausted", { userId: user.id, error: String(err) });
    return NextResponse.json({ error: "Your agent is unavailable right now." }, { status: 502 });
  }

  const { text: reply, placementRaw } = extractPlacementBlock(rawReply);

  if (!placementRaw) {
    logger.info("placement_reply_sent", { userId: user.id, remaining: rl.remaining });
    return NextResponse.json({ reply, agentName, completed: false });
  }

  let result;
  try {
    const json = JSON.parse(placementRaw);
    const validated = placementResultSchema.safeParse(json);
    if (!validated.success) {
      // Malformed block: log it, drop it, let the conversation continue —
      // never write a corrupt row.
      logger.warn("placement_block_invalid_shape", { userId: user.id, issues: validated.error.issues });
      return NextResponse.json({ reply, agentName, completed: false });
    }
    result = validated.data;
  } catch (err) {
    logger.warn("placement_block_parse_failed", { userId: user.id, error: String(err) });
    return NextResponse.json({ reply, agentName, completed: false });
  }

  const { error: insertError } = await supabase.from("user_language_profiles").insert({
    user_id: user.id,
    english_level: result.level,
    placement_summary: result.summary,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      // Race between two parallel conversations: another tab completed
      // first. Its result stands; this one is discarded.
      logger.info("placement_race_lost", { userId: user.id });
      return NextResponse.json({ error: "Placement already completed", level: result.level }, { status: 409 });
    }
    logger.error("placement_profile_insert_failed", { userId: user.id, error: insertError.message });
    return NextResponse.json({ error: "Failed to save placement" }, { status: 500 });
  }

  if (result.facts.length > 0) {
    const { error: notesError } = await supabase.from("learner_notes").insert(
      result.facts.map((note) => ({ user_id: user.id, note, source: "placement" }))
    );
    // The profile row is the critical write; a notes hiccup is logged,
    // not surfaced as a failure of the whole placement.
    if (notesError) {
      logger.error("placement_notes_insert_failed", { userId: user.id, error: notesError.message });
    }
  }

  logger.info("placement_completed", { userId: user.id, level: result.level, factCount: result.facts.length });

  return NextResponse.json({ reply, agentName, completed: true, level: result.level });
}
