import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { buildStyleHint, buildVoiceSystemPrompt } from "@/features/agent/prompt";
import { getEnrollmentContext } from "@/features/agent/services/agent.service";
import { getPublishedCourses } from "@/features/lms/services/course.service";
import { setVoiceCallIdSchema, endVoiceCallSchema } from "@/shared/schemas/voice.schema";
import { AGENT_VOICE, OPENAI_CLIENT_SECRETS_URL } from "@/shared/constants/agent";
import { rateLimit } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 30;

// Deliberately tight. A voice call is the most expensive action on the
// platform by an order of magnitude, and unlike a text message its cost
// keeps running after the request returns — so the cheap thing to limit
// is how often one can be STARTED. This is still the in-memory limiter
// (per-instance, resets on deploy — TECH_DEBT #6's shared-store task),
// but the real bound here is the wallet: every start debits a full block.
const RATE_LIMIT = { limit: 6, windowMs: 60 * 60 * 1000 }; // 6 call starts / hour / user

const MINT_TIMEOUT_MS = 10_000;

/**
 * POST   /api/agent/voice/session  — charge a block, mint a credential
 * PATCH  /api/agent/voice/session  — record the OpenAI call id
 * DELETE /api/agent/voice/session?sessionId=... — end and refund
 *
 * The browser talks to OpenAI DIRECTLY over WebRTC (036's header explains
 * why: a relay would need a long-lived process this serverless
 * deployment cannot host). This route is only on the credential path —
 * OPENAI_API_KEY never leaves the server, and what the browser receives
 * is a short-lived client secret scoped to one session.
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = rateLimit(`voice:${user.id}`, RATE_LIMIT);
  if (!rl.allowed) {
    logger.warn("voice_rate_limited", { userId: user.id });
    return NextResponse.json(
      { error: "voice_rate_limited" },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
    );
  }

  // Charge FIRST, mint second. The block is taken before the client has
  // done anything, which is what makes it the one amount a client cannot
  // misreport (036). Balance, one-call-at-a-time and price all live
  // inside the function — none of them are arguments.
  const { data: started, error: startError } = await supabase.rpc("start_agent_call");

  if (startError) {
    logger.error("voice_start_failed", { userId: user.id, error: startError.message });
    return NextResponse.json({ error: "Failed to start call" }, { status: 500 });
  }

  if (!started?.allowed) {
    const reason = started?.reason as string | undefined;
    const status = reason === "insufficient_balance" ? 402 : reason === "call_already_active" ? 409 : 503;
    logger.info("voice_start_refused", { userId: user.id, reason });
    return NextResponse.json(
      { error: reason || "voice_unavailable", balance: started?.balance, required: started?.required },
      { status }
    );
  }

  const sessionId = started.sessionId as string;
  const model = started.model as string;

  // Everything the agent needs to know, gathered once. Leaner than the
  // text agent's context on purpose — see buildVoiceSystemPrompt.
  const [
    { data: profile },
    { data: agentProfile },
    { data: capabilities },
    { data: skills },
    { data: languageProfile },
    { data: learnerNoteRows },
    publishedCourses,
    enrollments,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("user_agent_profiles").select("chosen_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_capabilities").select("capability").eq("user_id", user.id),
    supabase
      .from("entity_skills")
      .select("level, skills(name)")
      .eq("entity_type", "user")
      .eq("entity_id", user.id)
      .order("level", { ascending: false })
      .limit(5),
    supabase.from("user_language_profiles").select("english_level").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("learner_notes")
      .select("note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    getPublishedCourses(supabase),
    getEnrollmentContext(supabase, user.id),
  ]);

  const agentName = agentProfile?.chosen_name || "رفيق";

  const instructions = buildVoiceSystemPrompt({
    agentName,
    styleHint: buildStyleHint((capabilities || []).map((c: any) => c.capability as string)),
    fullName: profile?.full_name || "",
    englishLevel: languageProfile?.english_level ?? null,
    learnerNotes: (learnerNoteRows || []).map((n: any) => n.note as string),
    topSkills: (skills || []).map((s: any) => ({ name: s.skills?.name || "", level: s.level })),
    courses: publishedCourses.map((c) => ({ id: c.id, title: c.title })),
    enrollments: enrollments.map((e) => ({ courseTitle: e.courseTitle, progress: e.progress })),
  });

  let clientSecret: string | null = null;
  let expiresAt: number | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MINT_TIMEOUT_MS);

    const mintRes = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions,
          audio: {
            // WITHOUT THIS, USER TRANSCRIPTION IS OFF. Verified against
            // the live API, not assumed: minting without an
            // `input.transcription` block echoes back
            // `"transcription": null`, which means
            // `conversation.item.input_audio_transcription.completed`
            // never fires. The client pairs a user line with an
            // assistant line before persisting, so a missing user side
            // means NOTHING is ever written to agent_messages — the
            // voice-memory feature (هـ-2 / 036 section C) would fail
            // silently, with a working call and an empty memory.
            //
            // gpt-4o-mini-transcribe over whisper-1: cheaper, newer, and
            // this platform's calls are mostly Arabic. It bills
            // separately from the realtime audio, so it is a real
            // addition to the per-minute cost behind the 4-coin price.
            input: { transcription: { model: "gpt-4o-mini-transcribe" } },
            output: { voice: AGENT_VOICE },
          },
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!mintRes.ok) {
      const detail = await mintRes.text();
      logger.error("voice_mint_failed", { userId: user.id, status: mintRes.status, detail: detail.slice(0, 500) });
    } else {
      const minted = await mintRes.json();
      // The GA response nests the secret; tolerate either shape rather
      // than assuming one, since a wrong guess here would charge the
      // user for a call that can never connect.
      clientSecret = minted?.value ?? minted?.client_secret?.value ?? null;
      expiresAt = minted?.expires_at ?? minted?.client_secret?.expires_at ?? null;
    }
  } catch (err) {
    logger.error("voice_mint_threw", { userId: user.id, error: String(err) });
  }

  // Minting failed => the user must not pay for a call that never
  // existed. end_agent_call refunds in FULL here, because no
  // openai_call_id was ever recorded and we are inside the connect
  // grace — it marks the session 'failed', not 'completed'.
  if (!clientSecret) {
    const { error: refundError } = await supabase.rpc("end_agent_call", { p_session_id: sessionId });
    if (refundError) {
      logger.error("voice_refund_after_mint_failure_failed", {
        userId: user.id,
        sessionId,
        error: refundError.message,
      });
    }
    return NextResponse.json({ error: "voice_unavailable" }, { status: 502 });
  }

  logger.info("voice_session_minted", {
    userId: user.id,
    sessionId,
    model,
    coinsCharged: started.coinsCharged,
  });

  return NextResponse.json({
    sessionId,
    clientSecret,
    expiresAt,
    model,
    voice: AGENT_VOICE,
    capMinutes: started.capMinutes,
    ratePerMinute: started.ratePerMinute,
    coinsCharged: started.coinsCharged,
    balanceAfter: started.balanceAfter,
    agentName,
  });
}

/** Records the call id from the SDP handshake's `Location` header. */
export async function PATCH(req: NextRequest) {
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

  const parsed = setVoiceCallIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase.rpc("set_agent_call_id", {
    p_session_id: parsed.data.sessionId,
    p_call_id: parsed.data.callId,
  });

  if (error) {
    // Non-fatal for the user: the call is already connected and the
    // charge already stands. Losing the correlation id costs us audit
    // fidelity, and makes end_agent_call treat a fast hang-up as a
    // failed connect (refunding generously) — wrong in our favour, not
    // theirs, so it is logged rather than surfaced.
    logger.warn("voice_set_call_id_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Ends the call and refunds unused whole minutes.
 *
 * sessionId travels as a query parameter rather than a DELETE body:
 * bodies on DELETE are legal but inconsistently forwarded by proxies,
 * and this request is the one that gives the user their coins back.
 */
export async function DELETE(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = endVoiceCallSchema.safeParse({
    sessionId: req.nextUrl.searchParams.get("sessionId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { data: ended, error } = await supabase.rpc("end_agent_call", {
    p_session_id: parsed.data.sessionId,
  });

  if (error) {
    logger.error("voice_end_failed", { userId: user.id, sessionId: parsed.data.sessionId, error: error.message });
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
  }

  logger.info("voice_call_ended", {
    userId: user.id,
    sessionId: parsed.data.sessionId,
    status: ended?.status,
    durationSeconds: ended?.durationSeconds,
    coinsRefunded: ended?.coinsRefunded,
  });

  return NextResponse.json(ended);
}
