import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";

export function PointsCard({ points, level, lang = "ar" as Lang }: { points: number; level: number; lang?: Lang }) {
  const pointsToNextLevel = 100 - (points % 100);

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="bg-bg rounded-xl p-4 text-center">
          <div className="font-display font-black text-2xl text-navy">{points}</div>
          <div className="text-xs text-ink-soft mt-1">{t("dashboard.points", lang)}</div>
        </div>
        <div className="bg-bg rounded-xl p-4 text-center">
          <div className="font-display font-black text-2xl text-purple">{level}</div>
          <div className="text-xs text-ink-soft mt-1">{t("dashboard.currentLevel", lang)}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-ink-soft mb-1">
          <span>{t("dashboard.progressToNext", lang)}</span>
          <span>
            {pointsToNextLevel} {t("dashboard.pointsRemaining", lang)}
          </span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-orange to-orange-dark rounded-full"
            style={{ width: `${100 - pointsToNextLevel}%` }}
          />
        </div>
      </div>
    </>
  );
}
