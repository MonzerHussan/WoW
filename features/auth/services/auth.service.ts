import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { SignUpInput, LoginInput } from "@/shared/schemas/auth.schema";

export async function signUp(input: SignUpInput) {
  const supabase = supabaseBrowser();
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        account_type: input.accountType,
      },
    },
  });
}

export async function signIn(input: LoginInput) {
  const supabase = supabaseBrowser();
  return supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
}

/**
 * Google OAuth. The provider redirects back to /auth/callback, which
 * exchanges the code for a session and routes to onboarding or dashboard.
 * Google tells us nothing about account type — the onboarding wizard asks.
 */
export async function signInWithGoogle() {
  const supabase = supabaseBrowser();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // Always show Google's account chooser instead of silently reusing
      // the last account — lets users switch accounts.
      queryParams: { prompt: "select_account" },
    },
  });
}

export async function signOut() {
  const supabase = supabaseBrowser();
  return supabase.auth.signOut();
}

/** The path a recovery email sends the user back to. Must be present in
 *  Supabase → Authentication → URL Configuration → Redirect URLs, for
 *  every origin the app runs on, or the link in the email dead-ends. */
export const UPDATE_PASSWORD_PATH = "/update-password";

/**
 * Sends the recovery email. Returns Supabase's result unchanged, but the
 * CALLER MUST NOT branch its UI on it: `resetPasswordForEmail` succeeds
 * whether or not an account exists with that address (by design), and the
 * form deliberately shows one identical message either way. Surfacing a
 * difference here would turn this screen into an account-enumeration
 * oracle — the reason the "no account with that email" case is not
 * reported to the user at all.
 *
 * The error is still returned so genuine failures (rate limit, network,
 * SMTP misconfiguration) can be logged/translated rather than swallowed.
 */
export async function requestPasswordReset(email: string) {
  const supabase = supabaseBrowser();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${UPDATE_PASSWORD_PATH}`,
  });
}

/**
 * Called from the recovery page AFTER the link's session has been
 * established. Supabase enforces the password policy server-side and
 * refuses with `weak_password` — the caller translates that rather than
 * showing the raw English text.
 */
export async function updatePassword(password: string) {
  const supabase = supabaseBrowser();
  return supabase.auth.updateUser({ password });
}

/**
 * Recovery links arrive as `?code=...` (PKCE, what @supabase/ssr's browser
 * client issues). Exchanging it is what creates the short-lived session
 * that authorises `updateUser({password})` — without this the update has
 * no authenticated user and fails.
 *
 * A consumed or expired link fails HERE, not at update time, which is why
 * the page checks this first and can show "link expired" instead of a
 * blank form the user would fill in for nothing.
 */
export async function exchangeRecoveryCode(code: string) {
  const supabase = supabaseBrowser();
  return supabase.auth.exchangeCodeForSession(code);
}

/** Is there already a usable session? Covers the non-PKCE/implicit case
 *  where supabase-js consumed the link's hash fragment on load, so the
 *  page must not insist on a `?code=` it will never see. */
export async function getCurrentSession() {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
