import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { voiceTurnSchema } from "@/shared/schemas/voice.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/agent/voice/turn
 *
 * Persists one completed exchange from a live voice call into the same
 * `agent_messages` memory the text agent reads, so a ten-minute
 * conversation is not forgotten the moment it ends — the "رفيق حقيقي"
 * complaint that drove TECH_DEBT #17.
 *
 * These transcripts ARE client-supplied (the Realtime API delivers them
 * over the WebRTC data channel, and the server is not on that path), so
 * this route reverses 033's "never trust a client-sent transcript" for
 * this one case, knowingly. It does NOT re-open the general hole:
 * `record_agent_turn` refuses a 'voice' turn unless the caller has an
 * ACTIVE call session, and stamps every row `source='voice'`. A user can
 * therefore only write into their own agent's memory, only while paying
 * for a call, and the provenance is visible forever after.
 *
 * No sessionId is accepted: the database decides whether a call is open
 * from auth.uid(), so there is nothing here for a client to point at a
 * session that isn't theirs.
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

  const parsed = voiceTurnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase.rpc("record_agent_turn", {
    p_user_message: parsed.data.userMessage,
    p_assistant_reply: parsed.data.assistantReply,
    p_source: "voice",
  });

  if (error) {
    // The commonest cause is a turn arriving after the call was already
    // closed — a race, not an attack, and never worth interrupting a
    // conversation over. The call itself is unaffected either way.
    logger.warn("voice_turn_record_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
