"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { PricingAdminView } from "@/features/admin/components/PricingAdminView";
import { PricingUnit, CoinPackageRow } from "@/shared/services/pricing.service";

/**
 * TECH_DEBT #27 (full migration group — this page's client view already
 * took `lang` as a plain prop, so this is the same shape as
 * CourseDetailPageContent: one useLang(initialLang)+LangToggle owner,
 * PricingAdminView unchanged underneath.
 */
export function AdminPricingPageContent({
  units,
  packages,
  initialLang,
}: {
  units: PricingUnit[];
  packages: CoinPackageRow[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy mb-2">{t("admin.pricingTitle")}</h1>
      <p className="text-sm text-ink-soft mb-8 leading-relaxed">{t("admin.pricingIntro")}</p>
      <PricingAdminView units={units} packages={packages} lang={lang} />
    </div>
  );
}
