"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { getAccountTypeLabel } from "@/shared/constants/account-types";
import { AppShell } from "@/shared/components/AppShell";
import { DnaAxesPanel } from "@/features/profile/components/DnaAxesPanel";
import { ScoreCard } from "@/features/profile/components/ScoreCard";
import { CapabilitiesPanel } from "@/features/profile/components/CapabilitiesPanel";
import { WalletPanel } from "@/features/profile/components/WalletPanel";
import { AvatarUpload } from "@/features/profile/components/AvatarUpload";
import { ProfileOverview, ScoreSummary, CoinPackageRow } from "@/features/profile/services/profile.service";

interface DashboardProfile {
  full_name: string | null;
  account_type: string;
  avatar_url: string | null;
}

/**
 * Now served at /profile (second navigation-restructuring round) — see
 * DashboardView's own comment for why the URL changed but not this
 * component's name (minimizing churn; the file still lives under
 * features/dashboard on purpose, not a rename in disguise).
 */
export function DashboardContent({
  userId,
  profile,
  dna,
  employability,
  trust,
  walletBalance,
  agentChosenName,
  activeCapabilities,
  coinPackages,
  purchaseEnabled,
  initialLang,
}: {
  userId: string;
  profile: DashboardProfile | null;
  dna: ProfileOverview["dna"];
  employability: ScoreSummary | null;
  trust: ScoreSummary | null;
  walletBalance: number;
  agentChosenName: string;
  activeCapabilities: string[];
  coinPackages: CoinPackageRow[];
  purchaseEnabled: boolean;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);
  const acc = profile ? getAccountTypeLabel(profile.account_type as any, lang) : null;

  return (
    <AppShell active="profile" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
      <main className="min-h-screen px-5 py-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-1">
          <AvatarUpload userId={userId} initialAvatarUrl={profile?.avatar_url ?? null} lang={lang} />
          <div>
            <h1 className="font-display font-black text-xl text-navy">
              {t("dashboard.greeting")} {profile?.full_name || ""} 👋
            </h1>
            <p className="text-ink-soft text-sm">
              {t("dashboard.accountTypeLabel")} <span className="font-bold text-navy">{acc?.label}</span>
            </p>
          </div>
        </div>

        <div className="mt-8">
          <DnaAxesPanel dna={dna} lang={lang} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mt-5">
          <ScoreCard title={t("profile.employabilityTitle")} score={employability} lang={lang} />
          <ScoreCard title={t("profile.trustTitle")} score={trust} lang={lang} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mt-5">
          <CapabilitiesPanel userId={userId} activeCapabilities={activeCapabilities} lang={lang} />
          <WalletPanel balance={walletBalance} packages={coinPackages} purchaseEnabled={purchaseEnabled} lang={lang} />
        </div>
      </main>
    </AppShell>
  );
}
