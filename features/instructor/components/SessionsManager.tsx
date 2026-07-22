"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { InstructorLiveSession } from "@/features/instructor/services/live-session.service";
import { SessionScheduler } from "@/features/instructor/components/SessionScheduler";

export function SessionsManager({
  courseId,
  instructorId,
  initialSessions,
}: {
  courseId: string;
  instructorId: string;
  initialSessions: InstructorLiveSession[];
}) {
  const { t, lang } = useLang("ar");
  const [sessions, setSessions] = useState(initialSessions);

  return (
    <div className="flex flex-col gap-4">
      {sessions.length === 0 ? (
        <EmptyState message={t("instructor.noSessionsYet")} icon="🎥" />
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4">
              <p className="font-bold text-navy text-sm">{s.title}</p>
              <p className="text-xs text-ink-soft mt-1">
                {new Date(s.scheduled_at).toLocaleString(lang === "ar" ? "ar" : "en")} · {s.duration_minutes}{" "}
                {t("instructor.minutesShort")}
              </p>
              <p className="text-xs text-ink-soft break-all mt-1">{s.meeting_link}</p>
            </Card>
          ))}
        </div>
      )}

      <SessionScheduler
        courseId={courseId}
        instructorId={instructorId}
        onScheduled={(session) => setSessions((prev) => [...prev, session])}
      />
    </div>
  );
}
