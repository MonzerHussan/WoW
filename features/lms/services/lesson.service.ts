import { SupabaseClient } from "@supabase/supabase-js";

export interface LessonNeighbor {
  id: string;
  title: string;
}

export interface LessonDetail {
  id: string;
  title: string;
  content: Record<string, unknown>;
  translations: Record<string, { title?: string; body?: string }>;
  video_url: string | null;
  duration_minutes: number | null;
  is_free_preview: boolean;
  module_id: string;
  course_id: string;
  course_title: string;
  completed: boolean;
  quizzes: { id: string; title: string }[];
  prevLesson: LessonNeighbor | null;
  nextLesson: LessonNeighbor | null;
}

/**
 * Prev/next across the whole course, not just within the current module —
 * the last lesson of module 2 links forward to the first lesson of module 3.
 * Ordering is (module.order_index, lesson.order_index), matching how the
 * course page itself renders the tree.
 *
 * RLS ("Lessons: enrolled or free preview") filters this list exactly as it
 * filters everything else, so a locked lesson simply isn't a neighbor — a
 * free-preview visitor gets navigation only between the previews they can
 * actually open, which is the correct behavior, not a gap to work around.
 */
async function getLessonNeighbors(supabase: SupabaseClient, courseId: string, lessonId: string) {
  const { data: modules } = await supabase
    .from("modules")
    .select("order_index, lessons(id, title, order_index)")
    .eq("course_id", courseId)
    .order("order_index");

  const ordered: LessonNeighbor[] = (modules || [])
    .slice()
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .flatMap((m: any) =>
      ((m.lessons || []) as any[])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((l) => ({ id: l.id, title: l.title }))
    );

  const index = ordered.findIndex((l) => l.id === lessonId);
  if (index === -1) return { prevLesson: null, nextLesson: null };

  return {
    prevLesson: index > 0 ? ordered[index - 1] : null,
    nextLesson: index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

/**
 * RLS ("Lessons: enrolled or free preview") already decides whether this
 * row is visible at all — a null result here means "locked", not "missing".
 */
export async function getLessonDetail(
  supabase: SupabaseClient,
  lessonId: string,
  userId: string | null
): Promise<LessonDetail | null> {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(
      "id, title, content, translations, video_url, duration_minutes, is_free_preview, module_id, modules(course_id, courses(title)), quizzes(id, title)"
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!lesson) return null;

  let completed = false;
  if (userId) {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("completed")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    completed = !!progress?.completed;
  }

  const moduleRow = lesson.modules as any;
  const courseId = moduleRow?.course_id;

  const { prevLesson, nextLesson } = courseId
    ? await getLessonNeighbors(supabase, courseId, lessonId)
    : { prevLesson: null, nextLesson: null };

  return {
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    translations: (lesson.translations as any) || {},
    video_url: lesson.video_url,
    duration_minutes: lesson.duration_minutes,
    is_free_preview: lesson.is_free_preview,
    module_id: lesson.module_id,
    course_id: courseId,
    course_title: moduleRow?.courses?.title || "",
    completed,
    quizzes: (lesson.quizzes as any) || [],
    prevLesson,
    nextLesson,
  };
}
