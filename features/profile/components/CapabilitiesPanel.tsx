import { t } from "@/shared/i18n/translations";
import { Card } from "@/shared/components/Feedback";
import { getCapabilityLabel } from "@/shared/constants/capabilities";
import { ActivateCapabilityButton } from "@/features/profile/components/ActivateCapabilityButton";

export function CapabilitiesPanel({
  userId,
  activeCapabilities,
  lang = "ar" as const,
}: {
  userId: string;
  activeCapabilities: string[];
  lang?: "ar" | "en";
}) {
  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy text-sm mb-3">{t("profile.capabilitiesTitle", lang)}</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {activeCapabilities.map((cap) => {
          const { label, icon } = getCapabilityLabel(cap, lang);
          return (
            <span key={cap} className="flex items-center gap-1.5 rounded-full bg-navy/5 text-navy px-3 py-1.5 text-xs font-bold">
              <span>{icon}</span>
              <span>{label}</span>
            </span>
          );
        })}
      </div>
      <ActivateCapabilityButton userId={userId} activeCapabilities={activeCapabilities} />
    </Card>
  );
}
