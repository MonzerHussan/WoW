"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { CoinPackageRow } from "@/features/profile/services/profile.service";

/**
 * LOCALLY-SIMULATED purchase — no real payment gateway. The prominent
 * warning below is a UI requirement, not just a code comment: a user
 * clicking "Buy" must see, in the interface itself, that this is a
 * test purchase before they click it.
 *
 * `purchaseEnabled` mirrors the server's WALLET_SIMULATION_ENABLED. It is
 * presentation only — /api/wallet/purchase refuses with 503 whatever this
 * component renders, which is the actual protection. Hiding the buttons
 * just means a user is told up front instead of after clicking.
 *
 * `lang` is a prop, not its own useLang() call (035) — it used to manage
 * an independent instance, which is exactly what made it "the panel that
 * follows the persisted language while everything else on /profile
 * didn't" (TECH_DEBT #13's own description). ProfileView is now the
 * single owner of the page's language state.
 */
export function WalletPanel({
  balance: initialBalance,
  packages,
  purchaseEnabled,
  lang = "ar" as Lang,
}: {
  balance: number;
  packages: CoinPackageRow[];
  purchaseEnabled: boolean;
  lang?: Lang;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function handleBuy(packageId: string) {
    setBuyingId(packageId);
    setError(null);
    setSuccessId(null);
    try {
      const res = await fetch("/api/wallet/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.somethingWentWrong", lang));
        return;
      }
      setBalance(data.balance);
      setSuccessId(packageId);
    } catch {
      setError(t("common.somethingWentWrong", lang));
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div className="bg-white border border-line rounded-wow p-5">
      <h2 className="font-display font-bold text-navy text-sm mb-3">{t("profile.walletTitle", lang)}</h2>

      <p className="text-2xl font-display font-black text-navy mb-1">
        {balance} <span className="text-sm font-semibold text-ink-soft">{t("profile.coinsUnit", lang)}</span>
      </p>
      <p className="text-xs text-ink-soft mb-4">{t("profile.walletBalance", lang)}</p>

      <div className="bg-orange/10 border border-orange/30 rounded-lg px-3 py-2 mb-4">
        <p className="text-xs font-semibold text-orange-dark">
          {purchaseEnabled ? t("profile.walletSimulatedWarning", lang) : t("profile.walletPurchaseDisabled", lang)}
        </p>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        {packages.map((pkg) => (
          <div key={pkg.id} className="border border-line rounded-lg p-3 flex flex-col gap-2">
            <p className="font-bold text-ink text-sm">{lang === "en" ? pkg.nameEn || pkg.name : pkg.name}</p>
            <p className="text-xs text-ink-soft">
              {pkg.coins} {t("profile.coinsUnit", lang)} — ${pkg.priceUsd}
            </p>
            <Button
              variant="ghost"
              onClick={() => handleBuy(pkg.id)}
              disabled={!purchaseEnabled || buyingId !== null}
              className="text-xs"
            >
              {buyingId === pkg.id ? t("profile.buying", lang) : t("profile.buyPackage", lang)}
            </Button>
            {successId === pkg.id && <p className="text-xs font-semibold text-navy">{t("profile.purchaseSuccess", lang)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
