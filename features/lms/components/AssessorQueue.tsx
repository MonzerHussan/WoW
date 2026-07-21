"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { PendingAttempt } from "@/features/lms/services/quiz.service";

export function AssessorQueue({ initialAttempts }: { initialAttempts: PendingAttempt[] }) {
  const { t, lang } = useLang("ar");
  const [attempts, setAttempts] = useState(initialAttempts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function grade(attemptId: string, approve: boolean) {
    setLoadingId(attemptId);
    setError(null);
    try {
      const res = await fetch("/api/lms/quizzes/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, approve }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.somethingWentWrong"));
        return;
      }
      setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setLoadingId(null);
    }
  }

  if (attempts.length === 0) {
    return <EmptyState message={t("lms.assessorQueueEmpty")} icon="✅" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorState message={error} />}
      {attempts.map((attempt) => (
        <Card key={attempt.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-navy">{attempt.quiz_title}</p>
            <p className="text-sm text-ink-soft">{attempt.user_name}</p>
            <p className="text-xs text-ink-soft">
              {attempt.score != null ? `${attempt.score}%` : "—"}
              {attempt.review_deadline && (
                <>
                  {" · "}
                  {t("lms.reviewDeadline")}: {new Date(attempt.review_deadline).toLocaleString(lang === "ar" ? "ar" : "en")}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => grade(attempt.id, true)} disabled={loadingId === attempt.id}>
              {loadingId === attempt.id ? t("lms.grading") : t("lms.approve")}
            </Button>
            <Button variant="ghost" onClick={() => grade(attempt.id, false)} disabled={loadingId === attempt.id}>
              {t("lms.reject")}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
