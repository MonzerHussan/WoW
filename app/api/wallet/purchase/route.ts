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
 * OFF BY DEFAULT. `credit_coins()` mints spendable coins with no payment
 * gateway behind it and no limit on repeats — so the route now refuses
 * unless `WALLET_SIMULATION_ENABLED` is explicitly "true". Until this
 * change the only protection was a warning in TECH_DEBT.md and an orange
 * box in the UI, neither of which stops a POST. A missing or misspelled
 * env var fails CLOSED, which is the correct direction for something
 * that hands out free currency.
 *
 * This is NOT a payment gateway and does not pretend to be one — it is
 * the minimum needed to stop the simulation reaching real users. Real
 * purchasing stays a separate, later piece of work.
 *
 * Still no rate limit on repeats when the simulation IS on; acceptable
 * only because it now cannot be on in production.
 */
const SIMULATION_ENABLED = process.env.WALLET_SIMULATION_ENABLED === "true";
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  // Checked first, before auth even: whether the feature exists at all
  // is not a per-user question, and a disabled feature should not read
  // the session to say so. 503 (not 403) — the capability is absent, the
  // caller did nothing wrong.
  if (!SIMULATION_ENABLED) {
    logger.warn("wallet_purchase_blocked_simulation_disabled");
    return NextResponse.json(
      {
        error:
          "شراء الكوينز غير متاح حاليًا — بوابة الدفع الحقيقية لم تُفعَّل بعد. تواصل مع فريق WOW إن كنت تحتاج رصيدًا للاختبار.",
        simulationDisabled: true,
      },
      { status: 503 }
    );
  }

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
