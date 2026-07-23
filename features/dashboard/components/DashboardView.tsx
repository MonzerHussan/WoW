import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getAccountTypeLabel } from "@/shared/constants/account-types";
import { t } from "@/shared/i18n/translations";
import LogoutButton from "@/shared/components/LogoutButton";
import { Logo } from "@/shared/components/Logo";
import { PointsCard } from "./PointsCard";
import { BadgesList } from "./BadgesList";

/**
 * `assistantSlot` keeps this feature decoupled from features/agent —
 * cross-feature composition happens in app/dashboard/page.tsx, per the
 * import-direction rule in CODING_GUIDELINES.md.
 */
export async function DashboardView({ assistantSlot }: { assistantSlot?: ReactNode }) {
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

  const acc = profile ? getAccountTypeLabel(profile.account_type, "ar") : null;
  const lang = "ar" as const;

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="text-ink-soft text-sm">| {t("dashboard.title", lang)}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/courses" className="text-sm font-bold text-ink-soft hover:text-navy">
            {t("lms.catalogTitle", lang)}
          </Link>
          <Link href="/profile" className="text-sm font-bold text-ink-soft hover:text-navy">
            {t("profile.title", lang)}
          </Link>
          <LogoutButton label={t("auth.logout", lang)} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="md:col-span-2 bg-white border border-line rounded-wow p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{acc?.icon}</span>
            <h1 className="font-display font-black text-xl text-navy">
              {t("dashboard.greeting", lang)} {profile?.full_name || ""} 👋
            </h1>
          </div>
          <p className="text-ink-soft text-sm">
            {t("dashboard.accountTypeLabel", lang)} <span className="font-bold text-navy">{acc?.label}</span>
          </p>

          <PointsCard points={profile?.points ?? 0} level={profile?.level ?? 1} lang={lang} />
        </div>

        <BadgesList badges={(badges as any) || []} lang={lang} />
      </div>

      {assistantSlot}
    </main>
  );
}
