import { z } from "zod";

// Same shape and caps as agentRequestSchema (history is client-held and
// must stay bounded), duplicated rather than imported so the two routes
// can diverge independently later.
const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

export const placementRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  history: z.array(historyMessageSchema).max(20).optional().default([]),
});
export type PlacementRequestInput = z.infer<typeof placementRequestSchema>;

export const englishLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type EnglishLevel = z.infer<typeof englishLevelSchema>;

// Shape the agent must follow in its fenced ```placement block
// (features/agent/prompt.ts). Parsed and validated server-side before
// anything is written — a malformed block means the conversation simply
// continues, never a corrupt row.
export const placementResultSchema = z.object({
  level: englishLevelSchema,
  summary: z.string().min(1).max(2000),
  facts: z.array(z.string().min(1).max(300)).max(10).default([]),
});
export type PlacementResult = z.infer<typeof placementResultSchema>;
