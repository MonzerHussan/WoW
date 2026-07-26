import { ReactNode } from "react";
import { t } from "@/shared/i18n/translations";
import { ProfileOverview } from "@/features/profile/services/profile.service";
import { DnaAxesPanel } from "@/features/profile/components/DnaAxesPanel";
import { SkillsList } from "@/features/profile/components/SkillsList";
import { CertificatesList } from "@/features/profile/components/CertificatesList";
import { ScoreCard } from "@/features/profile/components/ScoreCard";
import { CapabilitiesPanel } from "@/features/profile/components/CapabilitiesPanel";
import { AgentRecommendationsPanel } from "@/features/profile/components/AgentRecommendationsPanel";
import { WalletPanel } from "@/features/profile/components/WalletPanel";

export function ProfileView({
  userId,
  overview,
  lang = "ar" as const,
  placementSlot,
}: {
  userId: string;
  overview: ProfileOverview;
  lang?: "ar" | "en";
  /** Composed at the page level (features/agent's PlacementChat) —
   *  same slot pattern as the dashboard's assistantSlot, avoiding a
   *  sibling feature import (features/profile → features/agent). */
  placementSlot?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display font-black text-2xl text-navy">{t("profile.title", lang)}</h1>

      {placementSlot}

      <DnaAxesPanel dna={overview.dna} lang={lang} />

      <div className="grid sm:grid-cols-2 gap-5">
        <ScoreCard title={t("profile.employabilityTitle", lang)} score={overview.employability} lang={lang} />
        <ScoreCard title={t("profile.trustTitle", lang)} score={overview.trust} lang={lang} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <SkillsList skills={overview.skills} lang={lang} />
        <CertificatesList certificates={overview.certificates} lang={lang} />
      </div>

      <CapabilitiesPanel userId={userId} activeCapabilities={overview.activeCapabilities} lang={lang} />

      <WalletPanel balance={overview.walletBalance} packages={overview.coinPackages} />

      <AgentRecommendationsPanel
        agentChosenName={overview.agentChosenName}
        recommendations={overview.recentRecommendations}
        lang={lang}
      />
    </div>
  );
}
