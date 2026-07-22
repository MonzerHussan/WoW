import { SupabaseClient } from "@supabase/supabase-js";

export interface UpcomingLiveSession {
  id: string;
  title: string;
  meeting_link: string;
  scheduled_at: string;
  duration_minutes: number;
  joined: boolean;
}

/**
 * RLS ("Live sessions: enrolled students read") already scopes this to
 * courses the caller is enrolled in — a non-enrolled visitor gets none.
 */
export async function getUpcomingLiveSessions(
  supabase: SupabaseClient,
  courseId: string,
  userId: string | null
): Promise<UpcomingLiveSession[]> {
  const { data: sessions, error } = await supabase
    .from("live_sessions")
    .select("id, title, meeting_link, scheduled_at, duration_minutes, status")
    .eq("course_id", courseId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at");

  if (error) throw new Error(error.message);
  if (!sessions || sessions.length === 0) return [];

  let joinedIds = new Set<string>();
  if (userId) {
    const { data: attendance } = await supabase
      .from("live_session_attendance")
      .select("session_id")
      .eq("user_id", userId)
      .in(
        "session_id",
        sessions.map((s) => s.id)
      );
    joinedIds = new Set((attendance || []).map((a: any) => a.session_id));
  }

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    meeting_link: s.meeting_link,
    scheduled_at: s.scheduled_at,
    duration_minutes: s.duration_minutes,
    joined: joinedIds.has(s.id),
  }));
}
