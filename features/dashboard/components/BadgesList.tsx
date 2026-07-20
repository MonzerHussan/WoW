import { t } from "@/shared/i18n/translations";
import { Lang, UserBadge } from "@/shared/types";
import { EmptyState } from "@/shared/components/Feedback";

export function BadgesList({ badges, lang = "ar" as Lang }: { badges: UserBadge[]; lang?: Lang }) {
  return (
    <div className="bg-white border border-line rounded-wow p-6">
      <h3 className="font-display font-bold text-navy text-sm mb-3">{t("dashboard.myBadges", lang)}</h3>
      {badges && badges.length > 0 ? (
        <div className="flex flex-col gap-2">
          {badges.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>{b.badges?.icon}</span>
              <span className="text-ink-soft">{b.badges?.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message={t("dashboard.noBadgesYet", lang)} icon="🏅" />
      )}
    </div>
  );
}
