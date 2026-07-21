import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getProfileOverview } from "@/features/profile/services/profile.service";
import { ProfileView } from "@/features/profile/components/ProfileView";

export default async function ProfilePage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectedFrom=/profile");

  const overview = await getProfileOverview(supabase, user.id);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-4xl mx-auto">
      <ProfileView userId={user.id} overview={overview} lang="ar" />
    </main>
  );
}
