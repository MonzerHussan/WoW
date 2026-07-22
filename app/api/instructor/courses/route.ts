import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { createPersonalCourseSchema } from "@/shared/schemas/instructor.schema";
import { logger } from "@/shared/lib/logger";

function generateInviteCode() {
  return randomBytes(6).toString("base64url");
}

/**
 * POST /api/instructor/courses
 * Body: { title: string, track: 'education'|'employment'|'promotion', summary?: string }
 *
 * Creates a personal, invite-only course (owner_type='user', is_published
 * false — never listed in the public catalog, per Sprint 4 instructor
 * spec). Server-side only because invite_code generation needs a
 * unique-constraint retry loop; the insert itself is still fully
 * RLS-enforced under the caller's own session (no service_role).
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: capability } = await supabase
    .from("user_capabilities")
    .select("capability")
    .eq("user_id", user.id)
    .eq("capability", "instructor")
    .maybeSingle();
  if (!capability) {
    return NextResponse.json({ error: "Instructor capability required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPersonalCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { title, track, summary } = parsed.data;

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const inviteCode = generateInviteCode();
    const { data: course, error } = await supabase
      .from("courses")
      .insert({
        title,
        track,
        summary: summary || null,
        owner_type: "user",
        owner_id: user.id,
        is_published: false,
        invite_code: inviteCode,
      })
      .select("id, title, invite_code")
      .single();

    if (!error && course) {
      logger.info("instructor_course_created", { userId: user.id, courseId: course.id });
      return NextResponse.json({ course });
    }

    // 23505 = unique_violation — retry with a fresh invite_code.
    if (error?.code !== "23505") {
      logger.error("instructor_course_create_failed", { userId: user.id, error: error?.message });
      return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }
  }

  logger.error("instructor_course_invite_code_exhausted", { userId: user.id });
  return NextResponse.json({ error: "Failed to create course, please try again" }, { status: 500 });
}
