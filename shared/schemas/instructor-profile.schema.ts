import { z } from "zod";

/**
 * Shape validation only — never the security boundary. 078's two
 * functions carry that: `submit_instructor_application` refuses an
 * unauthenticated caller and only ever writes the caller's own row,
 * and `review_instructor_application` verifies
 * `has_permission('users.manage')` inside itself. Same division as
 * /api/admin/capabilities (034).
 *
 * Note what is absent: `approval_status`, `is_available` and
 * `needs_review`. They are not fields an applicant submits — the guard
 * trigger refuses a client write to the first two outright, and the
 * third is raised by the database. Leaving them out of the schema means
 * a mis-wired client cannot even form the request.
 */
export const instructorApplicationSchema = z.object({
  displayName: z.string().trim().min(2, "اسم العرض قصير جدًا").max(80),
  bio: z.string().trim().max(1000, "النبذة طويلة جدًا").optional().or(z.literal("")),
  expertiseTags: z.array(z.string().trim().min(1).max(40)).max(10, "10 مجالات كحد أقصى").default([]),
  yearsExperience: z
    .number({ invalid_type_error: "أدخل رقمًا" })
    .int()
    .min(0, "لا يمكن أن تكون سالبة")
    .max(70, "قيمة غير معقولة")
    .nullable()
    .optional(),
  // The instructor sets their own price — 040 pins it into the
  // assignment at request time and 074 charges the stored snapshot, so
  // a later change cannot alter an existing request's cost.
  priceCoins: z.number({ invalid_type_error: "أدخل رقمًا" }).int().min(0, "لا يمكن أن يكون سالبًا").max(100000),
});
export type InstructorApplicationInput = z.infer<typeof instructorApplicationSchema>;

export const reviewInstructorSchema = z.object({
  userId: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ReviewInstructorInput = z.infer<typeof reviewInstructorSchema>;
