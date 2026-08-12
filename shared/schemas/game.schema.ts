import { z } from "zod";

export const GAME_KEYS = [
  "charter_builder",
  "stakeholder_detective",
  "project_vs_operations_race",
  "assumptions_constraints",
  "strategy_alignment",
] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export const GAME_VARIANTS = ["project", "generic"] as const;
export type GameVariant = (typeof GAME_VARIANTS)[number];

export const playGameSchema = z.object({
  gameKey: z.enum(GAME_KEYS),
  variant: z.enum(GAME_VARIANTS),
  projectId: z.string().uuid().nullable().optional(),
  scenarioId: z.string().uuid().nullable().optional(),
});
export type PlayGameInput = z.infer<typeof playGameSchema>;

/** One payload shape per game — 038's complete_game_attempt() re-validates
 *  all of this server-side; these schemas only stop obviously-malformed
 *  submissions before they leave the browser. */
export const charterBuilderPayloadSchema = z.object({
  vision: z.string().min(1).max(2000),
  objectives: z.string().min(1).max(2000),
  deliverables: z.string().min(1).max(2000),
  sponsorName: z.string().min(1).max(120),
  coreTeam: z.array(z.object({ name: z.string().min(1), role: z.string().min(1) })).min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  constraints: z.array(z.string().min(1)).min(1),
  approved: z.literal(true),
});

export const stakeholderDetectivePayloadSchema = z.object({
  stakeholders: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        quadrant: z.enum(["manage_closely", "keep_satisfied", "keep_informed", "monitor"]),
        justification: z.string().min(1).max(500),
      })
    )
    .min(3),
});

export const assumptionsConstraintsPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        category: z.enum(["assumption", "constraint", "risk"]),
      })
    )
    .min(4),
});

export const strategyAlignmentPayloadSchema = z.object({
  response: z.string().min(20).max(2000),
});

export const spotterAnswerPayloadSchema = z.object({
  answers: z.array(z.object({ statementId: z.string().uuid(), type: z.enum(["project", "operation"]) })).min(5),
});
