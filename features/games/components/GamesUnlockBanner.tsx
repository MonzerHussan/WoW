"use client";

import Link from "next/link";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card } from "@/shared/components/Feedback";

/**
 * Course-page counterpart to LivingProjectBanner (037) — but for the
 * generic variant only. Shown either way (locked/unlocked) rather than
 * hidden pre-unlock, same "always visible" spirit, so a trainee knows
 * the games exist before they've earned them. The project variant needs
 * no banner or unlock messaging at all — it lives permanently in
 * /project/[id] regardless of quiz status (v3 decision 2).
 */
export function GamesUnlockBanner({ lang, unlocked }: { lang: Lang; unlocked: boolean }) {
  return (
    <Card className="p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        <p className="font-display font-bold text-navy text-sm mb-1">
          {t(unlocked ? "games.unlockedBannerTitle" : "games.lockedBannerTitle", lang)}
        </p>
        <p className="text-sm text-ink-soft">{t(unlocked ? "games.unlockedBannerBody" : "games.lockedBannerBody", lang)}</p>
      </div>
      {unlocked && (
        <Link
          href="/games"
          className="shrink-0 rounded-xl bg-navy text-white px-4 py-2 text-sm font-bold text-center hover:bg-navy-soft transition"
        >
          {t("games.viewGamesCta", lang)}
        </Link>
      )}
    </Card>
  );
}
