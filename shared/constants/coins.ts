/**
 * NO LONGER THE SOURCE OF TRUTH (migration 024).
 *
 * Every coin price now lives in the `pricing_units` table and is edited
 * from /admin/pricing — see shared/services/pricing.service.ts. What
 * remains here is a single hardcoded FALLBACK, kept deliberately and
 * used only if the pricing row cannot be read at all; the route logs a
 * `pronunciation_price_fallback` warning when that happens.
 *
 * Two consequences worth being explicit about:
 *  - An admin's price change is NOT reflected in this constant. If they
 *    ever diverge, the database wins everywhere except the fallback path.
 *  - Do not add new prices here. New charged actions get a
 *    `pricing_units` key instead.
 *
 * The rule that never changed: the server never accepts a coin amount
 * from a client request. It resolves the price itself — now from the
 * database rather than from this file.
 */
export const COIN_COSTS = {
  /** Fallback only. Authoritative value: pricing_units['pronunciation_practice']. */
  PRONUNCIATION_EVALUATION: 3,
} as const;

export type CoinCostKey = keyof typeof COIN_COSTS;
