import { TranslationKey } from "@/shared/i18n/translations";
import { GameKey } from "@/shared/schemas/game.schema";

export const GAME_DEFS: Record<GameKey, { titleKey: TranslationKey; descKey: TranslationKey; badgeNameKey: TranslationKey }> = {
  charter_builder: {
    titleKey: "games.charterBuilderTitle",
    descKey: "games.charterBuilderDesc",
    badgeNameKey: "games.charterBuilderBadgeName",
  },
  stakeholder_detective: {
    titleKey: "games.stakeholderDetectiveTitle",
    descKey: "games.stakeholderDetectiveDesc",
    badgeNameKey: "games.stakeholderDetectiveBadgeName",
  },
  project_vs_operations_race: {
    titleKey: "games.spotterTitle",
    descKey: "games.spotterDesc",
    badgeNameKey: "games.spotterBadgeName",
  },
  assumptions_constraints: {
    titleKey: "games.assumptionsConstraintsTitle",
    descKey: "games.assumptionsConstraintsDesc",
    badgeNameKey: "games.assumptionsConstraintsBadgeName",
  },
  strategy_alignment: {
    titleKey: "games.strategyAlignmentTitle",
    descKey: "games.strategyAlignmentDesc",
    badgeNameKey: "games.strategyAlignmentBadgeName",
  },
};

/** The badges table stores one English `name` per row (no {ar,en} shape) —
 *  this maps the five game badges' stored names back to a translated
 *  display label. Any other, non-game badge simply falls back to its raw
 *  stored name (handled by the caller), which is the correct behavior
 *  for badge types this feature doesn't know about. */
export const BADGE_NAME_TO_KEY: Record<string, TranslationKey> = {
  "Charter Master": "games.charterBuilderBadgeName",
  "Stakeholder Analyst": "games.stakeholderDetectiveBadgeName",
  "Project Spotter": "games.spotterBadgeName",
  "Critical Thinker": "games.assumptionsConstraintsBadgeName",
  "Strategy Aligner": "games.strategyAlignmentBadgeName",
};

export const GAME_KEY_ORDER: GameKey[] = [
  "charter_builder",
  "stakeholder_detective",
  "project_vs_operations_race",
  "assumptions_constraints",
  "strategy_alignment",
];
