"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { QuizForTaking } from "@/features/lms/services/quiz.service";

export function QuizTaker({ quiz }: { quiz: QuizForTaking }) {
  const { t } = useLang("ar");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pendingReview: boolean; passed?: boolean; score: number } | null>(null);

  if (quiz.alreadyAttempted && !result) {
    return <p className="text-sm text-ink-soft">{t("lms.quizAlreadyAttempted")}</p>;
  }

  async function handleSubmit() {
    if (Object.keys(answers).length < quiz.questions.length) {
      setError(t("lms.answerAllQuestions"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lms/quizzes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("common.somethingWentWrong"));
        return;
      }
      setResult(data);
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="text-center">
        {result.pendingReview ? (
          <p className="font-semibold text-navy">{t("lms.quizPendingReview")}</p>
        ) : result.passed ? (
          <p className="font-semibold text-navy">{t("lms.quizPassed")}</p>
        ) : (
          <p className="font-semibold text-orange-dark">{t("lms.quizFailed")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorState message={error} />}
      {quiz.questions.map((q, i) => (
        <div key={q.id} className="flex flex-col gap-2">
          <p className="font-semibold text-ink">
            {i + 1}. {q.text}
          </p>
          <div className="flex flex-col gap-1.5">
            {q.options.map((opt, optIndex) => (
              <label
                key={optIndex}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
                  answers[q.id] === optIndex ? "border-navy bg-navy/5" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === optIndex}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: optIndex }))}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? t("lms.quizSubmitting") : t("lms.quizSubmit")}
      </Button>
    </div>
  );
}
