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

export interface LessonAgentContext {
  title: string;
  courseTitle: string;
  bodyAr: string | null;
  bodyEn: string | null;
  vocabulary: { en: string; ar: string }[];
  grammarPoint: { title: string; explanation: string } | null;
  truncated: boolean;
}

// Hard caps, not suggestions: this block is prepended to EVERY message
// the floating agent sends from a lesson page, so an unusually long
// lesson body would otherwise inflate the cost of every single turn.
const MAX_BODY_CHARS = 1200;
const MAX_GRAMMAR_CHARS = 600;
const MAX_VOCAB_ITEMS = 25;

function clip(text: string | null | undefined, max: number): { value: string | null; clipped: boolean } {
  if (!text) return { value: null, clipped: false };
  const trimmed = text.trim();
  if (trimmed.length <= max) return { value: trimmed, clipped: false };
  return { value: `${trimmed.slice(0, max)}…`, clipped: true };
}

/**
 * The lesson the user is currently reading, shaped for the agent's
 * system prompt (features/agent/prompt.ts `buildLessonContextBlock`).
 *
 * Deliberately a separate, narrower query from `getLessonDetail` — this
 * one is called per agent *message*, not per page render, so it skips
 * everything the agent has no use for (progress, quizzes, neighbors) and
 * truncates the rest.
 *
 * Security note: the caller passes only a lesson id. Visibility is
 * decided by the same RLS policy as everywhere else ("Lessons: enrolled
 * or free preview"), so a user asking their agent about a lesson they
 * can't open gets `null` here, and the agent simply has no lesson
 * context — not a leak.
 */
export async function getLessonAgentContext(
  supabase: SupabaseClient,
  lessonId: string
): Promise<LessonAgentContext | null> {
  const { data: lesson } = await supabase
    .from("lessons")
    .select("title, content, translations, modules(courses(title))")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) return null;

  const translations = (lesson.translations as any) || {};
  const content = (lesson.content as any) || {};

  const ar = clip(translations.ar?.body, MAX_BODY_CHARS);
  const en = clip(translations.en?.body, MAX_BODY_CHARS);
  const grammarExplanation = clip(content.grammar_point?.explanation_ar, MAX_GRAMMAR_CHARS);

  const allVocab: { en: string; ar: string }[] = Array.isArray(content.vocabulary) ? content.vocabulary : [];
  const vocabulary = allVocab.slice(0, MAX_VOCAB_ITEMS);

  return {
    title: lesson.title,
    courseTitle: (lesson.modules as any)?.courses?.title || "",
    bodyAr: ar.value,
    bodyEn: en.value,
    vocabulary,
    grammarPoint: content.grammar_point
      ? {
          title: content.grammar_point.title_ar || content.grammar_point.title_en || "",
          explanation: grammarExplanation.value || "",
        }
      : null,
    truncated: ar.clipped || en.clipped || grammarExplanation.clipped || allVocab.length > MAX_VOCAB_ITEMS,
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
