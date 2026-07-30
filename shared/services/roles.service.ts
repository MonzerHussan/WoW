import { SupabaseClient } from "@supabase/supabase-js";
import { AppRole } from "@/shared/types";
import { UserCapability } from "@/shared/constants/capabilities";

/**
 * Lives in shared/ rather than features/admin because the read (list)
 * side depends on the new roles.assign-gated profiles policy (031),
 * mirroring pricing.service.ts's placement for the same reason.
 */
export interface RoleAssignmentRow {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
}

/**
 * Requires the caller to hold roles.assign — enforced by 031's RLS
 * policy, not by this function. Without that permission this simply
 * returns the caller's own row (the pre-existing owner-only policy still
 * applies), never an error, since RLS just narrows visible rows.
 */
export async function listUsersForRoleAssignment(
  supabase: SupabaseClient
): Promise<RoleAssignmentRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name");

  if (error) throw new Error(error.message);
  return (data || []) as RoleAssignmentRow[];
}

/**
 * Requires users.manage — enforced by 034's RLS policy on
 * user_capabilities (ORed on top of the pre-existing owner-only read,
 * not replacing it). Grouped by user_id so the admin view can show each
 * user's currently active capabilities without an N+1 query.
 */
export async function listUserCapabilities(
  supabase: SupabaseClient
): Promise<Record<string, UserCapability[]>> {
  const { data, error } = await supabase.from("user_capabilities").select("user_id, capability");
  if (error) throw new Error(error.message);

  const byUser: Record<string, UserCapability[]> = {};
  for (const row of data || []) {
    const userId = (row as any).user_id as string;
    (byUser[userId] ||= []).push((row as any).capability as UserCapability);
  }
  return byUser;
}
