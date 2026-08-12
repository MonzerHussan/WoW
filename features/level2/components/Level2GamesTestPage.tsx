"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { Logo } from "@/shared/components/Logo";
import { LangToggle } from "@/shared/components/LangToggle";
import { t } from "@/shared/i18n/translations";
import { ResourceOptimizerGame } from "@/features/level2/components/ResourceOptimizerGame";
import { EvmSimulatorGame } from "@/features/level2/components/EvmSimulatorGame";
import { LessonReflectionForm } from "@/features/level2/components/LessonReflectionForm";
import { WbsBuilder } from "@/features/level2/components/WbsBuilder";
import { RiskRegisterBuilder } from "@/features/level2/components/RiskRegisterBuilder";
import { BurndownReaderGame } from "@/features/level2/components/BurndownReaderGame";
import { FinalBossGame } from "@/features/level2/components/FinalBossGame";

/**
 * Temporary standalone host for live-testing Level 2 pieces as they're
 * built (the two approved games against kb_start_attempt/
 * complete_*_attempt, 046; now also LessonReflectionForm against a real
 * project's decision_log). NOT wired into AppShell's nav — Level 2's
 * actual course structure (Units 0-7, Final Boss) is separate, not-yet-
 * built work. Replace this page once that structure exists; do not treat
 * its presence here as "Level 2 is live."
 */
export function Level2GamesTestPage({
  initialLang,
  testProjectId,
  testProjectName,
}: {
  initialLang: Lang;
  testProjectId: string | null;
  testProjectName: string | null;
}) {
  const { lang, setLang, dir } = useLang(initialLang);

  return (
    <main dir={dir} className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-7" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy mb-1">{t("level2.hubTitle", lang)}</h1>
      <p className="text-sm text-ink-soft mb-6">{t("level2.hubIntro", lang)}</p>

      <div className="flex flex-col gap-5">
        <ResourceOptimizerGame lang={lang} />
        <EvmSimulatorGame lang={lang} />
        <BurndownReaderGame lang={lang} />
        <FinalBossGame lang={lang} />
        {testProjectId && testProjectName && <WbsBuilder projectId={testProjectId} projectName={testProjectName} lang={lang} />}
        {testProjectId && <RiskRegisterBuilder projectId={testProjectId} lang={lang} />}
        {testProjectId && (
          <LessonReflectionForm
            projectId={testProjectId}
            promptAr="ليه قسّمت النطاق بالشكل ده؟"
            promptEn="Why did you break down scope this way?"
            sourceKey="unit1_lesson_1_1_wbs_reflection"
            lang={lang}
          />
        )}
      </div>
    </main>
  );
}
