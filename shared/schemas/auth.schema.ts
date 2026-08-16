import { z } from "zod";

/**
 * Mirrors the password policy actually enforced by Supabase Auth (raised
 * 2026-08-15): minimum 10 characters AND at least one of each of
 * lowercase / uppercase / digit / symbol. Confirmed by probing the live
 * signup endpoint — "Abcdef1234" (10 chars, no symbol) is REJECTED with
 * `weak_password`, "TestWow!2026" is accepted, and the server's own
 * refusal message reads: "Password should be at least 10 characters.
 * Password should contain at least one character of each: abcdefg...,
 * ABCDEFG..., 0123456789, !@#$%^&*()_+-=[]{};'\:"|<>?,./`~."
 *
 * Kept deliberately in sync BY HAND with that dashboard setting — there
 * is no API to read it. If the owner changes the policy, this constant
 * and `auth.passwordRules` in the dictionary must both be updated, or
 * the client will promise something the server refuses (which is the
 * exact failure this replaces: the old schema demanded only 8 chars,
 * i.e. it was *weaker* than the server and let the user submit a
 * password that could only fail server-side, in English).
 */
const PASSWORD_SYMBOLS = "!@#$%^&*()_+\\-=\\[\\]{};'\\\\:\"|<>?,./`~";

export const passwordPolicySchema = z
  .string()
  .min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل")
  .max(72, "كلمة المرور طويلة جدًا")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف إنجليزي صغير واحد على الأقل")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل")
  .regex(new RegExp(`[${PASSWORD_SYMBOLS}]`), "يجب أن تحتوي على رمز واحد على الأقل مثل !@#$%");

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  password: passwordPolicySchema,
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
  // Deliberately NOT passwordPolicySchema: an existing user whose password
  // predates the raised policy must still be able to log in and type it.
  // Login validates presence only; the policy applies where a password is
  // CREATED (signup) or CHANGED (update), never where it is presented.
  password: z.string().min(1, "أدخل كلمة المرور"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
