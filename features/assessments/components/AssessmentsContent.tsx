"use client";

import { ReactElement, cloneElement, isValidElement } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { AppShell } from "@/shared/components/AppShell";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { SkillsList } from "@/features/profile/components/SkillsList";
import { CertificatesList } from "@/features/profile/components/CertificatesList";
import { GameBadgesList, ProfileGameBadge } from "@/features/profile/components/GameBadgesList";
import { SkillRow, CertificateRow } from "@/features/profile/services/profile.service";
import { PlacementResult } from "@/features/agent/services/agent.service";
import { QuizHistoryRow } from "@/features/lms/services/quiz.service";

/**
 * This page's own real composition point (same role CourseDetailPageContent
 * plays for /courses/[id]) — owns the one useLang()/LangToggle, imports
 * across features/profile and features/lms directly. `placementSlot`
 * (features/agent's PlacementChat) stays a cloneElement slot rather than a
 * direct import, matching ProfileView's own existing precedent, since it
 * needs live client interactivity of its own.
 */
export function AssessmentsContent({
  placementResult,
  quizHistory,
  skills,
  certificates,
  gameBadges,
  walletBalance,
  agentChosenName,
  initialLang,
  placementSlot,
}: {
  placementResult: PlacementResult | null;
  quizHistory: QuizHistoryRow[];
  skills: SkillRow[];
  certificates: CertificateRow[];
  gameBadges: ProfileGameBadge[];
  walletBalance: number;
  agentChosenName: string;
  initialLang: Lang;
  placementSlot?: ReactElement<{ lang: Lang }>;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <AppShell active="assessments" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
      <main className="min-h-screen px-5 py-10 max-w-3xl mx-auto flex flex-col gap-5">
        <h1 className="font-display font-black text-2xl text-navy">{t("assessments.title")}</h1>

        {placementSlot && isValidElement(placementSlot) && cloneElement(placementSlot, { lang })}

        <Card className="p-5">
          <h3 className="font-display font-bold text-navy text-sm mb-3">{t("assessments.placementTitle")}</h3>
          {!placementResult ? (
            <EmptyState message={t("assessments.placementNotDone")} icon="🗣️" />
          ) : (
            <div className="text-sm">
              <p className="text-ink">
                <span className="font-bold">{t("assessments.placementLevel")}:</span> {placementResult.englishLevel}
              </p>
              <p className="text-ink-soft mt-1">{placementResult.summary}</p>
              <p className="text-xs text-ink-soft mt-2">{new Date(placementResult.placedAt).toLocaleDateString(lang)}</p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-navy text-sm mb-3">{t("assessments.quizHistoryTitle")}</h3>
          {quizHistory.length === 0 ? (
            <EmptyState message={t("assessments.quizHistoryEmpty")} icon="📝" />
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {quizHistory.map((q) => (
                <div key={q.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-ink">{q.quizTitle}</p>
                    <p className="text-xs text-ink-soft">{new Date(q.submittedAt).toLocaleDateString(lang)}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-navy tabular-nums">{q.score ?? "—"}</p>
                    <p className="text-xs text-ink-soft">
                      {q.pendingReview
                        ? t("assessments.quizPendingReview")
                        : q.passed
                        ? t("assessments.quizPassedLabel")
                        : t("assessments.quizFailedLabel")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid sm:grid-cols-2 gap-5">
          <SkillsList skills={skills} lang={lang} />
          <CertificatesList certificates={certificates} lang={lang} />
        </div>

        <GameBadgesList badges={gameBadges} lang={lang} />
      </main>
    </AppShell>
  );
}
