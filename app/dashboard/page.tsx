import { redirect } from "next/navigation";

/**
 * Retired in favor of /profile (second navigation-restructuring round):
 * "Dashboard" and "Profile" turned out to be the same screen — Profile
 * is now the real, always-present nav tab. This redirect exists only so
 * any old bookmark/link/router.push("/dashboard") still lands somewhere
 * real.
 */
export default function DashboardPage() {
  redirect("/profile");
}
