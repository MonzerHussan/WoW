import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { awardPoints } from "@/shared/services/points.service";
import { pointsAwardSchema } from "@/shared/schemas/points.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/points/award
 * Body: { reason: string }  — reason must be one of REASON_POINTS' keys.
 *
 * The point AMOUNT is never accepted from the client (fixed as a critical
 * vuln in Sprint 1) — validation of the `reason` shape itself is now done
 * via zod (Sprint 1.5) instead of an ad hoc lookup-and-check.
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

  const parsed = pointsAwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown or missing reason" }, { status: 400 });
  }

  try {
    const result = await awardPoints(supabase, user.id, parsed.data.reason as any);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error("points_award_failed", { userId: user.id, error: String(err) });
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
