"use client";

import { ReactElement, cloneElement, isValidElement } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { ProfileOverview } from "@/features/profile/services/profile.service";
import { DnaAxesPanel } from "@/features/profile/components/DnaAxesPanel";
import { SkillsList } from "@/features/profile/components/SkillsList";
import { CertificatesList } from "@/features/profile/components/CertificatesList";
import { ScoreCard } from "@/features/profile/components/ScoreCard";
import { CapabilitiesPanel } from "@/features/profile/components/CapabilitiesPanel";
import { AgentRecommendationsPanel } from "@/features/profile/components/AgentRecommendationsPanel";
import { WalletPanel } from "@/features/profile/components/WalletPanel";

/**
 * Now the single owner of /profile's language state (035) — was a plain
 * function receiving a static `lang` prop with no way to change it
 * (TECH_DEBT #13's own description: "a user can't switch language while
 * on /profile at all"). WalletPanel and ActivateCapabilityButton no
 * longer run their own independent useLang() instances; both now follow
 * this one, closing the "WalletPanel does, everything else doesn't"
 * inconsistency as a direct consequence rather than a separate fix.
 *
 * `placementSlot` is still built once at the page level in
 * app/profile/page.tsx (PlacementChat, features/agent) — same reason as
 * before, avoiding a sibling feature import (features/profile →
 * features/agent). A render-prop function was tried first and rejected
 * by Next.js at runtime: a Server Component cannot pass a plain function
 * to a Client Component prop ("Functions cannot be passed directly to
 * Client Components..."), which 500'd this whole page. `cloneElement`
 * gets the same live reactivity without crossing that boundary: the
 * element itself (serializable) is passed once, and `lang` is
 * overridden on it every render — same component type/key, so
 * PlacementChat is never remounted (its own open/messages state
 * survives a toggle) while still re-rendering with the current
 * language. Closes the gap this comment used to describe (the placement
 * card staying Arabic regardless of the toggle).
 */
export function ProfileView({
  userId,
  overview,
  initialLang,
  placementSlot,
  purchaseEnabled,
}: {
  userId: string;
  overview: ProfileOverview;
  initialLang: Lang;
  /** Server-resolved WALLET_SIMULATION_ENABLED — the route refuses
   *  regardless; this only decides what the panel offers. */
  purchaseEnabled: boolean;
  /** Composed at the page level (features/agent's PlacementChat) —
   *  same slot pattern as the dashboard's assistantSlot, avoiding a
   *  sibling feature import (features/profile → features/agent). Its
   *  `lang` prop is overridden live via cloneElement below. */
  placementSlot?: ReactElement<{ lang: Lang }>;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    // dir set here, not just on the server page's outer <main>: this is
    // the only element in the tree whose direction actually needs to
    // react to an in-page toggle click — the page-level <main> is
    // server-rendered once from initialLang and doesn't re-render.
    <div dir={dir} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-black text-2xl text-navy">{t("profile.title")}</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>

      {placementSlot && isValidElement(placementSlot) && cloneElement(placementSlot, { lang })}

      <DnaAxesPanel dna={overview.dna} lang={lang} />

      <div className="grid sm:grid-cols-2 gap-5">
        <ScoreCard title={t("profile.employabilityTitle")} score={overview.employability} lang={lang} />
        <ScoreCard title={t("profile.trustTitle")} score={overview.trust} lang={lang} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <SkillsList skills={overview.skills} lang={lang} />
        <CertificatesList certificates={overview.certificates} lang={lang} />
      </div>

      <CapabilitiesPanel userId={userId} activeCapabilities={overview.activeCapabilities} lang={lang} />

      <WalletPanel
        balance={overview.walletBalance}
        packages={overview.coinPackages}
        purchaseEnabled={purchaseEnabled}
        lang={lang}
      />

      <AgentRecommendationsPanel
        agentChosenName={overview.agentChosenName}
        recommendations={overview.recentRecommendations}
        lang={lang}
      />
    </div>
  );
}
