import { z } from "zod";

export const onboardingCompleteSchema = z.object({
  goal: z.string().min(1).max(60).nullable(),
  pmpLevel: z.number().int().min(1).max(4).nullable(),
});
export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
