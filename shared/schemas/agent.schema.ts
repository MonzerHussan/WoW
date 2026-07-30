import { z } from "zod";

export const agentRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  // Set by the floating agent when the user is reading a lesson, so the
  // agent can actually answer questions about the material in front of
  // them. Only the *id* crosses the wire — the route fetches the real
  // content itself under RLS, so a client cannot inject arbitrary text
  // into the system prompt, nor read a lesson it isn't entitled to.
  lessonId: z.string().uuid().optional(),
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
