import { z } from "zod";

const vocabPairSchema = z.object({
  ar: z.string().min(1),
  en: z.string().min(1),
});

export const suggestLessonSchema = z.object({
  moduleId: z.string().uuid(),
  titleAr: z.string().min(3).max(200),
  titleEn: z.string().min(3).max(200),
  bodyAr: z.string().min(10),
  bodyEn: z.string().min(10),
  vocabulary: z.array(vocabPairSchema).length(5),
  toolboxAr: z.string().max(1000).optional(),
  toolboxEn: z.string().max(1000).optional(),
});
export type SuggestLessonInput = z.infer<typeof suggestLessonSchema>;

export const castReviewVoteSchema = z.object({
  lessonId: z.string().uuid(),
  vote: z.enum(["approve", "reject", "needs_revision"]),
});
export type CastReviewVoteInput = z.infer<typeof castReviewVoteSchema>;
