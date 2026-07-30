import { z } from "zod";

/** Mirrors the user_capability enum (003) — same list as shared/constants/capabilities.ts. */
export const USER_CAPABILITY_VALUES = [
  "job_seeker",
  "freelancer",
  "client",
  "learner",
  "instructor",
  "mentor",
  "assessor",
] as const;

/**
 * Only the three capabilities grant_capability (034) is actually for —
 * job_seeker/freelancer/client/learner stay self-service (RLS, 034) and
 * have no admin-grant reason to exist. A stricter enum than the DB
 * column itself, so a mis-wired admin call can't even attempt to grant
 * one of the self-service four through this path.
 */
export const STAFF_GRANTED_CAPABILITY_VALUES = ["instructor", "mentor", "assessor"] as const;

export const grantCapabilityRequestSchema = z.object({
  userId: z.string().uuid(),
  capability: z.enum(STAFF_GRANTED_CAPABILITY_VALUES),
});

export type GrantCapabilityRequest = z.infer<typeof grantCapabilityRequestSchema>;
