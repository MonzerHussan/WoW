import { z } from "zod";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

export const agentRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  // Cap history length server-side — a client cannot force the agent to
  // process an unbounded/expensive context window.
  history: z.array(historyMessageSchema).max(20).optional().default([]),
});
export type AgentRequestInput = z.infer<typeof agentRequestSchema>;

export const setAgentNameSchema = z.object({
  chosenName: z.string().trim().min(1, "Name is required").max(40),
});
export type SetAgentNameInput = z.infer<typeof setAgentNameSchema>;

export const recommendationKindSchema = z.enum([
  "learn_skill",
  "add_project",
  "apply_job",
  "complete_course",
  "take_assessment",
  "other",
]);

// Shape the agent must follow when it decides to write a recommendation,
// parsed out of a fenced ```rec block in its own reply (features/agent/prompt.ts).
export const agentRecommendationSchema = z.object({
  kind: recommendationKindSchema,
  payload: z.record(z.string(), z.any()).default({}),
  message: z.string().min(1).max(500),
});
export type AgentRecommendation = z.infer<typeof agentRecommendationSchema>;
