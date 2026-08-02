/**
 * How many past agent_messages rows are used both for the OpenAI
 * context window and for the client's "restore history on load" read.
 * One number for both (033) — the deliberate cost/speed tradeoff: any
 * memory older than roughly the last ~10 exchanges is sacrificed so the
 * prompt (and the request) stays bounded regardless of how long a
 * user's conversation has run.
 */
export const AGENT_CONTEXT_WINDOW = 20;

/**
 * Voice calls (036).
 *
 * The MODEL is deliberately NOT here — it lives inside
 * `start_agent_call()` and comes back from the database with the session,
 * so there is exactly one source of truth and no TS/SQL constant pair to
 * drift (the sync problem 027 had to cover with a test).
 *
 * The voice is a presentation choice, not a cost control, so it lives on
 * this side. `marin` was picked after actually listening to it speak
 * unscripted Arabic on gpt-realtime-mini — the OpenAI docs only promise
 * that voices are "optimized for English", so this was verified by ear
 * rather than assumed. Changing it deserves the same test.
 */
export const AGENT_VOICE = "marin";

/** Realtime endpoints. Split out so the route reads as intent, not URLs. */
export const OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
