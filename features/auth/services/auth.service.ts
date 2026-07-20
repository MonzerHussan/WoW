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
