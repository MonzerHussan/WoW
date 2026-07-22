"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { InstructorLiveSession } from "@/features/instructor/services/live-session.service";

export function SessionScheduler({
  courseId,
  instructorId,
  onScheduled,
}: {
  courseId: string;
  instructorId: string;
  onScheduled: (session: InstructorLiveSession) => void;
}) {
  const { t } = useLang("ar");
  const [title, setTitle] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSchedule() {
    if (!title.trim() || !meetingLink.trim() || !scheduledAt) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { data, error: insertError } = await supabase
        .from("live_sessions")
        .insert({
          course_id: courseId,
          instructor_id: instructorId,
          title: title.trim(),
          meeting_link: meetingLink.trim(),
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: duration,
        })
        .select("id, title, meeting_link, scheduled_at, duration_minutes, status")
        .single();
      if (insertError || !data) {
        setError(translateAuthError(insertError, "ar"));
        return;
      }
      onScheduled(data);
      setTitle("");
      setMeetingLink("");
      setScheduledAt("");
      setDuration(60);
    } catch (err) {
      setError(translateAuthError(err, "ar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-3">
      <h2 className="font-display font-bold text-navy">{t("instructor.scheduleSessionTitle")}</h2>
      {error && <ErrorState message={error} />}
      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.sessionTitlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="border border-line rounded-lg px-3 py-2 text-sm"
        placeholder={t("instructor.meetingLinkPlaceholder")}
        value={meetingLink}
        onChange={(e) => setMeetingLink(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          type="datetime-local"
          className="border border-line rounded-lg px-3 py-2 text-sm flex-1"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <input
          type="number"
          min={15}
          step={15}
          className="border border-line rounded-lg px-3 py-2 text-sm w-28"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>
      <Button
        onClick={handleSchedule}
        disabled={loading || !title.trim() || !meetingLink.trim() || !scheduledAt}
      >
        {loading ? t("instructor.scheduling") : t("instructor.scheduleSessionSubmit")}
      </Button>
    </Card>
  );
}
