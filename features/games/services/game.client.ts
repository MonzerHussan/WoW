import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { GameKey, GameVariant } from "@/shared/schemas/game.schema";

export interface PlayGameResult {
  allowed: boolean;
  reason?: "invalid_game" | "invalid_variant" | "project_not_owned" | "quiz_not_passed" | "scenario_not_found"
    | "no_scenario_available" | "price_unavailable" | "insufficient_balance";
  attemptId?: string;
  scenarioId?: string | null;
  coinsCharged?: number;
  balance?: number;
  required?: number;
  balanceAfter?: number;
}

export interface CompleteGameResult {
  completed: boolean;
  already_completed?: boolean;
  reason?: "attempt_not_found" | "criteria_not_met";
  score?: number | null;
  badge?: string;
}

/** The only door into game_attempts (038) — charges coins, then creates
 *  the attempt row, in one transaction. See play_game()'s own comment
 *  for why variant='generic' re-checks the quiz pass server-side too. */
export async function playGame(
  gameKey: GameKey,
  variant: GameVariant,
  opts: { projectId?: string; scenarioId?: string } = {}
): Promise<PlayGameResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("play_game", {
    p_game_key: gameKey,
    p_variant: variant,
    p_project_id: opts.projectId || null,
    p_scenario_id: opts.scenarioId || null,
  });

  if (error) return { allowed: false };
  return data as PlayGameResult;
}

/** Re-validates completion criteria server-side and awards the badge —
 *  the payload sent here is never trusted as-is for pass/fail (038). */
export async function completeGameAttempt(attemptId: string, payload: Record<string, any>): Promise<CompleteGameResult> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc("complete_game_attempt", {
    p_attempt_id: attemptId,
    p_payload: payload,
  });

  if (error) return { completed: false };
  return data as CompleteGameResult;
}
