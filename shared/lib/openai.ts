import OpenAI from "openai";
import { logger } from "@/shared/lib/logger";

/**
 * SERVER-ONLY. This module reads OPENAI_API_KEY and must only ever be
 * imported from Route Handlers (app/api/*) — never from a "use client"
 * component, where bundling it would leak nothing (the key is read at
 * runtime, not build time) but the call would simply fail. Keeping all
 * OpenAI access behind API routes is an existing rule (ARCHITECTURE §4),
 * not something this file introduces.
 *
 * Extracted verbatim from app/api/agent/route.ts once a second caller
 * appeared (the placement conversation) — the owner's instruction was
 * to reuse the client and retry logic, not copy them. Behavior is
 * intentionally identical to the original: same model, temperature,
 * token cap, 15s timeout, single retry.
 */

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const OPENAI_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;

export async function callAgentWithRetry(messages: any[]) {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    try {
      const completion = await getOpenAI().chat.completions.create(
        { model: "gpt-4o", messages, temperature: 0.7, max_tokens: 700 },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return completion.choices[0]?.message?.content || "";
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      logger.warn("agent_call_failed", { attempt, error: String(err) });
      if (attempt === MAX_RETRIES) break;
    }
  }

  throw lastErr;
}
