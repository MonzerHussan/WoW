import { t } from "@/shared/i18n/translations";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { SkillRow } from "@/features/profile/services/profile.service";

export function SkillsList({ skills, lang = "ar" as const }: { skills: SkillRow[]; lang?: "ar" | "en" }) {
  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy text-sm mb-3">{t("profile.skillsTitle", lang)}</h3>
      {skills.length === 0 ? (
        <EmptyState message={t("profile.skillsEmpty", lang)} icon="🧩" />
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {skills.map((skill) => (
            <div key={skill.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-semibold text-ink">{skill.name}</p>
                <p className="text-xs text-ink-soft">
                  {skill.evidenceCount} {t("profile.evidenceCount", lang)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full ${i < (skill.level || 0) ? "bg-navy" : "bg-line"}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
