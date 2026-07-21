import { SupabaseClient } from "@supabase/supabase-js";

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
  return {
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    translations: (lesson.translations as any) || {},
    video_url: lesson.video_url,
    duration_minutes: lesson.duration_minutes,
    is_free_preview: lesson.is_free_preview,
    module_id: lesson.module_id,
    course_id: moduleRow?.course_id,
    course_title: moduleRow?.courses?.title || "",
    completed,
    quizzes: (lesson.quizzes as any) || [],
  };
}
