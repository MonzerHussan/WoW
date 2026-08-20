"use client";

import { useState } from "react";
import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";
import { Card, EmptyState, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { InstructorReviewRow } from "@/features/instructors/services/instructors.service";
import { reviewInstructor } from "@/features/instructors/services/instructor.client";

/**
 * The owner's queue. ONE list, TWO reasons to be in it:
 *   - approval_status = 'pending'  — a new (or re-submitted) application
 *   - needs_review = true          — an approved profile edited since
 *
 * They share a list because the owner's decision is identical in both
 * cases; a badge distinguishes them. The edited-after-approval case
 * stays VISIBLE to learners while it waits — hiding an instructor over
 * a corrected typo in their bio would cut their income for a
 * formality, which is why the trigger flags rather than unpublishes.
 *
 * Price changes deliberately do NOT appear here: 040 pins the price
 * into the assignment at request time and 074 charges the snapshot
 * stored on the row, so a price change cannot alter an existing
 * request. Routing routine commercial decisions through the owner
 * would make them a bottleneck for no protection.
 *
 * Lives in features/instructors/ rather than features/admin/ even
 * though its host page is /admin/roles: it reads instructor services,
 * and a feature may not import from a sibling feature (CLAUDE.md #1 —
 * the rule TECH_DEBT #14 already logs violations of). The admin PAGE
 * composes the two features, which is exactly what app/ is for.
 */
export function InstructorReviewQueue({
  rows: initialRows,
  lang,
}: {
  rows: InstructorReviewRow[];
  lang: Lang;
}) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function act(userId: string, approve: boolean) {
    setBusyId(userId);
    setError(null);
    setNotice(null);
    try {
      const result = await reviewInstructor(userId, approve, notes[userId]);
      if (!result.ok) {
        setError(
          result.reason === "forbidden"
            ? t("instructors.reviewNotAuthorized", lang)
            : t("instructors.reviewFailed", lang)
        );
        return;
      }
      // Reviewed rows leave the queue — approving clears needs_review
      // and rejecting sets a terminal status, so neither belongs here.
      setRows((rs) => rs.filter((r) => r.userId !== userId));
      setNotice(approve ? t("instructors.reviewApproved", lang) : t("instructors.reviewRejected", lang));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="font-display font-bold text-navy text-sm mb-1">
        {t("instructors.reviewQueueTitle", lang)}
      </h2>
      <p className="text-xs text-ink-soft mb-3">{t("instructors.reviewQueueIntro", lang)}</p>

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      {notice && (
        <div className="mb-3 bg-navy/5 border border-navy/20 rounded-lg px-3 py-2">
          <p className="text-sm font-semibold text-navy">{notice}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState message={t("instructors.reviewQueueEmpty", lang)} icon="✅" />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.userId} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span
                  className={`text-xs font-bold rounded-full px-3 py-1 shrink-0 ${
                    row.approvalStatus === "pending"
                      ? "bg-orange/10 text-orange-dark"
                      : "bg-navy/10 text-navy"
                  }`}
                >
                  {row.approvalStatus === "pending"
                    ? t("instructors.newApplication", lang)
                    : t("instructors.needsReviewBadge", lang)}
                </span>
                <span className="text-xs text-ink-soft">
                  {new Date(row.updatedAt).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                </span>
              </div>

              <p className="font-bold text-ink mb-1">{row.displayName}</p>
              {row.bio && <p className="text-sm text-ink leading-relaxed mb-2">{row.bio}</p>}

              <p className="text-xs text-ink-soft mb-1">
                {t("instructors.priceLabel", lang)}: {row.priceCoins} {t("nav.walletLabel", lang)}
                {row.yearsExperience != null && ` · ${t("instructors.yearsExperience", lang)}: ${row.yearsExperience}`}
              </p>
              {row.expertiseTags.length > 0 && (
                <p className="text-xs text-ink-soft mb-3">
                  {t("instructors.expertiseTags", lang)}: {row.expertiseTags.join("، ")}
                </p>
              )}

              <input
                className="field-input text-sm mb-2"
                placeholder={t("instructors.reviewNotePlaceholder", lang)}
                value={notes[row.userId] || ""}
                onChange={(e) => setNotes((n) => ({ ...n, [row.userId]: e.target.value }))}
              />

              <div className="flex items-center gap-2">
                <Button onClick={() => act(row.userId, true)} disabled={busyId !== null} className="text-sm">
                  {busyId === row.userId ? t("instructors.reviewWorking", lang) : t("instructors.reviewApprove", lang)}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => act(row.userId, false)}
                  disabled={busyId !== null}
                  className="text-sm"
                >
                  {busyId === row.userId ? t("instructors.reviewWorking", lang) : t("instructors.reviewReject", lang)}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
