import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { LandingPage } from "@/features/landing/components/LandingPage";

// Guests see the landing page; authenticated users go straight to /dashboard.
export default async function HomePage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}
