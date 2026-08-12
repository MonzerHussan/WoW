import { z } from "zod";

/**
 * Mirrors content_drafts.target_table's CHECK constraint (062).
 * pricing_units is deliberately absent — RBAC.md:66-73 already reserves
 * pricing edits to finance.edit_rates via the existing /admin/pricing
 * screen (024); content.manage was considered and rejected for it.
 */
export const CONTENT_DRAFT_TARGET_TABLES = ["kb_scenarios", "kb_scoring_rules", "badges"] as const;
export type ContentDraftTargetTable = (typeof CONTENT_DRAFT_TARGET_TABLES)[number];

export const kbScenarioPayloadSchema = z.object({
  rule_scope: z.string().min(1),
  scenario_key: z.string().min(1),
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  body: z.object({
    context_ar: z.string().min(1),
    context_en: z.string().min(1),
    choices: z
      .array(
        z.object({
          key: z.string().min(1),
          label_ar: z.string().min(1),
          label_en: z.string().min(1),
        })
      )
      .min(2),
  }),
  is_active: z.boolean().optional(),
});

export const kbScoringRulePayloadSchema = z.object({
  rule_scope: z.string().min(1),
  scenario_key: z.string().min(1),
  decision_key: z.string().min(1),
  score: z.number().min(0).max(100),
  feedback_ar: z.string().min(1),
  feedback_en: z.string().min(1),
});

export const badgePayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  points_value: z.number().int().min(0).optional(),
});

const payloadSchemaByTable: Record<ContentDraftTargetTable, z.ZodTypeAny> = {
  kb_scenarios: kbScenarioPayloadSchema,
  kb_scoring_rules: kbScoringRulePayloadSchema,
  badges: badgePayloadSchema,
};

/** Validates a draft's payload against the shape its target_table expects — call after the envelope schema below has already confirmed targetTable is one of the known values. */
export function validateContentDraftPayload(targetTable: ContentDraftTargetTable, payload: unknown) {
  return payloadSchemaByTable[targetTable].safeParse(payload);
}

/** Envelope for creating an upsert draft — payload shape is checked separately via validateContentDraftPayload, since it depends on targetTable. */
export const createContentDraftUpsertSchema = z.object({
  targetTable: z.enum(CONTENT_DRAFT_TARGET_TABLES),
  targetId: z.string().uuid().nullable(),
  action: z.literal("upsert"),
  payload: z.record(z.unknown()),
});

/** Envelope for creating a delete draft — no payload shape to check, but targetId is required (can't delete a not-yet-created row). */
export const createContentDraftDeleteSchema = z.object({
  targetTable: z.enum(CONTENT_DRAFT_TARGET_TABLES),
  targetId: z.string().uuid(),
  action: z.literal("delete"),
});

export const createContentDraftSchema = z.discriminatedUnion("action", [
  createContentDraftUpsertSchema,
  createContentDraftDeleteSchema,
]);

export type CreateContentDraftRequest = z.infer<typeof createContentDraftSchema>;

export const publishContentDraftSchema = z.object({
  draftId: z.string().uuid(),
});

export const saveLessonDraftSchema = z.object({
  lessonId: z.string().uuid(),
  content: z.record(z.unknown()),
});

export const publishLessonDraftSchema = z.object({
  lessonId: z.string().uuid(),
});
