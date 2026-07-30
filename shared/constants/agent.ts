/**
 * How many past agent_messages rows are used both for the OpenAI
 * context window and for the client's "restore history on load" read.
 * One number for both (033) — the deliberate cost/speed tradeoff: any
 * memory older than roughly the last ~10 exchanges is sacrificed so the
 * prompt (and the request) stays bounded regardless of how long a
 * user's conversation has run.
 */
export const AGENT_CONTEXT_WINDOW = 20;
