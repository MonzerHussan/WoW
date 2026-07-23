import { z } from "zod";

export const onboardingCompleteSchema = z.object({
  goal: z.string().min(1).max(60).nullable(),
  pmpLevel: z.number().int().min(1).max(4).nullable(),
  age: z.number().int().min(5).max(120),
  gender: z.enum(["male", "female", "prefer_not_to_say"]).nullable(),
});
export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
