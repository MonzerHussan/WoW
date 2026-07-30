import { SupabaseClient } from "@supabase/supabase-js";
import { AppRole } from "@/shared/types";

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
