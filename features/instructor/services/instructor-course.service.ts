import { SupabaseClient } from "@supabase/supabase-js";

export interface MyCourseSummary {
  id: string;
  title: string;
  summary: string | null;
  track: string;
  invite_code: string | null;
  created_at: string;
}

export interface MyLessonRow {
  id: string;
  title: string;
  order_index: number;
}

export interface MyModuleWithLessons {
  id: string;
  title: string;
  order_index: number;
  lessons: MyLessonRow[];
}

export interface MyCourseDetail extends MyCourseSummary {
  modules: MyModuleWithLessons[];
}

/** RLS ("Courses: user-owner manages") already scopes this to owner_id = auth.uid(). */
export async function getMyCourses(supabase: SupabaseClient, userId: string): Promise<MyCourseSummary[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, summary, track, invite_code, created_at")
    .eq("owner_type", "user")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getMyCourseDetail(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<MyCourseDetail | null> {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, summary, track, invite_code, created_at")
    .eq("id", courseId)
    .eq("owner_type", "user")
    .eq("owner_id", userId)
    .maybeSingle();

  if (courseError) throw new Error(courseError.message);
  if (!course) return null;

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id, title, order_index, lessons(id, title, order_index)")
    .eq("course_id", courseId)
    .order("order_index");

  if (modulesError) throw new Error(modulesError.message);

  const modulesWithSortedLessons: MyModuleWithLessons[] = (modules || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    order_index: m.order_index,
    lessons: (m.lessons || []).sort((a: MyLessonRow, b: MyLessonRow) => a.order_index - b.order_index),
  }));

  return { ...course, modules: modulesWithSortedLessons };
}
