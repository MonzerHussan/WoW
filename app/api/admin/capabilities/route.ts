import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { grantCapabilityRequestSchema } from "@/shared/schemas/capabilities.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/capabilities
 * Body: { userId, capability }
 *
 * Same shape as /api/admin/roles: no permission check here, deliberately.
 * `grant_capability` (034) verifies `has_permission('users.manage')`
 * itself, and instructor/mentor/assessor have no client-writable path
 * outside it (034's RLS split). This route adds shape validation and a
 * readable error, not the security boundary — the zod enum is also
 * narrower than the DB's own user_capability type, restricted to the
 * three staff-granted capabilities so a mis-wired call can't even
 * attempt to grant one of the self-service four through this path.
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

  const parsed = grantCapabilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { userId, capability } = parsed.data;

  const { data, error } = await supabase.rpc("grant_capability", { p_user: userId, p_capability: capability });

  if (error) {
    if (error.code === "42501") {
      logger.warn("admin_capability_grant_denied", { userId: user.id, targetUser: userId, capability });
      return NextResponse.json({ error: "ليست لديك صلاحية منح القدرات" }, { status: 403 });
    }
    logger.error("admin_capability_grant_failed", {
      userId: user.id,
      targetUser: userId,
      capability,
      error: error.message,
    });
    return NextResponse.json({ error: "Failed to grant capability" }, { status: 500 });
  }

  if (data === false) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  logger.info("admin_capability_granted", { userId: user.id, targetUser: userId, capability });

  return NextResponse.json({ ok: true });
}
