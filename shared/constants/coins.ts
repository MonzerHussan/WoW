/**
 * Single source of truth for what a coin-charged action costs. Same rule
 * as REASON_POINTS in points.ts: the server NEVER accepts a coin amount
 * from a client request — it looks the cost up here. The client may
 * import these values too, but only to *display* the price; the charge
 * always uses the server's own copy.
 *
 * Note the deliberate split: a module's optional language task reads its
 * cost from `lessons.content->module_closing->coin_cost` (seed content,
 * 009) because it is authored per-module, while pronunciation practice
 * is a uniform platform action and is priced here.
 */
export const COIN_COSTS = {
  /** One agent evaluation of a spoken-then-transcribed phrase. Cheaper
   *  than a written language task (5) because the evaluated text is a
   *  single phrase and the feature is meant to be repeated for drill. */
  PRONUNCIATION_EVALUATION: 3,
} as const;

export type CoinCostKey = keyof typeof COIN_COSTS;
