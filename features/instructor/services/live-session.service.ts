import { SupabaseClient } from "@supabase/supabase-js";

export interface InstructorLiveSession {
  id: string;
  title: string;
  meeting_link: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

/** RLS ("Live sessions: instructor manages own") scopes this to instructor_id = auth.uid(). */
export async function getMyLiveSessions(
  supabase: SupabaseClient,
  courseId: string
): Promise<InstructorLiveSession[]> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("id, title, meeting_link, scheduled_at, duration_minutes, status")
    .eq("course_id", courseId)
    .order("scheduled_at");

  if (error) throw new Error(error.message);
  return data || [];
}
