import { t } from "@/shared/i18n/translations";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { ProfileOverview } from "@/features/profile/services/profile.service";

function AxisSummary({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <span className="text-ink-soft">—</span>;
  return (
    <span className="text-ink-soft">
      {entries
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .join(" · ")}
    </span>
  );
}

export function DnaAxesPanel({ dna, lang = "ar" as const }: { dna: ProfileOverview["dna"]; lang?: "ar" | "en" }) {
  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy text-sm mb-3">{t("profile.dnaTitle", lang)}</h3>
      {!dna ? (
        <EmptyState message={t("profile.dnaEmpty", lang)} icon="🧬" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-bg rounded-lg p-3">
            <p className="font-bold text-ink mb-1">{t("profile.dnaIdentity", lang)}</p>
            <AxisSummary data={dna.identity} />
          </div>
          <div className="bg-bg rounded-lg p-3">
            <p className="font-bold text-ink mb-1">{t("profile.dnaLearning", lang)}</p>
            <AxisSummary data={dna.learning} />
          </div>
          <div className="bg-bg rounded-lg p-3">
            <p className="font-bold text-ink mb-1">{t("profile.dnaExperience", lang)}</p>
            <AxisSummary data={dna.experience} />
          </div>
          <div className="bg-bg rounded-lg p-3">
            <p className="font-bold text-ink mb-1">{t("profile.dnaPersonality", lang)}</p>
            <AxisSummary data={dna.personality} />
          </div>
        </div>
      )}
    </Card>
  );
}
