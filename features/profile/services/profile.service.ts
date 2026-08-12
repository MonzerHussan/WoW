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

export interface CoinPackageRow {
  id: string;
  name: string;
  nameEn: string | null;
  coins: number;
  priceUsd: number;
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
  walletBalance: number;
  coinPackages: CoinPackageRow[];
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

export interface DnaAndScores {
  dna: ProfileOverview["dna"];
  employability: ScoreSummary | null;
  trust: ScoreSummary | null;
}

/**
 * The lean read Dashboard needs (DNA summary + score indicators only) —
 * split out from getProfileOverview() rather than reusing the full
 * thing, which also pulls skills/certificates/wallet/recommendations
 * that now live on the Assessments/AI Assist screens instead.
 */
export async function getDnaAndScores(supabase: SupabaseClient, userId: string): Promise<DnaAndScores> {
  const [{ data: careerProfile }, employability, trust] = await Promise.all([
    supabase.from("career_profiles").select("identity, learning, experience, personality").eq("user_id", userId).maybeSingle(),
    getLatestScore(supabase, userId, "employability"),
    getLatestScore(supabase, userId, "trust"),
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
    employability,
    trust,
  };
}

export interface SkillsAndCertificates {
  skills: SkillRow[];
  certificates: CertificateRow[];
}

/** The lean read the Assessments screen needs — same shape as the
 *  matching slice of getProfileOverview(), split out for the same
 *  reason getDnaAndScores() was: this screen doesn't need
 *  wallet/recommendations/capabilities. */
export async function getSkillsAndCertificates(supabase: SupabaseClient, userId: string): Promise<SkillsAndCertificates> {
  const [{ data: skillRows }, { data: certRows }] = await Promise.all([
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
  ]);

  return {
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
  };
}

/** The lean read the AI Assist screen needs — same slice as
 *  getProfileOverview()'s own recommendations read. */
export async function getRecentRecommendations(supabase: SupabaseClient, userId: string): Promise<RecommendationRow[]> {
  const { data } = await supabase
    .from("career_recommendations")
    .select("id, kind, payload, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data || []).map((r: any) => ({
    id: r.id,
    kind: r.kind,
    message: r.payload?.message || "",
    status: r.status,
    createdAt: r.created_at,
  }));
}

export interface CapabilitiesAndWallet {
  activeCapabilities: string[];
  walletBalance: number;
  coinPackages: CoinPackageRow[];
}

/** The lean read Dashboard needs for the capabilities/wallet-purchase
 *  sections it inherited from the retired /profile page (see
 *  DashboardView's own comment on why these ended up here). */
export async function getCapabilitiesAndWallet(supabase: SupabaseClient, userId: string): Promise<CapabilitiesAndWallet> {
  const [{ data: capabilities }, { data: wallet }, { data: packageRows }] = await Promise.all([
    supabase.from("user_capabilities").select("capability").eq("user_id", userId),
    supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
    supabase.from("coin_packages").select("id, name, name_en, coins, price_usd").eq("is_active", true),
  ]);

  return {
    activeCapabilities: (capabilities || []).map((c: any) => c.capability),
    walletBalance: wallet?.balance ?? 0,
    coinPackages: (packageRows || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      nameEn: p.name_en,
      coins: p.coins,
      priceUsd: p.price_usd,
    })),
  };
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
    { data: wallet },
    { data: packageRows },
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
    supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
    supabase.from("coin_packages").select("id, name, name_en, coins, price_usd").eq("is_active", true),
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
    walletBalance: wallet?.balance ?? 0,
    coinPackages: (packageRows || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      nameEn: p.name_en,
      coins: p.coins,
      priceUsd: p.price_usd,
    })),
  };
}
