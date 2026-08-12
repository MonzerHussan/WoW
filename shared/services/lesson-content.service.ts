import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin CMS read/write for shared-curriculum lessons — separate from
 * features/lms/services/lesson.service.ts (the student-facing reader)
 * because features may not import from sibling features, and this one
 * is deliberately privileged (content.manage-gated columns like
 * review_status/draft_content that a student must never receive).
 *
 * IMPORTANT: never add draft_content to any select() used by a
 * student-facing path — see 063's own header. This file is the ONE
 * place draft_content is meant to be read, and it is only ever called
 * from the admin content routes (content.manage-gated by RLS anyway,
 * but the column list itself is a second, deliberate layer).
 */
export interface AdminCourseRow {
  id: string;
  title: string;
  order_index: number;
}

export async function listSharedCourses(supabase: SupabaseClient): Promise<AdminCourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, order_index")
    .is("owner_type", null)
    .order("order_index");

  if (error) throw new Error(error.message);
  return (data || []) as AdminCourseRow[];
}

export interface AdminModuleRow {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

export async function listModulesForCourse(supabase: SupabaseClient, courseId: string): Promise<AdminModuleRow[]> {
  const { data, error } = await supabase
    .from("modules")
    .select("id, course_id, title, order_index")
    .eq("course_id", courseId)
    .order("order_index");

  if (error) throw new Error(error.message);
  return (data || []) as AdminModuleRow[];
}

export interface AdminLessonListRow {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  review_status: string | null;
  has_pending_draft: boolean;
}

/**
 * `draft_content` has SELECT revoked from `authenticated`/`anon` at
 * the column level (063) — an approved lesson's row is otherwise
 * visible to any enrolled student via RLS, and RLS can't narrow which
 * COLUMNS a visible row exposes, only which ROWS. list_lessons_for_admin
 * is the only path that can see whether a draft is pending; it never
 * returns the draft text itself, just the boolean.
 */
export async function listLessonsForModule(supabase: SupabaseClient, moduleId: string): Promise<AdminLessonListRow[]> {
  const { data, error } = await supabase.rpc("list_lessons_for_admin", { p_module_id: moduleId });
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((row) => ({
    id: row.id,
    module_id: moduleId,
    title: row.title,
    order_index: row.orderIndex,
    review_status: row.reviewStatus,
    has_pending_draft: row.hasPendingDraft,
  }));
}

export interface AdminLessonDetailRow {
  id: string;
  title: string;
  content: Record<string, unknown>;
  draft_content: Record<string, unknown> | null;
  review_status: string | null;
}

/** get_lesson_for_admin (063) is the only path that can read draft_content — see the column-revoke note above. */
export async function getLessonForEditing(supabase: SupabaseClient, lessonId: string): Promise<AdminLessonDetailRow | null> {
  const { data, error } = await supabase.rpc("get_lesson_for_admin", { p_lesson_id: lessonId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    draft_content: data.draftContent,
    review_status: data.reviewStatus,
  };
}

/**
 * Calls save_lesson_draft() (063) — the function itself decides
 * whether to write to `content` (unpublished lesson) or `draft_content`
 * (already-live lesson) based on the row's current review_status, so
 * the caller never needs to know which case applies.
 */
export async function saveLessonDraft(
  supabase: SupabaseClient,
  lessonId: string,
  content: Record<string, unknown>
): Promise<{ saved: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc("save_lesson_draft", { p_lesson_id: lessonId, p_content: content });
  if (error) throw new Error(error.message);
  return data as { saved: boolean; reason?: string };
}

export async function publishLessonDraft(
  supabase: SupabaseClient,
  lessonId: string
): Promise<{ published: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc("publish_lesson_draft", { p_lesson_id: lessonId });
  if (error) throw new Error(error.message);
  return data as { published: boolean; reason?: string };
}
