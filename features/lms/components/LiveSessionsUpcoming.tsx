"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { UpcomingLiveSession } from "@/features/lms/services/live-session.service";

/**
 * Attendance here is self-reported (the student clicks "joined" after the
 * link opens) — it is not verified by the meeting provider. Never treat
 * live_session_attendance as proof of real attendance elsewhere in the app.
 */
export function LiveSessionsUpcoming({
  sessions: initialSessions,
  userId,
}: {
  sessions: UpcomingLiveSession[];
  userId: string;
}) {
  const { t, lang } = useLang("ar");
  const [sessions, setSessions] = useState(initialSessions);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(session: UpcomingLiveSession) {
    window.open(session.meeting_link, "_blank", "noopener,noreferrer");
    if (session.joined) return;

    setLoadingId(session.id);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { error: insertError } = await supabase
        .from("live_session_attendance")
        .upsert(
          { session_id: session.id, user_id: userId, joined_at: new Date().toISOString() },
          { onConflict: "session_id,user_id", ignoreDuplicates: true }
        );
      if (insertError) {
        setError(translateAuthError(insertError, lang));
        return;
      }
      setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, joined: true } : s)));
    } catch (err) {
      setError(translateAuthError(err, lang));
    } finally {
      setLoadingId(null);
    }
  }

  if (sessions.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="font-display font-bold text-navy mb-3">{t("lms.upcomingSessionsTitle")}</h2>
      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-line/60 pt-3 first:border-t-0 first:pt-0">
            <div>
              <p className="font-semibold text-sm text-ink">{s.title}</p>
              <p className="text-xs text-ink-soft">
                {new Date(s.scheduled_at).toLocaleString(lang === "ar" ? "ar" : "en")} · {s.duration_minutes}{" "}
                {t("lms.minutes")}
              </p>
            </div>
            <Button onClick={() => handleJoin(s)} disabled={loadingId === s.id}>
              {s.joined ? t("lms.rejoinSession") : t("lms.joinSession")}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
