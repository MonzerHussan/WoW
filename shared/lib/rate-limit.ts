/**
 * In-memory sliding-window rate limiter.
 *
 * LIMITATION (documented, not hidden): this state lives in a single
 * serverless function instance's memory. On a multi-instance deployment
 * (which Vercel/most serverless hosts are), each instance has its own
 * counter, so the *effective* limit is (limit × instance count), not a
 * true global limit. This is still strictly better than no limiting at
 * all, and is a reasonable stopgap for Sprint 1.5. Before the agent (Sprint
 * 3, features/agent/) is exposed to real traffic at scale, replace this
 * with a shared store (Upstash Redis token bucket) — tracked in SECURITY.md.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}
