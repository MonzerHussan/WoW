# SECURITY.md

## Fixed during this audit

### 🔴 CRITICAL — Client-controlled point awarding
**File:** `app/api/points/award/route.ts`
**Was:** The route accepted `{ amount, reason }` from the request body and
awarded `amount` directly. Any authenticated user could `curl` this endpoint
with `{ "amount": 999999 }` and grant themselves unlimited points/levels/badges.
**Fixed:** The route now accepts only `{ reason }`, and the point value is
looked up server-side from a fixed `REASON_POINTS` map. A client can never
dictate how many points an action is worth.
**Residual risk:** Nothing currently *calls* this endpoint at the real
moment of completing a lesson/quiz (that UI doesn't exist yet — LMS is
Sprint 2). When it's wired up, the caller must itself verify the lesson was
actually completed server-side — never a plain client button firing
directly at this route without server-side proof of completion.

## Fixed in Sprint 1.5

| Area | Was | Now |
|---|---|---|
| `app/api/nova` rate limiting | None — cost-blowout risk. | Per-user sliding window (20 msgs / 10 min) via `shared/lib/rate-limit.ts`, returns 429 + `Retry-After`. **Known limitation (documented in the file):** in-memory, so per-instance on serverless — must move to a shared store (Upstash Redis) before real public traffic (Sprint 3). |
| `app/api/nova` input trust | Client `history` spliced into OpenAI messages with TS types only (no runtime check). | zod-validated (`shared/schemas/nova.schema.ts`): role enum enforced, message ≤ 2000 chars, history capped at 20 entries × 4000 chars. |
| `app/api/nova` resilience | No timeout, no retry, provider errors could hang the request. | 15s AbortController timeout, single retry on transient failure, generic error message to client (no provider internals leaked), structured logging on every failure path. |
| All API routes validation | Ad hoc checks (`Number(body?.amount)` style). | zod schemas per route under `shared/schemas/`, parsed at the top of every handler; malformed JSON handled explicitly (400, not a crash). |
| Forms validation | Empty-field checks only; real validation deferred to Supabase error messages. | Same zod schemas now run client-side in `SignUpForm`/`LoginForm`/`OnboardingWizard` before any network call. |
| Audit logging | None. | `auditLog()` hook (`shared/lib/logger.ts`) now fires on every points award; ready to extend to role changes/admin actions. Currently logs to stdout — writing to an `audit_log` table is a later-sprint upgrade. |

## Open findings (flagged for Sprint 9, or earlier on request)

| Severity | Area | Finding | Recommendation |
|---|---|---|---|
| High | `shared/lib/rate-limit.ts` | In-memory limiter is per-serverless-instance, so the effective global limit is limit × instances. | Replace with Upstash Redis (or similar shared store) before Sprint 3 exposes Nova to real traffic. |
| Medium | RLS | `profiles` has SELECT/UPDATE policies for the owner, but no explicit comment documenting that INSERT is intentionally left to the `SECURITY DEFINER` trigger only. | Documented in migration 002; keep this comment so a future contributor doesn't "fix" this by adding a public INSERT policy. |
| Low | Headers | ~~No custom security headers.~~ **Partially fixed in Sprint 1.5:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` now set globally in `next.config.js`. | Remaining: a strict Content-Security-Policy, deferred to Sprint 9 because it needs testing against Google Fonts + Supabase before enforcement. |
| Low | Env vars | `.env.local.example` exists and `.gitignore` correctly excludes `.env.local`. No server-only secret is exposed to the client — `OPENAI_API_KEY` is only read inside a Route Handler. | No action needed now; keep enforcing "no `NEXT_PUBLIC_` prefix on secrets" as a review rule. |
| Low | CSRF | Supabase's SSR cookie helper defaults to `SameSite=Lax`, which mitigates classic CSRF for the auth cookie. Current API routes are same-origin `fetch` calls reading that same cookie. | Revisit if any route ever accepts state-changing requests from a different origin (e.g. a future public API or webhook). |

## Not currently applicable
- **SQL injection:** not a risk today — every query goes through the
  Supabase query builder (parameterized); no raw SQL string interpolation
  exists anywhere in the codebase.
- **XSS:** no `dangerouslySetInnerHTML` or raw HTML injection exists
  anywhere currently. If Nova's replies are ever rendered as HTML/Markdown
  in the future, sanitize before rendering.
