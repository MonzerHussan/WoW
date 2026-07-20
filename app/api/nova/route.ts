import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { NOVA_SYSTEM_PROMPT, buildUserContextBlock } from "@/features/nova/prompt";
import { novaRequestSchema } from "@/shared/schemas/nova.schema";
import { rateLimit } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 }; // 20 messages / 10 min / user
const OPENAI_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1; // one retry on a transient failure, not on validation/auth errors

/**
 * Calls OpenAI with a hard timeout (AbortController) and a single retry on
 * transient failures (network error / 5xx). Does not retry on 4xx — those
 * won't succeed on a second attempt.
 */
async function callNovaWithRetry(messages: any[]) {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    try {
      const completion = await getOpenAI().chat.completions.create(
        { model: "gpt-4o", messages, temperature: 0.7, max_tokens: 600 },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return completion.choices[0]?.message?.content || "";
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      logger.warn("nova_call_failed", { attempt, error: String(err) });
      // Only retry once, and only for the first attempt.
      if (attempt === MAX_RETRIES) break;
    }
  }

  throw lastErr;
}

/**
 * POST /api/nova
 * Body: { message: string, history?: { role: "user" | "assistant", content: string }[] }
 *
 * Protections added in Sprint 1.5 (behavior for a valid request is unchanged):
 * - Zod validation of the request body (shared/schemas/nova.schema.ts)
 * - Per-user rate limiting
 * - Request timeout + single retry on transient OpenAI failures
 * - Structured logging or every stage (not just errors)
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // --- Rate limiting ---
  const rl = rateLimit(`nova:${user.id}`, RATE_LIMIT);
  if (!rl.allowed) {
    logger.warn("nova_rate_limited", { userId: user.id });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before messaging Nova again." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
    );
  }

  // --- Request validation ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = novaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 }
    );
  }
  const { message, history } = parsed.data;

  // --- Load profile for context grounding ---
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, account_type, points, level, onboarding_goal, pmp_level_interest")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const systemPrompt = NOVA_SYSTEM_PROMPT + buildUserContextBlock(profile);

  await supabase.from("ai_conversations").insert({ user_id: user.id, role: "user", message });

  let reply: string;
  try {
    reply = await callNovaWithRetry([
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ]);
  } catch (err) {
    logger.error("nova_call_exhausted", { userId: user.id, error: String(err) });
    // Safe, generic message to the client — never leak provider error internals.
    return NextResponse.json({ error: "Nova is unavailable right now." }, { status: 502 });
  }

  await supabase.from("ai_conversations").insert({ user_id: user.id, role: "assistant", message: reply });

  logger.info("nova_reply_sent", { userId: user.id, remaining: rl.remaining });

  return NextResponse.json({ reply });
}
