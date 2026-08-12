import { SupabaseClient } from "@supabase/supabase-js";
import { GameKey, GameVariant } from "@/shared/schemas/game.schema";

/**
 * Central coin pricing (migration 024). Prices are keyed by ACTION TYPE,
 * never per lesson — verified during 023 that every ordinary writing
 * task costs the same and every module-closing task costs the same,
 * with no per-lesson exceptions.
 *
 * `lessons.content->...->coin_cost` still exists in the data but is
 * NON-AUTHORITATIVE from 024 on, for display and for charging alike.
 * Nothing in this file reads it.
 *
 * Lives in shared/ rather than features/lms because two different
 * features consume it (the lesson player charges against it, the admin
 * page edits it) and neither may import the other.
 */
export const PRICING_KEYS = {
  pronunciation: "pronunciation_practice",
  languageTaskWriting: "language_task_writing",
  languageTaskModuleClosing: "language_task_module_closing",
  newProject: "new_project",
} as const;

export type PricingKey = (typeof PRICING_KEYS)[keyof typeof PRICING_KEYS];

/**
 * Mirrors 038's `play_game()` own `v_pricing_key` CASE exactly — the one
 * irregular case is `project_vs_operations_race`, whose pricing keys are
 * shortened to `game_project_vs_ops_*`. Any drift between this and the
 * SQL function would just mean getPricingUnit() returns null (refused,
 * not mis-charged) since play_game() is the actual source of truth for
 * the charge — this is display-only.
 */
export function gamePricingKey(gameKey: GameKey, variant: GameVariant): string {
  const base = gameKey === "project_vs_operations_race" ? "game_project_vs_ops" : `game_${gameKey}`;
  return `${base}_${variant}`;
}

export interface PricingUnit {
  key: string;
  coin_cost: number;
  label_ar: string | null;
  label_en: string | null;
  updated_at: string;
}

/**
 * One price. Returns null when the row is missing or unreadable rather
 * than substituting a number — callers must decide explicitly what to
 * do with "no price", since silently guessing would mean charging a
 * figure nobody configured.
 */
export async function getPricingUnit(
  supabase: SupabaseClient,
  key: PricingKey | string
): Promise<number | null> {
  const { data } = await supabase
    .from("pricing_units")
    .select("coin_cost")
    .eq("key", key)
    .maybeSingle();

  return typeof data?.coin_cost === "number" ? data.coin_cost : null;
}

/** All units, for the admin table. RLS already restricts writes; reads are open to any signed-in user. */
export async function listPricingUnits(supabase: SupabaseClient): Promise<PricingUnit[]> {
  const { data, error } = await supabase
    .from("pricing_units")
    .select("key, coin_cost, label_ar, label_en, updated_at")
    .order("key");

  if (error) throw new Error(error.message);
  return (data || []) as PricingUnit[];
}

export interface CoinPackageRow {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  is_active: boolean;
}

/**
 * Note: `coin_packages`'s public-read policy is `is_active = true`, so
 * an inactive package is invisible even to a rate editor. That is
 * pre-existing 007b behavior, not something this feature changes — the
 * admin table therefore lists active packages only.
 */
export async function listCoinPackages(supabase: SupabaseClient): Promise<CoinPackageRow[]> {
  const { data, error } = await supabase
    .from("coin_packages")
    .select("id, name, coins, price_usd, is_active")
    .order("coins");

  if (error) throw new Error(error.message);
  return (data || []) as CoinPackageRow[];
}
