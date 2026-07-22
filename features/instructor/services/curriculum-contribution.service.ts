import { SupabaseClient } from "@supabase/supabase-js";

export interface SharedModule {
  id: string;
  title: string;
}

export interface SharedCourse {
  id: string;
  title: string;
  modules: SharedModule[];
}

/** owner_type is null = WOW's own shared curriculum, not a personal course (014). */
export async function getSharedCoursesWithModules(supabase: SupabaseClient): Promise<SharedCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, modules(id, title, order_index)")
    .is("owner_type", null)
    .order("title");

  if (error) throw new Error(error.message);

  return (data || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    modules: ((c.modules as any[]) || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((m) => ({ id: m.id, title: m.title })),
  }));
}

export interface ReviewVoteTally {
  approve: number;
  reject: number;
  needs_revision: number;
}

export interface PendingReviewLesson {
  id: string;
  title: string;
  review_status: string;
  course_title: string;
  module_title: string;
  submitted_by: string | null;
  votes: ReviewVoteTally;
}

/** Everything still short of a final owner decision — matches lessons.review_status's non-terminal states. */
const PENDING_STATES = ["nova_check_pending", "nova_check_failed", "human_review"];

/**
 * Scoped to shared courses only (owner_type is null) — personal-course
 * lessons (014) also default to a pending-looking review_status, but
 * they never go through this governance workflow at all (the owner is
 * their own sole approver), so they must never surface in this queue.
 */
export async function getPendingReviewLessons(supabase: SupabaseClient): Promise<PendingReviewLesson[]> {
  const { data: allLessons, error } = await supabase
    .from("lessons")
    .select(
      "id, title, review_status, module_id, modules(title, courses(title, owner_type)), profiles!last_edited_by(full_name)"
    )
    .in("review_status", PENDING_STATES);

  if (error) throw new Error(error.message);

  const lessons = (allLessons || []).filter((l: any) => l.modules?.courses?.owner_type === null);
  if (lessons.length === 0) return [];

  const lessonIds = lessons.map((l: any) => l.id);
  const { data: votes } = await supabase
    .from("content_review_votes")
    .select("lesson_id, voter_type, vote")
    .in("lesson_id", lessonIds)
    .neq("voter_type", "nova_check");

  const tallyByLesson = new Map<string, ReviewVoteTally>();
  (votes || []).forEach((v: any) => {
    const tally = tallyByLesson.get(v.lesson_id) || { approve: 0, reject: 0, needs_revision: 0 };
    tally[v.vote as keyof ReviewVoteTally] += 1;
    tallyByLesson.set(v.lesson_id, tally);
  });

  return lessons.map((l: any) => ({
    id: l.id,
    title: l.title,
    review_status: l.review_status,
    course_title: l.modules?.courses?.title || "",
    module_title: l.modules?.title || "",
    submitted_by: l.profiles?.full_name || null,
    votes: tallyByLesson.get(l.id) || { approve: 0, reject: 0, needs_revision: 0 },
  }));
}
