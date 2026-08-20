"use client";

import { useState } from "react";
import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";
import { Card, EmptyState, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import {
  IncomingInstructorRequest,
} from "@/features/instructors/services/instructors.service";
import {
  acceptAssignment,
  declineAssignment,
  AcceptFailureReason,
} from "@/features/instructors/services/instructor.client";

/**
 * Batch 1 of the instructor delivery UI: respond to incoming requests.
 * Messaging and rating are separate later batches and are not here.
 *
 * ONE DIRECTION ONLY (migration 076): a learner invites an instructor,
 * never the reverse. So there is no "invite a learner" control here, and
 * correspondingly no accept button anywhere on the learner's side — the
 * schema still carries `initiated_by`, but since 076 it can only ever
 * hold 'learner'. See DOMAIN_CONTRACTS.md §14 before adding either.
 *
 * The price shown is the SNAPSHOT stored on the row when the learner
 * made the request, and it is display-only: the client never sends an
 * amount, and accept_instructor_assignment() re-reads the same column
 * server-side when it charges (027).
 *
 * No learner name is shown because none can be read — `profiles` SELECT
 * is owner-only, so an instructor has no access to the requester's
 * profile row. The learner's own note, the price and the date are what
 * is available to decide on.
 */
export function IncomingRequestsPanel({
  requests: initialRequests,
  lang,
}: {
  requests: IncomingInstructorRequest[];
  lang: Lang;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === "pending");

  function failureMessage(reason: AcceptFailureReason, balance?: number, required?: number): string {
    switch (reason) {
      case "insufficient_balance":
        return t("instructors.errInsufficientBalance", lang)
          .replace("{required}", String(required ?? 0))
          .replace("{balance}", String(balance ?? 0));
      case "not_pending":
        return t("instructors.errNotPending", lang);
      case "not_authorized":
        return t("instructors.errNotAuthorized", lang);
      case "assignment_not_found":
        return t("instructors.errNotFound", lang);
      default:
        return t("instructors.errUnknown", lang);
    }
  }

  function markAnswered(id: string, status: "accepted" | "declined") {
    setRequests((rs) => rs.map((r) => (r.assignmentId === id ? { ...r, status } : r)));
  }

  async function onAccept(req: IncomingInstructorRequest) {
    setBusyId(req.assignmentId);
    setError(null);
    setNotice(null);
    try {
      const result = await acceptAssignment(req.assignmentId);
      if (!result.ok) {
        setError(failureMessage(result.reason, result.balance, result.required));
        // 'not_pending' means someone/something already answered it, so
        // the row on screen is stale — reflect that rather than leaving a
        // button that will keep failing.
        if (result.reason === "not_pending") markAnswered(req.assignmentId, "accepted");
        return;
      }
      markAnswered(req.assignmentId, "accepted");
      setNotice(
        t("instructors.acceptedToast", lang).replace("{price}", String(result.coinsCharged))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onDecline(req: IncomingInstructorRequest) {
    setBusyId(req.assignmentId);
    setError(null);
    setNotice(null);
    try {
      const result = await declineAssignment(req.assignmentId);
      if (!result.ok) {
        setError(
          result.reason === "not_pending"
            ? t("instructors.errNotPending", lang)
            : t("instructors.errUnknown", lang)
        );
        if (result.reason === "not_pending") markAnswered(req.assignmentId, "declined");
        return;
      }
      markAnswered(req.assignmentId, "declined");
      setNotice(t("instructors.declinedToast", lang));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="font-display font-bold text-navy text-sm mb-1">
        {t("instructors.incomingTitle", lang)}
      </h2>
      <p className="text-xs text-ink-soft mb-3">{t("instructors.incomingIntro", lang)}</p>

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

      {pending.length === 0 ? (
        <EmptyState message={t("instructors.incomingEmpty", lang)} icon="📥" />
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((req) => (
            <Card key={req.assignmentId} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-bold rounded-full px-3 py-1 bg-orange/10 text-orange-dark shrink-0">
                  {t("instructors.pending", lang)}
                </span>
                <span className="text-xs text-ink-soft">
                  {new Date(req.createdAt).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                </span>
              </div>

              {/* Name and avatar come from 077's function, never from a
                  join — profiles is owner-only, so a join would silently
                  resolve to null. A missing name falls back to a label
                  rather than rendering blank. */}
              <div className="flex items-center gap-2 mb-3">
                {req.learnerAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={req.learnerAvatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-line"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-sm"
                  >
                    🧑
                  </span>
                )}
                <span className="font-bold text-ink text-sm">
                  {req.learnerName || t("instructors.unnamedLearner", lang)}
                </span>
              </div>

              <p className="text-xs font-bold text-ink-soft mb-1">
                {t("instructors.requestContext", lang)}
              </p>
              <p className="text-sm text-ink leading-relaxed mb-3">
                {req.context || t("instructors.noContext", lang)}
              </p>

              {/* The charge is stated before the button, not after it. */}
              <p className="text-xs font-semibold text-orange-dark bg-orange/10 rounded-lg px-3 py-2 mb-3">
                {t("instructors.chargeWarning", lang).replace("{price}", String(req.priceCoins))}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => onAccept(req)}
                  disabled={busyId !== null}
                  className="text-sm"
                >
                  {busyId === req.assignmentId
                    ? t("instructors.accepting", lang)
                    : `${t("instructors.accept", lang)} — ${req.priceCoins} ${t("nav.walletLabel", lang)}`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onDecline(req)}
                  disabled={busyId !== null}
                  className="text-sm"
                >
                  {busyId === req.assignmentId
                    ? t("instructors.declining", lang)
                    : t("instructors.decline", lang)}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
