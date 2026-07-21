import { SupabaseClient } from "@supabase/supabase-js";

export interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  tip: string;
}

export interface ScoreSummary {
  score: number;
  computedAt: string;
  factors: ScoreFactor[];
}

export interface SkillRow {
  id: string;
  name: string;
  level: number | null;
  source: string;
  confidence: number | null;
  evidenceCount: number;
}

export interface CertificateRow {
  id: string;
  courseTitle: string;
  pmpLevel: number | null;
  issuedByType: string;
  certificateNo: string;
  issuedAt: string;
}

export interface RecommendationRow {
  id: string;
  kind: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface ProfileOverview {
  dna: {
    identity: Record<string, unknown>;
    learning: Record<string, unknown>;
    experience: Record<string, unknown>;
    personality: Record<string, unknown>;
  } | null;
  skills: SkillRow[];
  certificates: CertificateRow[];
  employability: ScoreSummary | null;
  trust: ScoreSummary | null;
  activeCapabilities: string[];
  agentChosenName: string;
  recentRecommendations: RecommendationRow[];
}

async function getLatestScore(supabase: SupabaseClient, userId: string, scoreType: "employability" | "trust") {
  const { data } = await supabase
    .from("career_scores")
    .select("score, explanation, computed_at")
    .eq("user_id", userId)
    .eq("score_type", scoreType)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    score: data.score,
    computedAt: data.computed_at,
    factors: (data.explanation as any)?.factors || [],
  } as ScoreSummary;
}

export async function getProfileOverview(supabase: SupabaseClient, userId: string): Promise<ProfileOverview> {
  const [
    { data: careerProfile },
    { data: skillRows },
    { data: certRows },
    employability,
    trust,
    { data: capabilities },
    { data: agentProfile },
    { data: recRows },
  ] = await Promise.all([
    supabase
      .from("career_profiles")
      .select("identity, learning, experience, personality")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("entity_skills")
      .select("id, level, source, confidence, skills(name), skill_evidence(id)")
      .eq("entity_type", "user")
      .eq("entity_id", userId)
      .order("level", { ascending: false }),
    supabase
      .from("certificates")
      .select("id, pmp_level, issued_by_type, certificate_no, issued_at, courses(title)")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false }),
    getLatestScore(supabase, userId, "employability"),
    getLatestScore(supabase, userId, "trust"),
    supabase.from("user_capabilities").select("capability").eq("user_id", userId),
    supabase.from("user_agent_profiles").select("chosen_name").eq("user_id", userId).maybeSingle(),
    supabase
      .from("career_recommendations")
      .select("id, kind, payload, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    dna: careerProfile
      ? {
          identity: careerProfile.identity || {},
          learning: careerProfile.learning || {},
          experience: careerProfile.experience || {},
          personality: careerProfile.personality || {},
        }
      : null,
    skills: (skillRows || []).map((s: any) => ({
      id: s.id,
      name: s.skills?.name || "",
      level: s.level,
      source: s.source,
      confidence: s.confidence,
      evidenceCount: (s.skill_evidence || []).length,
    })),
    certificates: (certRows || []).map((c: any) => ({
      id: c.id,
      courseTitle: c.courses?.title || "",
      pmpLevel: c.pmp_level,
      issuedByType: c.issued_by_type,
      certificateNo: c.certificate_no,
      issuedAt: c.issued_at,
    })),
    employability,
    trust,
    activeCapabilities: (capabilities || []).map((c: any) => c.capability),
    agentChosenName: agentProfile?.chosen_name || "رفيق",
    recentRecommendations: (recRows || []).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      message: r.payload?.message || "",
      status: r.status,
      createdAt: r.created_at,
    })),
  };
}
