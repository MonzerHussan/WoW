import { t } from "@/shared/i18n/translations";
import { Card, EmptyState } from "@/shared/components/Feedback";

/**
 * Deliberately a local, independent shape rather than importing
 * features/games' own `EarnedBadge` type — features/profile must not
 * import a sibling feature (PROJECT_STRUCTURE.md), even for a type-only
 * import. app/profile/page.tsx (which is allowed to import from any
 * feature) is the one that calls features/games' getMyBadges() and
 * shapes the result to this.
 */
export interface ProfileGameBadge {
  id: string;
  name: string;
  icon: string | null;
  earnedAt: string;
}

export function GameBadgesList({ badges, lang = "ar" as const }: { badges: ProfileGameBadge[]; lang?: "ar" | "en" }) {
  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy text-sm mb-3">{t("profile.gameBadgesTitle", lang)}</h3>
      {badges.length === 0 ? (
        <EmptyState message={t("profile.gameBadgesEmpty", lang)} icon="🏅" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
              <span>{b.icon || "🏅"}</span>
              <span className="text-xs font-bold text-ink">{b.name}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
