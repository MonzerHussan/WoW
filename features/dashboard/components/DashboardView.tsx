import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { DashboardContent } from "./DashboardContent";

/**
 * This view used to take an `assistantSlot` holding a fixed AgentChat
 * card (the cross-feature composition pattern still used by
 * ProfileView's `placementSlot`). The prop was removed with the card
 * itself when the floating agent replaced it — an optional prop nobody
 * passes is just drift. Re-adding it is a two-line change if the
 * dashboard ever needs to host an in-page panel again.
 *
 * Thin server wrapper (035): fetches data and redirects server-side,
 * then hands off to DashboardContent (client) for useLang/LangToggle
 * and rendering — same split already used by the lesson player.
 */
export async function DashboardView() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Independent reads — run in parallel (PERFORMANCE.md, Sprint 1 audit).
  const [{ data: profile }, { data: badges }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, account_type, points, level, onboarding_completed")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("user_badges")
      .select("earned_at, badges(name, icon)")
      .eq("user_id", user!.id)
      .order("earned_at", { ascending: false }),
  ]);

  if (profile && !profile.onboarding_completed) {
    redirect(`/onboarding?type=${profile.account_type}`);
  }

  return <DashboardContent profile={profile} badges={(badges as any) || []} initialLang={getServerLang()} />;
}
