import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";

/**
 * Invite-link landing: /join/[code] resolves an instructor's personal
 * course invite_code (014) to a course id and auto-enrolls the visiting
 * student, then redirects to the normal course page. The code only
 * solves *discovery* (finding an unpublished course's id) — the
 * enrollment insert itself was already open to any authenticated user
 * for any course id (see 014's migration header) — invite_code doesn't
 * change that, it's simply the only way to learn the id in the first
 * place.
 */
export default async function JoinByInviteCodePage({ params }: { params: { code: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) {
    redirect(`/login?redirectedFrom=/join/${params.code}`);
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("invite_code", params.code)
    .maybeSingle();

  if (!course) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center px-5 text-center">
        <p className="text-ink-soft">{t("instructor.inviteCodeInvalid", lang)}</p>
      </main>
    );
  }

  await supabase
    .from("enrollments")
    .upsert({ user_id: user.id, course_id: course.id }, { onConflict: "user_id,course_id", ignoreDuplicates: true });

  redirect(`/courses/${course.id}`);
}
