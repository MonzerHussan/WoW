import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";

/**
 * GET /auth/callback
 * OAuth (Google) redirect target: exchanges the auth code for a session,
 * then routes first-time users to onboarding (where they pick an account
 * type — the provider doesn't tell us) and returning users to /dashboard.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // Provider-side failure: the user cancelled Google's consent screen or the
  // provider bounced us back with an error instead of a code. Send them to
  // /login with a reason the form translates (?auth_error=cancelled|failed).
  const providerError = params.get("error");
  if (providerError) {
    console.error("[auth/callback] provider returned error:", {
      error: providerError,
      code: params.get("error_code"),
      description: params.get("error_description"),
    });
    const reason = providerError === "access_denied" ? "cancelled" : "failed";
    return NextResponse.redirect(new URL(`/login?auth_error=${reason}`, req.url));
  }

  const code = params.get("code");
  if (!code) {
    // Direct visit without an OAuth round-trip — nothing to report.
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const supabase = supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] code exchange failed:", error);
    return NextResponse.redirect(new URL("/login?auth_error=failed", req.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[auth/callback] session exchange succeeded but no user found");
    return NextResponse.redirect(new URL("/login?auth_error=failed", req.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  const destination = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(destination, req.url));
}
