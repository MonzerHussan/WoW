"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { getAccountTypeLabel } from "@/shared/constants/account-types";
import { LangToggle } from "@/shared/components/LangToggle";
import LogoutButton from "@/shared/components/LogoutButton";
import { Logo } from "@/shared/components/Logo";
import { PointsCard } from "./PointsCard";
import { BadgesList } from "./BadgesList";

interface DashboardProfile {
  full_name: string | null;
  account_type: string;
  points: number;
  level: number;
}

/**
 * The interactive half of /dashboard (035) — DashboardView (server)
 * fetches and redirects, this owns useLang(initialLang)/LangToggle and
 * renders. Same "thin server page + client view" split already used by
 * the lesson player.
 */
export function DashboardContent({
  profile,
  badges,
  initialLang,
}: {
  profile: DashboardProfile | null;
  badges: any[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);
  const acc = profile ? getAccountTypeLabel(profile.account_type as any, lang) : null;

  return (
    <main dir={dir} className="min-h-screen px-5 py-10 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="text-ink-soft text-sm">| {t("dashboard.title")}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/courses" className="text-sm font-bold text-ink-soft hover:text-navy">
            {t("lms.catalogTitle")}
          </Link>
          <Link href="/profile" className="text-sm font-bold text-ink-soft hover:text-navy">
            {t("profile.title")}
          </Link>
          <LangToggle lang={lang} onChange={setLang} />
          <LogoutButton label={t("auth.logout")} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="md:col-span-2 bg-white border border-line rounded-wow p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{acc?.icon}</span>
            <h1 className="font-display font-black text-xl text-navy">
              {t("dashboard.greeting")} {profile?.full_name || ""} 👋
            </h1>
          </div>
          <p className="text-ink-soft text-sm">
            {t("dashboard.accountTypeLabel")} <span className="font-bold text-navy">{acc?.label}</span>
          </p>

          <PointsCard points={profile?.points ?? 0} level={profile?.level ?? 1} lang={lang} />
        </div>

        <BadgesList badges={(badges as any) || []} lang={lang} />
      </div>
    </main>
  );
}
