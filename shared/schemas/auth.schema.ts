import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(72),
  accountType: z.enum([
    "student",
    "job_seeker",
    "freelancer",
    "employee",
    "instructor",
    "company",
    "institute",
  ]),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});
export type LoginInput = z.infer<typeof loginSchema>;
