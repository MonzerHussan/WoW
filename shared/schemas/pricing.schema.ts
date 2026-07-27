import { z } from "zod";

/**
 * Two distinct shapes rather than one polymorphic body: the route
 * dispatches to two different security-definer functions, and keeping
 * them separate means a malformed request can never land in the wrong
 * one. Same reasoning the owner gave for not writing a single generic
 * update function taking a table name.
 */
export const updatePricingUnitSchema = z.object({
  kind: z.literal("unit"),
  key: z.string().trim().min(1).max(80),
  // Non-negative integer, mirroring the table CHECK and the function's
  // own guard. The client can still send anything; this is the first of
  // three refusals (zod → function guard → table CHECK).
  coinCost: z.number().int().min(0).max(100000),
});

export const updateCoinPackagePriceSchema = z.object({
  kind: z.literal("package"),
  packageId: z.string().uuid(),
  priceUsd: z.number().min(0).max(1000000),
});

export const adminPricingRequestSchema = z.discriminatedUnion("kind", [
  updatePricingUnitSchema,
  updateCoinPackagePriceSchema,
]);

export type AdminPricingRequest = z.infer<typeof adminPricingRequestSchema>;
