"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/shared/lib/supabase/client";

export default function LogoutButton({ label = "تسجيل الخروج" }: { label?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-bold text-orange-dark hover:underline"
    >
      {label}
    </button>
  );
}
