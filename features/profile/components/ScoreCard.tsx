import { t } from "@/shared/i18n/translations";
import { Card } from "@/shared/components/Feedback";
import { ScoreSummary } from "@/features/profile/services/profile.service";

export function ScoreCard({
  title,
  score,
  lang = "ar" as const,
}: {
  title: string;
  score: ScoreSummary | null;
  lang?: "ar" | "en";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-navy text-sm">{title}</h3>
        {score && <span className="font-display font-black text-2xl text-navy">{score.score}</span>}
      </div>

      {!score ? (
        <p className="text-sm text-ink-soft">{t("profile.scoreNotComputed", lang)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-ink-soft">{t("profile.scoreFactors", lang)}</p>
          {score.factors.map((f, i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-ink">{f.name}</span>
                <span className="text-ink-soft">{f.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg mt-1 overflow-hidden">
                <div className="h-full bg-navy rounded-full" style={{ width: `${Math.min(100, f.value)}%` }} />
              </div>
              <p className="text-ink-soft mt-1">{f.tip}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
