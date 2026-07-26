import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { Logo } from "@/shared/components/Logo";
import { getProfileOverview } from "@/features/profile/services/profile.service";
import { ProfileView } from "@/features/profile/components/ProfileView";
import { getPlacementState } from "@/features/agent/services/agent.service";
import { PlacementChat } from "@/features/agent/components/PlacementChat";

export default async function ProfilePage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectedFrom=/profile");

  const [overview, placement] = await Promise.all([
    getProfileOverview(supabase, user.id),
    getPlacementState(supabase, user.id),
  ]);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-4xl mx-auto">
      <Logo className="h-8 mb-6" />
      <ProfileView
        userId={user.id}
        overview={overview}
        lang="ar"
        placementSlot={
          <PlacementChat initialPlaced={placement.placed} initialLevel={placement.englishLevel} lang="ar" />
        }
      />
    </main>
  );
}
