import { SupabaseClient } from "@supabase/supabase-js";

/**
 * LMS→DNA contract (DOMAIN_CONTRACTS.md §5): "quiz passed → entity_skills
 * (source='assessment') + points". Only called once a quiz attempt is
 * FINAL — auto mode immediately, human/hybrid only after assessor approval
 * (app/api/lms/quizzes/grade/route.ts). Looks up which skills the quiz's
 * course is tagged with (entity_skills where entity_type='course') and
 * credits each to the user with quiz_attempt evidence.
 *
 * If the course has no tagged skills yet, this is a silent no-op — there
 * is nothing to credit, and that's a content-authoring gap, not an error.
 */
export async function recordQuizPassSkills(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
  attemptId: string,
  score: number,
  verifiedBy: { type: "system" | "assessor"; id: string | null }
) {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("course_id, lesson_id")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return;

  let courseId = quiz.course_id as string | null;
  if (!courseId && quiz.lesson_id) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("modules(course_id)")
      .eq("id", quiz.lesson_id)
      .maybeSingle();
    courseId = (lesson as any)?.modules?.course_id ?? null;
  }
  if (!courseId) return;

  const { data: courseSkills } = await supabase
    .from("entity_skills")
    .select("skill_id")
    .eq("entity_type", "course")
    .eq("entity_id", courseId);
  if (!courseSkills || courseSkills.length === 0) return;

  // Naive score->level mapping (MVP): a stronger result claims a higher
  // level on the 1-5 scale used across entity_skills.
  const level = score >= 90 ? 5 : score >= 80 ? 4 : score >= 60 ? 3 : 2;

  for (const { skill_id } of courseSkills) {
    const { data: userSkill } = await supabase
      .from("entity_skills")
      .upsert(
        { entity_type: "user", entity_id: userId, skill_id, source: "assessment", level },
        { onConflict: "entity_type,entity_id,skill_id,source" }
      )
      .select("id")
      .single();
    if (!userSkill) continue;

    await supabase.from("skill_evidence").insert({
      entity_skill_id: userSkill.id,
      evidence_type: "quiz_attempt",
      ref_table: "quiz_attempts",
      ref_id: attemptId,
      submitted_by: userId,
      verified_by_type: verifiedBy.type,
      verified_by_id: verifiedBy.id,
      verified_at: new Date().toISOString(),
    });
  }
}

interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  tip: string;
}

/**
 * Scoring contract (DOMAIN_CONTRACTS.md §6): computed only by a
 * system_actor, inserted server-side, always a NEW career_scores row
 * (never an update), explanation is mandatory. No specific formula is
 * mandated by the contract — this is a deliberately simple, transparent
 * v1 heuristic (three countable signals, capped and weighted), not a
 * claim of a sophisticated model. Refine later without breaking the
 * explanation shape.
 */
export async function recomputeEmployabilityScore(supabase: SupabaseClient, userId: string) {
  const [{ count: verifiedSkills }, { count: passedQuizzes }, { count: completedLessons }] = await Promise.all([
    supabase
      .from("entity_skills")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "user")
      .eq("entity_id", userId)
      .in("source", ["assessment", "employer_verified", "certification_verified"]),
    supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("passed", true),
    supabase
      .from("lesson_progress")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
  ]);

  const factors: ScoreFactor[] = [
    {
      name: "المهارات الموثّقة",
      weight: 0.5,
      value: Math.min(100, (verifiedSkills || 0) * 10),
      tip: "أنجز المزيد من الاختبارات المعتمدة لتوثيق مهارات إضافية.",
    },
    {
      name: "الاختبارات المجتازة",
      weight: 0.3,
      value: Math.min(100, (passedQuizzes || 0) * 15),
      tip: "اجتز اختبارات جديدة لرفع هذا العامل.",
    },
    {
      name: "الدروس المكتملة",
      weight: 0.2,
      value: Math.min(100, (completedLessons || 0) * 5),
      tip: "أكمل المزيد من الدروس في مسارك الحالي.",
    },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.value * f.weight, 0) * 100) / 100;

  const { data: novaActor } = await supabase.from("system_actors").select("id").eq("name", "nova").single();
  if (!novaActor) return;

  await supabase.from("career_scores").insert({
    user_id: userId,
    score_type: "employability",
    score,
    explanation: { factors },
    computed_by: novaActor.id,
  });
}
