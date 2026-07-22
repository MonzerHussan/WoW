import { z } from "zod";

export const createPersonalCourseSchema = z.object({
  title: z.string().min(3).max(200),
  track: z.enum(["education", "employment", "promotion"]),
  summary: z.string().max(1000).optional(),
});
export type CreatePersonalCourseInput = z.infer<typeof createPersonalCourseSchema>;
