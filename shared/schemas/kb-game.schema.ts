import { z } from "zod";

/** Registry of Level 2+ Knowledge-Base-scored games — mirrors
 *  kb_rule_scopes (046). Widen this alongside a new kb_rule_scopes row,
 *  never independently — the two must always agree. */
export const KB_RULE_SCOPES = ["level2_resource_optimizer", "level2_evm_simulator", "level2_burndown_reader", "level2_final_boss"] as const;
export type KbRuleScope = (typeof KB_RULE_SCOPES)[number];

export const kbStartAttemptSchema = z.object({
  ruleScope: z.enum(KB_RULE_SCOPES),
});

/** One entry per task in the drawn scenario — kb_score_decisions (046)
 *  scores an unrecognized taskKey/choiceKey pair as 0 rather than
 *  erroring, so this only guards against obviously malformed payloads. */
export const resourceOptimizerAssignmentsSchema = z.object({
  assignments: z
    .array(
      z.object({
        taskKey: z.string().min(1).max(60),
        choiceKey: z.string().min(1).max(60),
      })
    )
    .min(1)
    .max(10),
});

export const evmSimulatorSubmissionSchema = z.object({
  cpi: z.number().min(0).max(10),
  spi: z.number().min(0).max(10),
  responseKey: z.string().min(1).max(60),
});
