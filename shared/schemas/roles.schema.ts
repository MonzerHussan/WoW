import { z } from "zod";

/**
 * Mirrors the app_role enum (002 base three + 003 staff roles + 015a's
 * content_manager). Kept in sync by hand — same tradeoff pricing.schema.ts
 * already accepts for its own enums, since Postgres enums aren't
 * introspectable at build time.
 */
export const APP_ROLE_VALUES = [
  "user",
  "moderator",
  "admin",
  "support_agent",
  "support_lead",
  "accountant",
  "finance_manager",
  "tech_support",
  "super_admin",
  "content_manager",
] as const;

export const assignRoleRequestSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(APP_ROLE_VALUES),
});

export type AssignRoleRequest = z.infer<typeof assignRoleRequestSchema>;
