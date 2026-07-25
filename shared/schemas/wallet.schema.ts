import { z } from "zod";

export const purchaseCoinsSchema = z.object({
  packageId: z.string().uuid(),
});
export type PurchaseCoinsInput = z.infer<typeof purchaseCoinsSchema>;
