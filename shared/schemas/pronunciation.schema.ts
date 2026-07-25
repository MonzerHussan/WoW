import { z } from "zod";

/**
 * `coinCost` is deliberately absent — the route reads it from
 * COIN_COSTS server-side. A client-supplied price is exactly the class
 * of bug CLAUDE.md #4 already documents once for points.
 */
export const evaluatePronunciationSchema = z.object({
  lessonId: z.string().uuid(),
  referenceText: z.string().trim().min(1).max(2000),
  transcript: z.string().trim().min(1, "لم نلتقط أي كلام").max(2000),
});
export type EvaluatePronunciationInput = z.infer<typeof evaluatePronunciationSchema>;
