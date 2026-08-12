"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { AppShell } from "@/shared/components/AppShell";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { MyInstructorLink } from "@/features/instructors/services/instructors.service";

export function InstructorsContent({
  links,
  walletBalance,
  agentChosenName,
  initialLang,
}: {
  links: MyInstructorLink[];
  walletBalance: number;
  agentChosenName: string;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <AppShell active="instructors" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
      <main className="min-h-screen px-5 py-10 max-w-2xl mx-auto">
        <h1 className="font-display font-black text-2xl text-navy mb-1">{t("instructors.title")}</h1>
        <p className="text-sm text-ink-soft mb-6">{t("instructors.intro")}</p>

        {links.length === 0 ? (
          <EmptyState message={t("instructors.empty")} icon="🧑‍🏫" />
        ) : (
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <Card key={link.assignmentId} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{link.instructorName}</p>
                  <p className="text-xs text-ink-soft">
                    {t("instructors.priceLabel")}: {link.priceCoins} {t("nav.walletLabel")}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold rounded-full px-3 py-1 shrink-0 ${
                    link.isAvailable ? "bg-navy/10 text-navy" : "bg-line text-ink-soft"
                  }`}
                >
                  {link.isAvailable ? t("instructors.available") : t("instructors.unavailable")}
                </span>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-ink-soft mt-6">{t("instructors.comingSoon")}</p>
      </main>
    </AppShell>
  );
}
