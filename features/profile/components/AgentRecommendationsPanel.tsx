import { t } from "@/shared/i18n/translations";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { RecommendationRow } from "@/features/profile/services/profile.service";

const DONE_STATUSES = new Set(["done", "implemented"]);
const DISMISSED_STATUSES = new Set(["rejected", "ignored", "dismissed"]);

function statusLabel(status: string, lang: "ar" | "en") {
  if (DONE_STATUSES.has(status)) return t("profile.recStatusDone", lang);
  if (DISMISSED_STATUSES.has(status)) return t("profile.recStatusDismissed", lang);
  return t("profile.recStatusPending", lang);
}

export function AgentRecommendationsPanel({
  agentChosenName,
  recommendations,
  lang = "ar" as const,
}: {
  agentChosenName: string;
  recommendations: RecommendationRow[];
  lang?: "ar" | "en";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-purple flex items-center justify-center text-white font-display font-black text-xs">
          {agentChosenName.charAt(0)}
        </div>
        <h3 className="font-display font-bold text-navy text-sm">{t("profile.agentRecsTitle", lang)}</h3>
      </div>

      {recommendations.length === 0 ? (
        <EmptyState message={t("profile.agentRecsEmpty", lang)} icon="💡" />
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {recommendations.map((rec) => (
            <div key={rec.id} className="py-2.5 flex items-start justify-between gap-3">
              <p className="text-sm text-ink">{rec.message}</p>
              <span className="text-[10px] font-bold text-ink-soft bg-bg rounded-full px-2 py-1 whitespace-nowrap">
                {statusLabel(rec.status, lang)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
