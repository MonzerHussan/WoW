"use client";

import { useState } from "react";
import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { FormField, Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { instructorApplicationSchema } from "@/shared/schemas/instructor-profile.schema";
import { MyInstructorProfile } from "@/features/instructors/services/instructors.service";
import { setInstructorAvailability } from "@/features/instructors/services/instructor.client";

/**
 * Apply to teach, and edit the profile afterwards. The UPDATE policy for
 * this row has existed since 040 with no screen at all — the same
 * backend-without-a-door shape as 074, so this closes it.
 *
 * WHAT THIS FORM CANNOT SEND, by construction: approval_status and
 * needs_review are not fields here and not in the zod schema. 078's
 * guard trigger refuses a client write to approval_status outright, so
 * including them would only produce a request the database rejects.
 *
 * Availability is a SEPARATE control, not part of the form, because it
 * is a different decision with a different owner: approval is the WOW
 * team's, availability is the instructor's. It is only offered once
 * approved — the trigger refuses is_available=true otherwise, and
 * showing a switch that always errors would be dishonest.
 */
export function InstructorProfileForm({
  profile,
  lang,
}: {
  profile: MyInstructorProfile | null;
  lang: Lang;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [tags, setTags] = useState((profile?.expertiseTags ?? []).join("، "));
  const [years, setYears] = useState(
    profile?.yearsExperience != null ? String(profile.yearsExperience) : ""
  );
  const [price, setPrice] = useState(String(profile?.priceCoins ?? 10));

  const [available, setAvailable] = useState(profile?.isAvailable ?? false);
  const [status, setStatus] = useState(profile?.approvalStatus ?? null);
  const [needsReview, setNeedsReview] = useState(profile?.needsReview ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const approved = status === "approved";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = instructorApplicationSchema.safeParse({
      displayName,
      bio,
      // Arabic comma is the natural separator in an Arabic UI; accept both.
      expertiseTags: tags
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean),
      yearsExperience: years === "" ? null : Number(years),
      priceCoins: Number(price),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t("instructors.applyFailed", lang));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/instructors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("instructors.applyFailed", lang));
        return;
      }
      setStatus(data.status);
      setSaved(true);
      // A rejected profile that goes back to pending is hidden again by
      // the function — reflect that rather than leaving a stale switch.
      if (data.status === "pending") {
        setAvailable(false);
        setNeedsReview(false);
      }
    } catch {
      setError(t("instructors.applyFailed", lang));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(next: boolean) {
    setError(null);
    const result = await setInstructorAvailability(next);
    if (!result.ok) {
      setError(
        result.reason === "not_approved"
          ? t("instructors.availabilityBlocked", lang)
          : t("instructors.applyFailed", lang)
      );
      return;
    }
    setAvailable(next);
  }

  return (
    <Card className="p-5 mb-8">
      <h2 className="font-display font-bold text-navy text-sm mb-1">
        {t("instructors.applyTitle", lang)}
      </h2>
      <p className="text-xs text-ink-soft mb-4">{t("instructors.applyIntro", lang)}</p>

      {status && <StatusBanner status={status} needsReview={needsReview} note={profile?.reviewNote ?? null} lang={lang} />}

      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      {saved && !error && (
        <div className="mb-3 bg-navy/5 border border-navy/20 rounded-lg px-3 py-2">
          <p className="text-sm font-semibold text-navy">
            {status === "pending" ? t("instructors.statusPendingHint", lang) : t("instructors.saveProfile", lang)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("instructors.displayName", lang)}>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <p className="text-xs text-ink-soft mt-1">{t("instructors.displayNameHint", lang)}</p>
        </FormField>

        <FormField label={t("instructors.bio", lang)}>
          <textarea
            className="field-input min-h-[90px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </FormField>

        <FormField label={t("instructors.expertiseTags", lang)}>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          <p className="text-xs text-ink-soft mt-1">{t("instructors.expertiseHint", lang)}</p>
        </FormField>

        <FormField label={t("instructors.yearsExperience", lang)}>
          <Input type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} />
        </FormField>

        <FormField label={t("instructors.priceLabelOwn", lang)}>
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          <p className="text-xs text-ink-soft mt-1">{t("instructors.priceHintOwn", lang)}</p>
        </FormField>

        <Button type="submit" disabled={saving}>
          {saving
            ? t("instructors.applySaving", lang)
            : status === null
            ? t("instructors.applySubmit", lang)
            : status === "rejected"
            ? t("instructors.applyResubmit", lang)
            : t("instructors.saveProfile", lang)}
        </Button>
      </form>

      {approved && (
        <div className="mt-5 pt-4 border-t border-line">
          <p className="text-xs font-bold text-ink-soft mb-2">{t("instructors.availabilityTitle", lang)}</p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => toggleAvailability(e.target.checked)}
            />
            <span className={available ? "font-semibold text-navy" : "text-ink-soft"}>
              {available ? t("instructors.availabilityOn", lang) : t("instructors.availabilityOff", lang)}
            </span>
          </label>
          <p className="text-xs text-ink-soft mt-1">{t("instructors.availabilityHint", lang)}</p>
        </div>
      )}
    </Card>
  );
}

function StatusBanner({
  status,
  needsReview,
  note,
  lang,
}: {
  status: "pending" | "approved" | "rejected";
  needsReview: boolean;
  note: string | null;
  lang: Lang;
}) {
  const map = {
    pending: { label: t("instructors.statusPending", lang), hint: t("instructors.statusPendingHint", lang), tone: "bg-orange/10 text-orange-dark border-orange/30" },
    approved: { label: t("instructors.statusApproved", lang), hint: "", tone: "bg-navy/5 text-navy border-navy/20" },
    rejected: { label: t("instructors.statusRejected", lang), hint: t("instructors.statusRejectedHint", lang), tone: "bg-orange/10 text-orange-dark border-orange/30" },
  }[status];

  return (
    <div className={`rounded-lg border px-3 py-2 mb-4 ${map.tone}`}>
      <p className="text-sm font-bold">{map.label}</p>
      {map.hint && <p className="text-xs mt-0.5">{map.hint}</p>}
      {status === "approved" && needsReview && (
        <p className="text-xs mt-1 font-semibold">
          {t("instructors.needsReviewBadge", lang)} — {t("instructors.needsReviewHint", lang)}
        </p>
      )}
      {note && (
        <p className="text-xs mt-1">
          <span className="font-bold">{t("instructors.reviewNoteLabel", lang)}:</span> {note}
        </p>
      )}
    </div>
  );
}
