import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { assignRoleRequestSchema } from "@/shared/schemas/roles.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/roles
 * Body: { userId, role }
 *
 * Same shape as /api/admin/pricing: this route does NOT check the
 * permission itself, deliberately. `assign_role` (031) verifies
 * `has_permission('roles.assign')` (and, for a super_admin target,
 * `roles.assign_super`) inside the function, and `profiles.role` has no
 * client-writable path at all outside it (025/026). Putting the only
 * check here would mean a future caller (a script, another screen)
 * could bypass it — this route adds shape validation and a readable
 * error, not the security boundary.
 *
 * A rejected change surfaces as Postgres 42501, mapped to 403 below.
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignRoleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { userId, role } = parsed.data;

  const { data, error } = await supabase.rpc("assign_role", { p_user: userId, p_role: role });

  if (error) {
    // 42501 = insufficient_privilege — raised either for lacking
    // roles.assign, or for attempting a super_admin grant without
    // roles.assign_super. Both map to the same reader-friendly 403.
    if (error.code === "42501") {
      logger.warn("admin_roles_denied", { userId: user.id, targetUser: userId, role });
      return NextResponse.json({ error: "ليست لديك صلاحية تعيين الأدوار" }, { status: 403 });
    }
    logger.error("admin_roles_assign_failed", { userId: user.id, targetUser: userId, role, error: error.message });
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 });
  }

  if (data === false) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  logger.info("admin_role_assigned", { userId: user.id, targetUser: userId, role });

  return NextResponse.json({ ok: true });
}
