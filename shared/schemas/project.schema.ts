import { z } from "zod";

/**
 * "Moment of birth" fields (037) — matches create_project()'s own
 * parameters exactly, including which are optional. The RPC re-validates
 * `name` server-side regardless (never trust client validation alone for
 * the one field that's actually required at the DB level).
 */
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  sector: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  organization: z.string().trim().max(120).nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** The mini business case — free, no coin cost, plain owner UPDATE. */
export const updateBusinessCaseSchema = z.object({
  problemStatement: z.string().trim().max(2000).nullable(),
  opportunityStatement: z.string().trim().max(2000).nullable(),
  valueCase: z.string().trim().max(2000).nullable(),
  whyNow: z.string().trim().max(2000).nullable(),
});
export type UpdateBusinessCaseInput = z.infer<typeof updateBusinessCaseSchema>;

const coreTeamMemberSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(80),
});

/**
 * The charter wizard's own fields. `isApproved` is deliberately NOT
 * here — approval is its own explicit action (updateCharterApproval),
 * never bundled into a routine field save, so a draft autosave can never
 * accidentally flip it and fire the auto-decision-log trigger (037's
 * log_charter_approval()).
 */
export const updateCharterSchema = z.object({
  vision: z.string().trim().max(2000).nullable(),
  objectives: z.string().trim().max(2000).nullable(),
  deliverables: z.string().trim().max(2000).nullable(),
  sponsorName: z.string().trim().max(120).nullable(),
  sponsorAuthority: z.string().trim().max(500).nullable(),
  coreTeam: z.array(coreTeamMemberSchema).max(20),
  assumptions: z.array(z.string().trim().min(1).max(300)).max(30),
  constraints: z.array(z.string().trim().min(1).max(300)).max(30),
});
export type UpdateCharterInput = z.infer<typeof updateCharterSchema>;

/** Manual entries only — the one auto-generated row (charter approval) is DB-written, never through this schema. */
export const addDecisionLogEntrySchema = z.object({
  situation: z.string().trim().min(1).max(500),
  decision: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(500),
  category: z.enum(["assumption", "constraint", "risk"]).nullable().optional(),
});
export type AddDecisionLogEntryInput = z.infer<typeof addDecisionLogEntrySchema>;
