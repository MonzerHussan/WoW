import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { purchaseCoinsSchema } from "@/shared/schemas/wallet.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/wallet/purchase
 * Body: { packageId: string }
 *
 * LOCALLY-SIMULATED purchase — no real payment gateway. `credit_coins()`
 * (020) reads the coin amount from `coin_packages` by id server-side;
 * this route never accepts or trusts a client-supplied coin amount.
 * Same server-side-RPC-from-a-route pattern as every other
 * security-definer call in this codebase (spend_coins, award_quiz_points,
 * run_nova_check_placeholder) — never called directly from the client.
 *
 * No rate limit on repeat purchases — see TECH_DEBT.md. Acceptable only
 * because there is no real money changing hands yet.
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

  const parsed = purchaseCoinsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid packageId" }, { status: 400 });
  }

  const { data: credited, error: creditError } = await supabase.rpc("credit_coins", {
    p_user: user.id,
    p_package_id: parsed.data.packageId,
  });

  if (creditError) {
    logger.error("wallet_purchase_error", { userId: user.id, packageId: parsed.data.packageId, error: creditError.message });
    return NextResponse.json({ error: "Failed to complete purchase" }, { status: 500 });
  }

  if (!credited) {
    return NextResponse.json({ error: "Invalid or inactive package" }, { status: 400 });
  }

  const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();

  logger.info("wallet_purchase_completed", { userId: user.id, packageId: parsed.data.packageId });

  return NextResponse.json({ balance: wallet?.balance ?? 0 });
}
