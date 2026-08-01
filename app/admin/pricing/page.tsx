import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { listPricingUnits, listCoinPackages } from "@/shared/services/pricing.service";
import { AdminPricingPageContent } from "@/features/admin/components/AdminPricingPageContent";

/**
 * The platform's first admin page (migration 024). Deliberately a single
 * purpose-built screen, not the start of a general admin shell — no
 * admin navigation, no layout, nothing shared yet.
 *
 * The permission check happens BEFORE any data is fetched and before any
 * markup is produced: someone without finance.edit_rates never receives
 * page structure, only the refusal. That is the UI half of the guard;
 * the real one is in the database (024 gives pricing_units no UPDATE
 * policy at all, and both update functions verify the permission
 * themselves), so bypassing this page buys nothing.
 */
export default async function AdminPricingPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  if (!user) redirect("/login?redirectedFrom=/admin/pricing");

  // finance.edit_rates, not content.manage: RBAC.md denies `admin`
  // "financial settings", and content_manager (015a) exists purely for
  // curriculum review. This permission already existed and already
  // belonged to finance_manager/super_admin — 024 introduced none.
  const { data: canEditRates } = await supabase.rpc("has_permission", { perm: "finance.edit_rates" });

  if (!canEditRates) {
    return (
      <main
        dir={initialLang === "ar" ? "rtl" : "ltr"}
        className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center"
      >
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("admin.noPermission", initialLang)}</p>
      </main>
    );
  }

  const [units, packages] = await Promise.all([listPricingUnits(supabase), listCoinPackages(supabase)]);

  return (
    <main dir={initialLang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <AdminPricingPageContent units={units} packages={packages} initialLang={initialLang} />
    </main>
  );
}
