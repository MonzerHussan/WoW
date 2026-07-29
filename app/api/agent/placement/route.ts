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

// 15 messages / 10 min. This limiter shapes BURSTS only — it lives in
// one serverless instance's memory, so it resets on every deploy and
// cold start. It is no longer the only bound: `consume_placement_quota`
// (029) enforces a durable lifetime cap in the database, which is what
// actually closes the abandoned-conversation cost hole (TECH_DEBT #15).
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
 *
 * That guard only covers COMPLETED placements, though. The case it never
 * covered — start, abandon, start again, forever — is now bounded by
 * `consume_placement_quota()` (029): a durable per-user lifetime cap,
 * checked immediately before the model call so an over-quota user is
 * refused without costing anything. See TECH_DEBT #15 for the history.
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

  // DURABLE COST CAP (029) — the last thing before we spend money, and
  // deliberately after validation so a malformed request cannot burn
  // quota. Check-and-increment happen in one atomic statement inside the
  // function; a server restart cannot reset it because it is a table row,
  // not a counter in memory.
  const { data: quota, error: quotaError } = await supabase.rpc("consume_placement_quota");

  if (quotaError) {
    logger.error("placement_quota_failed", { userId: user.id, error: quotaError.message });
    return NextResponse.json({ error: "Your agent is unavailable right now." }, { status: 502 });
  }

  const quotaResult = quota as { allowed: boolean; count: number; cap: number };
  if (!quotaResult.allowed) {
    // Refused BEFORE any OpenAI call — the point of the whole feature is
    // that an over-quota user costs nothing.
    logger.warn("placement_quota_exhausted", {
      userId: user.id,
      count: quotaResult.count,
      cap: quotaResult.cap,
    });
    return NextResponse.json(
      { error: "لقد استنفدت عدد رسائل محادثة تحديد المستوى. تواصل مع الدعم إن كنت تحتاج إعادة المحاولة." },
      { status: 429 }
    );
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
    logger.info("placement_reply_sent", {
      userId: user.id,
      remaining: rl.remaining,
      quotaUsed: quotaResult.count,
      quotaCap: quotaResult.cap,
    });
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
