"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { AssessorQueue } from "@/features/lms/components/AssessorQueue";
import { PendingAttempt } from "@/features/lms/services/quiz.service";

/**
 * TECH_DEBT #27 (light group) — only the page shell (Logo/title/toggle)
 * gets a real initialLang + working LangToggle; AssessorQueue keeps its
 * own independent useLang("ar") unchanged. A toggle click here corrects
 * this shell instantly but AssessorQueue only catches up on its own
 * mount-time cookie read — same accepted gap as TECH_DEBT #18, not a new
 * one.
 */
export function AssessorQueuePageContent({
  initialAttempts,
  initialLang,
}: {
  initialAttempts: PendingAttempt[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("lms.assessorQueueTitle")}</h1>
      <AssessorQueue initialAttempts={initialAttempts} />
    </div>
  );
}
