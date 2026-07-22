"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card, EmptyState, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { PendingReviewLesson } from "@/features/instructor/services/curriculum-contribution.service";

/**
 * canFinalize (content.manage) always takes precedence server-side — see
 * /api/instructor/review/vote. Someone who holds content.manage only
 * ever gets the decisive controls here, never the peer-vote buttons,
 * so the UI can't imply a vote is "just a peer opinion" when the API
 * would actually treat it as the final owner decision.
 */
export function ReviewQueue({
  initialLessons,
  canFinalize,
  canPeerVote,
}: {
  initialLessons: PendingReviewLesson[];
  canFinalize: boolean;
  canPeerVote: boolean;
}) {
  const { t } = useLang("ar");
  const [lessons, setLessons] = useState(initialLessons);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function castVote(lessonId: string, vote: "approve" | "reject" | "needs_revision") {
    setLoadingId(lessonId);
    setError(null);
    try {
      const res = await fetch("/api/instructor/review/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, vote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.somethingWentWrong"));
        return;
      }
      if (data.decisive) {
        setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      } else {
        setLessons((prev) =>
          prev.map((l) => (l.id === lessonId ? { ...l, votes: { ...l.votes, [vote]: l.votes[vote] + 1 } } : l))
        );
      }
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setLoadingId(null);
    }
  }

  if (lessons.length === 0) {
    return <EmptyState message={t("instructor.reviewQueueEmpty")} icon="✅" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorState message={error} />}
      {lessons.map((lesson) => (
        <Card key={lesson.id} className="p-5">
          <p className="font-bold text-navy">{lesson.title}</p>
          <p className="text-xs text-ink-soft mt-1">
            {lesson.course_title} · {lesson.module_title}
            {lesson.submitted_by && ` · ${t("instructor.submittedBy")} ${lesson.submitted_by}`}
          </p>
          <p className="text-xs text-ink-soft mt-1">
            {t("instructor.reviewStatusLabel")}: {t(`instructor.reviewStatus_${lesson.review_status}` as any)}
          </p>
          <p className="text-xs text-ink-soft mt-1">
            👍 {lesson.votes.approve} · 👎 {lesson.votes.reject} · ✏️ {lesson.votes.needs_revision}
          </p>

          <div className="flex gap-2 mt-3">
            {canFinalize ? (
              <>
                <Button onClick={() => castVote(lesson.id, "approve")} disabled={loadingId === lesson.id}>
                  {t("instructor.finalApprove")}
                </Button>
                <Button variant="ghost" onClick={() => castVote(lesson.id, "reject")} disabled={loadingId === lesson.id}>
                  {t("instructor.finalReject")}
                </Button>
                <Button variant="ghost" onClick={() => castVote(lesson.id, "needs_revision")} disabled={loadingId === lesson.id}>
                  {t("instructor.finalNeedsRevision")}
                </Button>
              </>
            ) : canPeerVote ? (
              <>
                <Button onClick={() => castVote(lesson.id, "approve")} disabled={loadingId === lesson.id}>
                  {t("lms.approve")}
                </Button>
                <Button variant="ghost" onClick={() => castVote(lesson.id, "reject")} disabled={loadingId === lesson.id}>
                  {t("lms.reject")}
                </Button>
                <Button variant="ghost" onClick={() => castVote(lesson.id, "needs_revision")} disabled={loadingId === lesson.id}>
                  {t("instructor.finalNeedsRevision")}
                </Button>
              </>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
