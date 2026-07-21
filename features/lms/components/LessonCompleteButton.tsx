"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { REASON_POINTS } from "@/shared/constants/points";

export function LessonCompleteButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const router = useRouter();
  const { t } = useLang("ar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(completed);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lms/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.somethingWentWrong"));
        return;
      }
      setDone(true);
      // Server always uses the fixed LESSON_COMPLETE amount for this route
      // (shared/constants/points.ts) — not a client-trusted number, just
      // the known label for what this specific action always awards.
      if (!data.alreadyCompleted && !data.pointsError) setPointsEarned(REASON_POINTS.LESSON_COMPLETE);
      router.refresh();
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div>
        <div className="text-sm font-bold text-navy bg-navy/5 rounded-lg px-4 py-2 w-fit">{t("lms.lessonCompleted")}</div>
        {pointsEarned != null && (
          <p className="text-xs text-ink-soft mt-2">
            +{pointsEarned} {t("lms.pointsEarned")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      <Button onClick={handleComplete} disabled={loading}>
        {loading ? t("lms.completing") : t("lms.markComplete")}
      </Button>
    </div>
  );
}
