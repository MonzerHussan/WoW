import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { KbRuleScope } from "@/shared/schemas/kb-game.schema";

export interface KbScenario {
  id: string;
  scenarioKey: string;
  titleAr: string;
  titleEn: string;
  body: Record<string, any>;
}

export interface KbStartAttemptResult {
  allowed: boolean;
  reason?: "invalid_rule_scope" | "price_unavailable" | "insufficient_balance" | "not_enough_scenarios";
  attemptId?: string;
  scenarios?: KbScenario[];
  coinsCharged?: number;
  balance?: number;
  required?: number;
  balanceAfter?: number;
}

export interface KbDecisionItem {
  scenarioKey: string;
  decisionKey: string;
  score: number;
  feedbackAr: string | null;
  feedbackEn: string | null;
}

export interface KbCompleteResult {
  completed: boolean;
  already_completed?: boolean;
  reason?: "attempt_not_found";
  score?: number | null;
  passed?: boolean;
  result?: {
    // resource optimizer shape
    averageScore?: number;
    items?: KbDecisionItem[];
    // evm simulator shape
    cpiCorrect?: boolean;
    spiCorrect?: boolean;
    realCpi?: number;
    realSpi?: number;
    response?: { averageScore: number; items: KbDecisionItem[] };
    // final boss shape
    contentScore?: number;
    speedBonus?: number;
    elapsedSeconds?: number;
    budgetSeconds?: number;
    content?: { averageScore: number; items: KbDecisionItem[] };
  };
}

/** The only door into kb_game_attempts (046) — charges coins via the
 *  same pricing_units table every other game uses, then draws random
 *  scenario(s) for the given rule_scope. */
export async function startKbAttempt(ruleScope: KbRuleScope): Promise<KbStartAttemptResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("kb_start_attempt", { p_rule_scope: ruleScope });
  if (error) return { allowed: false };
  return data as KbStartAttemptResult;
}

/** p_assignments: [{taskKey, choiceKey}, ...] — scored server-side
 *  against kb_scoring_rules, never trusted client-side. */
export async function completeResourceOptimizerAttempt(
  attemptId: string,
  assignments: { taskKey: string; choiceKey: string }[]
): Promise<KbCompleteResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("complete_resource_optimizer_attempt", {
    p_attempt_id: attemptId,
    p_assignments: assignments,
  });
  if (error) return { completed: false };
  return data as KbCompleteResult;
}

/** cpi/spi are the learner's own computed answers — checked server-side
 *  against the scenario's real PV/EV/AC, never trusted as given. */
export async function completeEvmSimulatorAttempt(
  attemptId: string,
  cpi: number,
  spi: number,
  responseKey: string
): Promise<KbCompleteResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("complete_evm_simulator_attempt", {
    p_attempt_id: attemptId,
    p_cpi: cpi,
    p_spi: spi,
    p_response_key: responseKey,
  });
  if (error) return { completed: false };
  return data as KbCompleteResult;
}

/** p_answers: [{questionKey, answerKey}, ...] — scored server-side
 *  against kb_scoring_rules, same shape as Resource Optimizer's
 *  assignments. */
export async function completeBurndownReaderAttempt(
  attemptId: string,
  answers: { questionKey: string; answerKey: string }[]
): Promise<KbCompleteResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("complete_burndown_reader_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });
  if (error) return { completed: false };
  return data as KbCompleteResult;
}

/** p_answers: [{scenarioKey, choiceKey}, ...] — one entry per DRAWN
 *  scenario (4-6, not fixed). Elapsed time for the speed bonus is
 *  computed server-side from kb_game_attempts timestamps, never sent
 *  from here. */
export async function completeFinalBossAttempt(
  attemptId: string,
  answers: { scenarioKey: string; choiceKey: string }[]
): Promise<KbCompleteResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("complete_final_boss_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });
  if (error) return { completed: false };
  return data as KbCompleteResult;
}
