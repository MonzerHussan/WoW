import { t } from "@/shared/i18n/translations";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { CertificateRow } from "@/features/profile/services/profile.service";

export function CertificatesList({ certificates, lang = "ar" as const }: { certificates: CertificateRow[]; lang?: "ar" | "en" }) {
  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-navy text-sm mb-3">{t("profile.certificatesTitle", lang)}</h3>
      {certificates.length === 0 ? (
        <EmptyState message={t("profile.certificatesEmpty", lang)} icon="🏅" />
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {certificates.map((cert) => (
            <div key={cert.id} className="py-2.5">
              <p className="text-sm font-semibold text-ink">
                {cert.courseTitle}
                {cert.pmpLevel && ` — Level ${cert.pmpLevel}`}
              </p>
              <p className="text-xs text-ink-soft">
                {cert.certificateNo} · {new Date(cert.issuedAt).toLocaleDateString(lang === "ar" ? "ar" : "en")}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
