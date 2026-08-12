"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { AppShell } from "@/shared/components/AppShell";
import { Card } from "@/shared/components/Feedback";
import { AgentRecommendationsPanel } from "@/features/profile/components/AgentRecommendationsPanel";
import { RecommendationRow } from "@/features/profile/services/profile.service";

/**
 * Deliberately just a shell right now (owner instruction): the screen's
 * title is the user's own chosen agent name, dynamically — never a
 * literal "رفيق"/"Companion" for every user (same rule that has governed
 * this agent since it shipped). Settings are an empty frame; the actual
 * settings surface is a separate, later decision, not invented here.
 */
export function AiAssistContent({
  agentChosenName,
  recommendations,
  walletBalance,
  initialLang,
}: {
  agentChosenName: string;
  recommendations: RecommendationRow[];
  walletBalance: number;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);
  const displayName = agentChosenName || t("nav.aiAssistFallback");

  return (
    <AppShell active="aiAssist" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
      <main className="min-h-screen px-5 py-10 max-w-2xl mx-auto flex flex-col gap-5">
        <h1 className="font-display font-black text-2xl text-navy">{displayName}</h1>

        <AgentRecommendationsPanel agentChosenName={displayName} recommendations={recommendations} lang={lang} />

        <Card className="p-5">
          <h3 className="font-display font-bold text-navy text-sm mb-3">{t("aiAssist.settingsTitle")}</h3>
          <p className="text-sm text-ink-soft">{t("aiAssist.settingsComingSoon")}</p>
        </Card>
      </main>
    </AppShell>
  );
}
