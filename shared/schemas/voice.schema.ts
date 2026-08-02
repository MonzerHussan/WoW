import { z } from "zod";

/**
 * Voice-call inputs (036). Note what is NOT here: no duration, no minute
 * count, no coin amount. The server measures elapsed time from its own
 * clock inside `end_agent_call()` and reads the price from
 * `pricing_units` — a client that could propose any of those could
 * propose a cheaper call, which is the same rule CLAUDE.md #4 already
 * fixed once for points and 007b holds for coins.
 */

/** Recorded after the WebRTC handshake — the id OpenAI returns in the
 *  `Location` header. Audit correlation only; it grants nothing. */
export const setVoiceCallIdSchema = z.object({
  sessionId: z.string().uuid(),
  callId: z.string().trim().min(1).max(200),
});
export type SetVoiceCallIdInput = z.infer<typeof setVoiceCallIdSchema>;

export const endVoiceCallSchema = z.object({
  sessionId: z.string().uuid(),
});
export type EndVoiceCallInput = z.infer<typeof endVoiceCallSchema>;

/**
 * One completed exchange from the live call, as transcribed by the
 * Realtime API and relayed by the browser.
 *
 * This IS client-supplied text entering the agent's memory — accepted
 * knowingly (see 036 section C and DOMAIN_CONTRACTS §12), because the
 * server cannot capture these itself without a persistent sideband
 * connection this deployment cannot host. Two bounds make it acceptable:
 * `record_agent_turn` refuses a 'voice' turn unless that user has an
 * active call open, and every such row is stamped `source='voice'` so its
 * provenance is never ambiguous. The blast radius is a user editing
 * their OWN agent's memory.
 */
export const voiceTurnSchema = z.object({
  userMessage: z.string().trim().min(1).max(4000),
  assistantReply: z.string().trim().min(1).max(4000),
});
export type VoiceTurnInput = z.infer<typeof voiceTurnSchema>;
