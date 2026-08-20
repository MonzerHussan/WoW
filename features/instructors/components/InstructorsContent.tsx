"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { AppShell } from "@/shared/components/AppShell";
import { Card, EmptyState } from "@/shared/components/Feedback";
import {
  MyInstructorLink,
  IncomingInstructorRequest,
  MyInstructorProfile,
} from "@/features/instructors/services/instructors.service";
import { IncomingRequestsPanel } from "@/features/instructors/components/IncomingRequestsPanel";
import { InstructorProfileForm } from "@/features/instructors/components/InstructorProfileForm";

export function InstructorsContent({
  links,
  incomingRequests,
  isInstructor,
  myProfile,
  walletBalance,
  agentChosenName,
  initialLang,
}: {
  links: MyInstructorLink[];
  /** Requests addressed TO this user as an instructor. Empty unless
   *  they are an APPROVED instructor (078). */
  incomingRequests: IncomingInstructorRequest[];
  isInstructor: boolean;
  /** This user's own instructor profile, or null if they never applied.
   *  Drives the apply/edit form — everyone sees it, since applying is
   *  open to any signed-in user since 078. */
  myProfile: MyInstructorProfile | null;
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

        {/* Instructor-only section. A learner never sees it, and it holds
            no accept control for them — accepting is the instructor's act
            alone (074), and the invite direction was abolished in 076. */}
        {isInstructor && <IncomingRequestsPanel requests={incomingRequests} lang={lang} />}

        {/* Open to every signed-in user: applying is how someone becomes
            an instructor since 078. For an existing profile the same
            form edits it, and shows its review state. */}
        <InstructorProfileForm profile={myProfile} lang={lang} />

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
