import { SupabaseClient } from "@supabase/supabase-js";
import { GameKey } from "@/shared/schemas/game.schema";

export interface GameAttemptSummary {
  id: string;
  game_key: GameKey;
  variant: "project" | "generic";
  project_id: string | null;
  scenario_id: string | null;
  status: "in_progress" | "completed";
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface GenericScenario {
  id: string;
  game_key: GameKey;
  payload: Record<string, any>;
}

export interface SpotterStatement {
  id: string;
  text_ar: string;
  text_en: string;
}

export interface EarnedBadge {
  badge_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  earned_at: string;
}

export interface Certificate {
  id: string;
  certificate_no: string;
  pmp_level: number | null;
  course_title: string | null;
  issued_at: string | null;
}

/**
 * Whether the trainee has a fully assessor-approved pass on the single
 * Level 1 course-final quiz (`pmp_level = 1`, `lesson_id is null`, same
 * query shape 038's `play_game()` uses server-side — this one is purely
 * for UI gating, the RPC re-checks it regardless). `passed` on a hybrid
 * quiz only becomes true/false after /api/lms/quizzes/grade runs, never
 * at auto-submit time — verified against course.service.ts + the grade
 * route before relying on it.
 */
// No longer used to gate generic-variant games (042 removed that check by
// explicit owner decision — see DOMAIN_CONTRACTS.md). Kept as a general
// "has this user passed the Level 1 final quiz" query for any future
// screen that wants it; not currently called from anywhere.
export async function hasPassedLevel1FinalQuiz(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("quiz_attempts")
    .select("id, quizzes!inner(pmp_level, lesson_id)")
    .eq("user_id", userId)
    .eq("passed", true)
    .eq("quizzes.pmp_level", 1)
    .is("quizzes.lesson_id", null)
    .limit(1);

  return !!data && data.length > 0;
}

export async function getMyGameAttempts(supabase: SupabaseClient, userId: string): Promise<GameAttemptSummary[]> {
  const { data, error } = await supabase
    .from("game_attempts")
    .select("id, game_key, variant, project_id, scenario_id, status, score, completed_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as GameAttemptSummary[];
}

/** Fetches the exact scenario play_game() already auto-picked and returned
 *  as attempt.scenarioId — not a second independent pick. */
export async function getGenericScenarioById(supabase: SupabaseClient, scenarioId: string): Promise<GenericScenario | null> {
  const { data } = await supabase
    .from("game_generic_scenarios")
    .select("id, game_key, payload")
    .eq("id", scenarioId)
    .maybeSingle();

  return (data as GenericScenario) || null;
}

export async function getGenericScenario(supabase: SupabaseClient, gameKey: GameKey): Promise<GenericScenario | null> {
  const { data } = await supabase
    .from("game_generic_scenarios")
    .select("id, game_key, payload")
    .eq("game_key", gameKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return (data as GenericScenario) || null;
}

/** Statement text only — never correct_type, which lives in the
 *  RLS-zero-policy game_spotter_answer_keys table this client can't
 *  read at all (038). */
export async function getSpotterStatements(supabase: SupabaseClient, limit = 10): Promise<SpotterStatement[]> {
  const { data, error } = await supabase
    .from("game_spotter_statements")
    .select("id, text_ar, text_en")
    .eq("is_active", true)
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as SpotterStatement[];
}

export async function getMyBadges(supabase: SupabaseClient, userId: string): Promise<EarnedBadge[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at, badges(name, description, icon)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    badge_id: row.badge_id,
    earned_at: row.earned_at,
    name: row.badges?.name ?? "",
    description: row.badges?.description ?? null,
    icon: row.badges?.icon ?? null,
  }));
}

export async function getMyCertificates(supabase: SupabaseClient, userId: string): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select("id, certificate_no, pmp_level, issued_at, courses(title)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    id: row.id,
    certificate_no: row.certificate_no,
    pmp_level: row.pmp_level,
    issued_at: row.issued_at,
    course_title: row.courses?.title ?? null,
  }));
}
