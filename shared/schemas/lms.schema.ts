import { z } from "zod";

export const enrollSchema = z.object({
  courseId: z.string().uuid(),
});
export type EnrollInput = z.infer<typeof enrollSchema>;

export const completeLessonSchema = z.object({
  lessonId: z.string().uuid(),
});
export type CompleteLessonInput = z.infer<typeof completeLessonSchema>;

// answers: { [questionId]: selectedOptionIndex }
export const quizSubmitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.number().int().min(0)),
});
export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>;

export const gradeAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().max(1000).optional(),
});
export type GradeAttemptInput = z.infer<typeof gradeAttemptSchema>;

export const submitLanguageTaskSchema = z.object({
  lessonId: z.string().uuid(),
  response: z.string().trim().min(20, "الرد قصير جدًا — حاول التوسّع أكثر").max(3000),
});
export type SubmitLanguageTaskInput = z.infer<typeof submitLanguageTaskSchema>;
