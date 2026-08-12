import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getDnaAndScores, getCapabilitiesAndWallet } from "@/features/profile/services/profile.service";
import { getAppShellData } from "@/shared/services/app-shell.service";
import { DashboardContent } from "./DashboardContent";

/**
 * Thin server wrapper (035 pattern): fetches data and redirects
 * server-side, then hands off to DashboardContent (client) for
 * useLang/LangToggle and rendering.
 *
 * Now served at /profile (second navigation-restructuring round) — "the
 * dashboard" and "your profile" turned out to be the same screen, just
 * accessed through the wrong nav slot; the owner's own instruction was
 * "Profile = the current dashboard content, only the entry point
 * changed." /dashboard now redirects here rather than the reverse.
 * DNA summary + score indicators were this screen's original spec;
 * capabilities/coin-purchase/avatar stayed/landed here for the same
 * reason as before — no other of the 8 screens claims them.
 */
export async function DashboardView() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, account_type, onboarding_completed, avatar_url")
    .eq("id", user!.id)
    .single();

  if (profile && !profile.onboarding_completed) {
    redirect(`/onboarding?type=${profile.account_type}`);
  }

  const [dnaAndScores, shellData, capabilitiesAndWallet] = await Promise.all([
    getDnaAndScores(supabase, user!.id),
    getAppShellData(supabase, user!.id),
    getCapabilitiesAndWallet(supabase, user!.id),
  ]);

  return (
    <DashboardContent
      userId={user!.id}
      profile={profile}
      dna={dnaAndScores.dna}
      employability={dnaAndScores.employability}
      trust={dnaAndScores.trust}
      walletBalance={shellData.walletBalance}
      agentChosenName={shellData.agentChosenName}
      activeCapabilities={capabilitiesAndWallet.activeCapabilities}
      coinPackages={capabilitiesAndWallet.coinPackages}
      purchaseEnabled={process.env.WALLET_SIMULATION_ENABLED === "true"}
      initialLang={getServerLang()}
    />
  );
}
