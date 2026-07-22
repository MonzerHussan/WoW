import { SupabaseClient } from "@supabase/supabase-js";

export interface CourseSummary {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  language: string;
  track: string;
}

export interface LessonRow {
  id: string;
  title: string;
  duration_minutes: number | null;
  order_index: number;
  is_free_preview: boolean;
}

export interface ModuleWithLessons {
  id: string;
  title: string;
  order_index: number;
  lessons: LessonRow[];
}

export interface CourseQuiz {
  id: string;
  title: string;
  pmp_level: number | null;
}

export interface CourseDetail extends CourseSummary {
  modules: ModuleWithLessons[];
  isEnrolled: boolean;
  courseQuizzes: CourseQuiz[];
}

/** Guests and logged-in users alike — RLS already restricts to is_published = true. */
export async function getPublishedCourses(supabase: SupabaseClient): Promise<CourseSummary[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, summary, cover_url, language, track")
    .eq("is_published", true)
    .order("title");

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Course + module/lesson tree. Which lessons come back is entirely driven
 * by RLS ("Lessons: enrolled or free preview") — a non-enrolled guest only
 * ever receives free-preview rows, so there is no separate client-side
 * "locked" flag to compute here.
 *
 * No `.eq("is_published", true)` filter here (Sprint 4/instructor
 * change) — RLS alone now decides visibility: "Courses: published are
 * public" still covers the catalog case exactly as before, and "Courses:
 * enrolled can read own course" (014) additionally lets a student who
 * joined a personal/unpublished course via invite link reach its page. A
 * guest or non-enrolled user hitting an unpublished id still gets zero
 * rows, unchanged from before.
 */
export async function getCourseDetail(
  supabase: SupabaseClient,
  courseId: string,
  userId: string | null
): Promise<CourseDetail | null> {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, summary, cover_url, language, track")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) throw new Error(courseError.message);
  if (!course) return null;

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id, title, order_index, lessons(id, title, duration_minutes, order_index, is_free_preview)")
    .eq("course_id", courseId)
    .order("order_index");

  if (modulesError) throw new Error(modulesError.message);

  const modulesWithSortedLessons: ModuleWithLessons[] = (modules || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    order_index: m.order_index,
    lessons: (m.lessons || []).sort((a: LessonRow, b: LessonRow) => a.order_index - b.order_index),
  }));

  let isEnrolled = false;
  if (userId) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    isEnrolled = !!enrollment;
  }

  // Course-level assessments (e.g. a PMP level final exam) have course_id
  // set and lesson_id null — the `num_nonnulls(course_id, lesson_id) = 1`
  // constraint means this never overlaps with a lesson's own quizzes.
  const { data: courseQuizzes } = await supabase
    .from("quizzes")
    .select("id, title, pmp_level")
    .eq("course_id", courseId);

  return { ...course, modules: modulesWithSortedLessons, isEnrolled, courseQuizzes: courseQuizzes || [] };
}

/** Plain RLS-guarded insert — no points/side effects, so no API route needed. */
export async function enrollInCourse(supabase: SupabaseClient, userId: string, courseId: string) {
  return supabase
    .from("enrollments")
    .upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
}
