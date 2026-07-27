"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { PricingUnit, CoinPackageRow } from "@/shared/services/pricing.service";

type RowState = { value: string; saving: boolean; message: string | null; ok: boolean };

function initialState(current: number): RowState {
  return { value: String(current), saving: false, message: null, ok: false };
}

/**
 * The editable half of /admin/pricing. Every row posts to
 * /api/admin/pricing, which calls one of the two security-definer
 * functions from 024 — this component has no privileged access of its
 * own, and a user without finance.edit_rates who reached it somehow would
 * simply get 403s on save. The page itself refuses to render for them.
 *
 * Per-row save (not one bulk submit) on purpose: a price change is a
 * money decision, so each one is its own deliberate action with its own
 * visible outcome, rather than a batch where a partial failure is easy
 * to miss.
 */
export function PricingAdminView({
  units,
  packages,
  lang,
}: {
  units: PricingUnit[];
  packages: CoinPackageRow[];
  lang: Lang;
}) {
  const [unitRows, setUnitRows] = useState<Record<string, RowState>>(
    Object.fromEntries(units.map((u) => [u.key, initialState(u.coin_cost)]))
  );
  const [packageRows, setPackageRows] = useState<Record<string, RowState>>(
    Object.fromEntries(packages.map((p) => [p.id, initialState(p.price_usd)]))
  );

  async function save(
    id: string,
    body: unknown,
    rows: Record<string, RowState>,
    setRows: (updater: (prev: Record<string, RowState>) => Record<string, RowState>) => void
  ) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: true, message: null } }));
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setRows((prev) => ({
          ...prev,
          [id]: { ...prev[id], saving: false, ok: false, message: data?.error || t("admin.pricingSaveFailed", lang) },
        }));
        return;
      }
      setRows((prev) => ({
        ...prev,
        [id]: { ...prev[id], saving: false, ok: true, message: t("admin.pricingSaved", lang) },
      }));
    } catch {
      setRows((prev) => ({
        ...prev,
        [id]: { ...prev[id], saving: false, ok: false, message: t("admin.pricingSaveFailed", lang) },
      }));
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-display font-bold text-navy mb-3">{t("admin.pricingUnitsHeading", lang)}</h2>
        <div className="flex flex-col gap-2">
          {units.map((u) => {
            const row = unitRows[u.key];
            return (
              <div
                key={u.key}
                className="border border-line rounded-wow p-4 flex flex-wrap items-center gap-3 text-sm"
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-ink">{(lang === "ar" ? u.label_ar : u.label_en) || u.key}</p>
                  <p className="text-xs text-ink-soft font-mono">{u.key}</p>
                </div>
                <span className="text-ink-soft">
                  {t("admin.pricingCurrentCol", lang)}: <strong className="text-ink">{u.coin_cost}</strong>
                </span>
                <input
                  type="number"
                  min={0}
                  className="field-input w-24"
                  aria-label={`${t("admin.pricingNewCol", lang)} — ${u.key}`}
                  value={row.value}
                  onChange={(e) =>
                    setUnitRows((prev) => ({ ...prev, [u.key]: { ...prev[u.key], value: e.target.value } }))
                  }
                />
                <button
                  type="button"
                  disabled={row.saving}
                  onClick={() =>
                    save(
                      u.key,
                      { kind: "unit", key: u.key, coinCost: Number(row.value) },
                      unitRows,
                      setUnitRows
                    )
                  }
                  className="rounded-xl bg-navy text-white px-4 py-2 text-sm font-bold disabled:opacity-60"
                >
                  {row.saving ? t("admin.pricingSaving", lang) : t("admin.pricingSave", lang)}
                </button>
                {row.message && (
                  <span className={`text-xs ${row.ok ? "text-navy" : "text-orange-dark"}`}>{row.message}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-navy mb-3">{t("admin.coinPackagesHeading", lang)}</h2>
        <div className="flex flex-col gap-2">
          {packages.map((p) => {
            const row = packageRows[p.id];
            return (
              <div
                key={p.id}
                className="border border-line rounded-wow p-4 flex flex-wrap items-center gap-3 text-sm"
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-ink">{p.name}</p>
                  <p className="text-xs text-ink-soft">
                    {t("admin.packageCoinsCol", lang)}: {p.coins}
                  </p>
                </div>
                <span className="text-ink-soft">
                  {t("admin.pricingCurrentCol", lang)}: <strong className="text-ink">${p.price_usd}</strong>
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="field-input w-28"
                  aria-label={`${t("admin.pricingNewCol", lang)} — ${p.name}`}
                  value={row.value}
                  onChange={(e) =>
                    setPackageRows((prev) => ({ ...prev, [p.id]: { ...prev[p.id], value: e.target.value } }))
                  }
                />
                <button
                  type="button"
                  disabled={row.saving}
                  onClick={() =>
                    save(
                      p.id,
                      { kind: "package", packageId: p.id, priceUsd: Number(row.value) },
                      packageRows,
                      setPackageRows
                    )
                  }
                  className="rounded-xl bg-navy text-white px-4 py-2 text-sm font-bold disabled:opacity-60"
                >
                  {row.saving ? t("admin.pricingSaving", lang) : t("admin.pricingSave", lang)}
                </button>
                {row.message && (
                  <span className={`text-xs ${row.ok ? "text-navy" : "text-orange-dark"}`}>{row.message}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
