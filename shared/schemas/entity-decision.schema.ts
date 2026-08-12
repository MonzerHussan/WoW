import { z } from "zod";

export const submitEntityDecisionSchema = z.object({
  lessonId: z.string().uuid(),
  scenarioKey: z.string().min(1),
  choiceKey: z.string().min(1),
});

export type SubmitEntityDecisionRequest = z.infer<typeof submitEntityDecisionSchema>;
