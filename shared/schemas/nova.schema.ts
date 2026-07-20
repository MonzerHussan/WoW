import { z } from "zod";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

export const novaRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  // Cap history length server-side — a client cannot force Nova to process
  // an unbounded/expensive context window.
  history: z.array(historyMessageSchema).max(20).optional().default([]),
});
export type NovaRequestInput = z.infer<typeof novaRequestSchema>;
