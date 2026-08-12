"use client";

import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { GameShell } from "@/features/games/components/GameShell";
import { GameField } from "@/features/games/components/GameField";
import { GAME_DEFS, GAME_KEY_ORDER, BADGE_NAME_TO_KEY } from "@/features/games/constants";
import { EarnedBadge, Certificate } from "@/features/games/services/game.service";

/**
 * The "screen the coach and companion can also see" from v3 decision 2:
 * full project context is already the rest of this workspace (Overview/
 * Business Case/Charter/Decision Log tabs) — this tab adds the two
 * pieces v3 asked for specifically (badges, certificates) plus entry
 * points into the project-variant games. No quiz lock anywhere here —
 * access is login + owning this project, already enforced by the page
 * this tab lives on (037's RLS-scoped 404).
 *
 * The "companion" (Nova) already has profile-context access and needs
 * no new work here (v3). Human coach access is intentionally NOT wired
 * here — it's `#coach-marketplace` (ROADMAP.md §6), a documented
 * backlog item, not this migration's scope. The existing "Projects:
 * owner reads" policy (037) is a separate, independently named policy
 * from any future "Projects: coach reads" one — nothing here needs to
 * change to add that later.
 *
 * Owner-reversed (042, navigation-restructuring batch item 9): the
 * generic-variant section below used to take a `gamesUnlocked` prop
 * gating it on a passed Level 1 final quiz (038-040) — that requirement
 * was deliberately removed by explicit owner decision, not a bug. See
 * 042's migration header and DOMAIN_CONTRACTS.md for the full record.
 */
export function ProjectGamesPanel({
  projectId,
  projectName,
  lang,
  badges,
  certificates,
}: {
  projectId: string;
  projectName: string;
  lang: Lang;
  badges: EarnedBadge[];
  certificates: Certificate[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-bold text-ink mb-2">{t("games.badgesTitle", lang)}</h3>
        {badges.length === 0 ? (
          <EmptyState message={t("games.noBadgesYet", lang)} icon="🏅" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <Card key={b.badge_id} className="px-3 py-2 flex items-center gap-2">
                <span>{b.icon || "🏅"}</span>
                <span className="text-xs font-bold text-ink">
                  {BADGE_NAME_TO_KEY[b.name] ? t(BADGE_NAME_TO_KEY[b.name], lang) : b.name}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {certificates.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-ink mb-2">{t("games.certificatesTitle", lang)}</h3>
          <div className="flex flex-col gap-2">
            {certificates.map((c) => (
              <Card key={c.id} className="px-3 py-2 text-xs text-ink-soft">
                {c.course_title} — {c.certificate_no}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">{t("games.projectVariantSectionTitle", lang)}</h3>
        <div className="flex flex-col gap-4">
          {GAME_KEY_ORDER.map((gameKey) => {
            const def = GAME_DEFS[gameKey];
            const hintKey =
              gameKey === "charter_builder"
                ? ("games.charterBuilderProjectHint" as const)
                : gameKey === "strategy_alignment"
                ? ("games.strategyAlignmentProjectHint" as const)
                : undefined;
            return (
              <GameShell
                key={gameKey}
                gameKey={gameKey}
                variant="project"
                lang={lang}
                projectId={projectId}
                titleKey={def.titleKey}
                descKey={def.descKey}
                badgeNameKey={def.badgeNameKey}
                hintKey={hintKey}
                renderField={({ scenarioId, submitting, onSubmit }) => (
                  <GameField
                    gameKey={gameKey}
                    variant="project"
                    scenarioId={scenarioId}
                    projectName={projectName}
                    lang={lang}
                    submitting={submitting}
                    onSubmit={onSubmit}
                  />
                )}
              />
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">{t("games.genericVariantSectionTitle", lang)}</h3>
        <div className="flex flex-col gap-4">
          {GAME_KEY_ORDER.map((gameKey) => {
            const def = GAME_DEFS[gameKey];
            return (
              <GameShell
                key={gameKey}
                gameKey={gameKey}
                variant="generic"
                lang={lang}
                titleKey={def.titleKey}
                descKey={def.descKey}
                badgeNameKey={def.badgeNameKey}
                renderField={({ scenarioId, submitting, onSubmit }) => (
                  <GameField
                    gameKey={gameKey}
                    variant="generic"
                    scenarioId={scenarioId}
                    lang={lang}
                    submitting={submitting}
                    onSubmit={onSubmit}
                  />
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
