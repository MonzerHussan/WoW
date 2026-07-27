import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { adminPricingRequestSchema } from "@/shared/schemas/pricing.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/pricing
 * Body: { kind: "unit", key, coinCost } | { kind: "package", packageId, priceUsd }
 *
 * The route does NOT check the permission itself and deliberately so:
 * `update_pricing_unit` / `update_coin_package_price` (024) each verify
 * `has_permission('finance.edit_rates')` inside the function, and
 * `pricing_units` has no UPDATE policy at all, so a direct write from
 * any normal session is refused regardless of what this handler does.
 * Putting the only check here would mean a new caller (a script, a
 * future page) could bypass it. What this route adds is shape
 * validation and a readable error — not the security boundary.
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

  const parsed = adminPricingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const input = parsed.data;

  const { data, error } =
    input.kind === "unit"
      ? await supabase.rpc("update_pricing_unit", { p_key: input.key, p_new_cost: input.coinCost })
      : await supabase.rpc("update_coin_package_price", {
          p_package_id: input.packageId,
          p_new_price: input.priceUsd,
        });

  if (error) {
    // 42501 = insufficient_privilege, raised by the function when the
    // caller lacks finance.edit_rates. Anything else is a real fault.
    if (error.code === "42501") {
      logger.warn("admin_pricing_denied", { userId: user.id, kind: input.kind });
      return NextResponse.json({ error: "ليست لديك صلاحية تعديل التسعير" }, { status: 403 });
    }
    logger.error("admin_pricing_update_failed", { userId: user.id, kind: input.kind, error: error.message });
    return NextResponse.json({ error: "Failed to update pricing" }, { status: 500 });
  }

  // The functions return false for "no such row" — distinct from a
  // permission failure, which raises.
  if (data === false) {
    return NextResponse.json({ error: "Pricing entry not found" }, { status: 404 });
  }

  logger.info("admin_pricing_updated", {
    userId: user.id,
    kind: input.kind,
    target: input.kind === "unit" ? input.key : input.packageId,
    value: input.kind === "unit" ? input.coinCost : input.priceUsd,
  });

  return NextResponse.json({ ok: true });
}
