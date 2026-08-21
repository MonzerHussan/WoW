import { SupabaseClient } from "@supabase/supabase-js";

/**
 * DEFINITION OF `enrollments.progress` — written here because the column
 * had none anywhere, which is how it stayed 0 for every row ever created:
 *
 *   progress = the percentage of the COURSE'S LESSONS that this user has
 *              completed, rounded to a whole number, 0..100.
 *
 * It counts lessons and nothing else. Quizzes, the project, and coins are
 * deliberately excluded: the number is a reading meter, and mixing an
 * assessment into it would make a learner who finished every lesson see
 * less than 100% with nothing left to read.
 *
 * WHY THIS EXISTS AT ALL. Nothing in the codebase ever wrote this column —
 * confirmed by walking the whole of Level 1 as a fresh account on
 * 2026-08-20: 19 of 19 lessons completed, `progress` still 0. The agent
 * reads it to tell the learner `"<course>" (N% done)`, so every user was
 * being told they had done 0% no matter what they finished.
 *
 * `status` IS DELIBERATELY NOT TOUCHED HERE. Moving an enrollment to
 * 'completed' at 100% lessons would declare a certificated course finished
 * while its final assessment is still unmarked — and what "completed"
 * must mean is exactly the open question behind the certificate work.
 * Until that is decided, this function only ever writes `progress`.
 */
export async function recomputeEnrollmentProgress(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<{ courseId: string; progress: number } | null> {
  // Which course does this lesson belong to?
  const { data: lessonRow } = await supabase
    .from("lessons")
    .select("id, modules(course_id)")
    .eq("id", lessonId)
    .maybeSingle();

  const courseId = (lessonRow as any)?.modules?.course_id as string | undefined;
  if (!courseId) return null;

  // Total lessons in the course, and how many this user has completed.
  // Both are counted through the same join so a lesson that moves module
  // cannot be counted in one and not the other.
  const [{ count: total }, { data: doneRows }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, modules!inner(course_id)", { count: "exact", head: true })
      .eq("modules.course_id", courseId),
    supabase
      .from("lesson_progress")
      .select("lesson_id, lessons!inner(modules!inner(course_id))")
      .eq("user_id", userId)
      .eq("completed", true)
      .eq("lessons.modules.course_id", courseId),
  ]);

  if (!total || total === 0) return null;
  const done = (doneRows || []).length;
  const progress = Math.min(100, Math.round((done * 100) / total));

  // Own-row update, allowed by the enrollment owner policy — no definer
  // function needed. `.select()` so an RLS-filtered zero-row update is
  // distinguishable from a real one (the silent-success class this repo
  // has been bitten by repeatedly).
  const { data: updated } = await supabase
    .from("enrollments")
    .update({ progress })
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle();

  if (!updated) return null;
  return { courseId, progress };
}
