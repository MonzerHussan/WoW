import { dictionary } from "./dictionary";
import { Lang } from "@/shared/types";

type AuthErrorKey = keyof typeof dictionary.authErrors;

/**
 * Modern supabase-js AuthApiError carries a stable `code`
 * (https://supabase.com/docs/guides/auth/debugging/error-codes).
 * Map every code we care about to a dictionary key.
 */
const CODE_MAP: Record<string, AuthErrorKey> = {
  invalid_credentials: "invalidCredentials",
  user_already_exists: "userExists",
  email_exists: "userExists",
  phone_exists: "userExists",
  email_not_confirmed: "emailNotConfirmed",
  over_request_rate_limit: "rateLimit",
  over_email_send_rate_limit: "rateLimit",
  over_sms_send_rate_limit: "rateLimit",
  request_timeout: "network",
  weak_password: "weakPassword",
  email_address_invalid: "invalidEmail",
  validation_failed: "invalidEmail",
  signup_disabled: "signupDisabled",
  user_banned: "userBanned",
  session_expired: "sessionExpired",
  refresh_token_not_found: "sessionExpired",
  bad_oauth_callback: "oauthFailed",
  bad_oauth_state: "oauthFailed",
  oauth_provider_not_supported: "oauthFailed",
  provider_disabled: "oauthFailed",
};

/**
 * Fallback for older GoTrue responses that only carry an English message
 * (no `code`). Checked in order, first match wins.
 */
const MESSAGE_MAP: [RegExp, AuthErrorKey][] = [
  [/invalid login credentials/i, "invalidCredentials"],
  [/already (been )?registered/i, "userExists"],
  [/email not confirmed/i, "emailNotConfirmed"],
  [/rate limit|too many requests/i, "rateLimit"],
  [/password should be|weak password/i, "weakPassword"],
  [/unable to validate email|invalid email/i, "invalidEmail"],
  [/signups? (are )?(not allowed|disabled)/i, "signupDisabled"],
  [/failed to fetch|networkerror|load failed|timed? ?out/i, "network"],
];

function resolveKey(error: unknown): AuthErrorKey | null {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (!error || typeof error !== "object") return null;

  const e = error as { code?: unknown; message?: unknown; status?: unknown; name?: unknown };

  if (typeof e.code === "string" && CODE_MAP[e.code]) return CODE_MAP[e.code];

  // AuthRetryableFetchError = the request never reached GoTrue (DNS, CORS,
  // connection dropped mid-flight...) even though the browser thinks it's online.
  if (e.name === "AuthRetryableFetchError" || e.status === 0) return "network";
  if (e.status === 429) return "rateLimit";

  const message = typeof e.message === "string" ? e.message : "";
  for (const [pattern, key] of MESSAGE_MAP) {
    if (pattern.test(message)) return key;
  }
  return null;
}

/**
 * Translate any Supabase/auth failure into a friendly bilingual message.
 * The raw error goes to the console for diagnosis; the returned string is
 * the only thing that may be shown to the user (never error.message).
 */
export function translateAuthError(error: unknown, lang: Lang): string {
  console.error("[auth] raw error (user sees a translated message):", error);
  const key = resolveKey(error);
  if (key) return dictionary.authErrors[key][lang];
  return dictionary.common.somethingWentWrong[lang];
}

/** Shared connectivity check for submit handlers outside auth (e.g. the agent). */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
