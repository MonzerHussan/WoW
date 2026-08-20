import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { instructorApplicationSchema } from "@/shared/schemas/instructor-profile.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/instructors/apply
 * Body: { displayName, bio?, expertiseTags[], yearsExperience?, priceCoins }
 *
 * Apply to become an instructor, or edit an existing application/profile.
 * One endpoint for both because 078's function is one function for both:
 * it inserts when there is no row, and updates when there is, moving
 * `rejected` back to `pending` and never moving `approved` anywhere.
 *
 * No permission check here, deliberately (same as /api/admin/capabilities):
 * the function refuses an unauthenticated caller itself and only ever
 * touches auth.uid()'s own row, so this route validates shape and
 * translates outcomes — it is not the boundary.
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

  const parsed = instructorApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { displayName, bio, expertiseTags, yearsExperience, priceCoins } = parsed.data;

  const { data, error } = await supabase.rpc("submit_instructor_application", {
    p_display_name: displayName,
    p_bio: bio || null,
    p_expertise_tags: expertiseTags,
    p_years_experience: yearsExperience ?? null,
    p_price_coins: priceCoins,
  });

  if (error) {
    logger.error("instructor_apply_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to submit the application" }, { status: 500 });
  }

  if (!data?.submitted) {
    return NextResponse.json({ error: data?.reason || "Application rejected" }, { status: 409 });
  }

  logger.info("instructor_application_submitted", {
    userId: user.id,
    status: data.status,
    created: data.created,
  });

  return NextResponse.json({ ok: true, status: data.status, created: data.created });
}
