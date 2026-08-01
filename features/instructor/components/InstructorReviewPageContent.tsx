"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { ReviewQueue } from "@/features/instructor/components/ReviewQueue";
import { PendingReviewLesson } from "@/features/instructor/services/curriculum-contribution.service";

/**
 * TECH_DEBT #27 (light group) — only this shell (Logo/title/toggle) gets
 * a real initialLang + working LangToggle; ReviewQueue keeps its own
 * independent useLang("ar"), same accepted gap as #18.
 */
export function InstructorReviewPageContent({
  lessons,
  canFinalize,
  canPeerVote,
  initialLang,
}: {
  lessons: PendingReviewLesson[];
  canFinalize: boolean;
  canPeerVote: boolean;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy mb-2">{t("instructor.reviewQueueTitle")}</h1>
      {canFinalize && <p className="text-sm text-ink-soft mb-6">{t("instructor.finalizerHint")}</p>}
      <ReviewQueue initialLessons={lessons} canFinalize={canFinalize} canPeerVote={canPeerVote} />
    </div>
  );
}
