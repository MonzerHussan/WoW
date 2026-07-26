import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { callAgentWithRetry } from "@/shared/lib/openai";
import {
  buildAgentSystemPrompt,
  buildCatalogContextBlock,
  buildDnaContextBlock,
  buildStyleHint,
  extractRecommendationBlock,
} from "@/features/agent/prompt";
import { getEnrollmentContext } from "@/features/agent/services/agent.service";
import { getPublishedCourses } from "@/features/lms/services/course.service";
import { agentRequestSchema, agentRecommendationSchema } from "@/shared/schemas/agent.schema";
import { rateLimit } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";
import { GOALS, GENDERS } from "@/shared/constants/onboarding";
import { AccountType } from "@/shared/types";

// Vercel's default serverless function timeout (10s on Hobby) is shorter
// than this route's own worst case: a 15s OpenAI timeout plus one retry
// can take up to ~30s. Without this, Vercel would kill the function
// before our own timeout/retry logic ever gets to run, surfacing as a
// silent 504 instead of the graceful "unavailable" message below —
// directly the agent-uptime metric TESTING_POLICY.md's Beta gate checks.
export const maxDuration = 30;

// The OpenAI client + retry logic used to live inline here; extracted to
// shared/lib/openai.ts unchanged once the placement route became a second
// caller.

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 }; // 20 messages / 10 min / user

/**
 * POST /api/agent
 * Body: { message: string, history?: { role, content }[] }
 *
 * Renamed from /api/nova (Sprint 3): the assistant is now a per-user named
 * agent (user_agent_profiles.chosen_name, 007b), not a fixed "Nova"
 * persona — see features/agent/prompt.ts. Free to use for now (no coin
 * cost); the coin wallet (007b) is only wired up in the subscriptions
 * sprint, per CLAUDE.md.
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = rateLimit(`agent:${user.id}`, RATE_LIMIT);
  if (!rl.allowed) {
    logger.warn("agent_rate_limited", { userId: user.id });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before messaging your agent again." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { message, history } = parsed.data;

  const [
    { data: profile },
    { data: agentProfile },
    { data: capabilities },
    { data: skills },
    { data: weakSkills },
    { data: scores },
    { data: recs },
    { data: languageProfile },
    { data: learnerNoteRows },
    publishedCourses,
    enrollments,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, points, level, account_type, onboarding_goal, age, gender").eq("id", user.id).single(),
    supabase.from("user_agent_profiles").select("chosen_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_capabilities").select("capability").eq("user_id", user.id),
    supabase
      .from("entity_skills")
      .select("level, skills(name)")
      .eq("entity_type", "user")
      .eq("entity_id", user.id)
      .order("level", { ascending: false })
      .limit(5),
    // Deliberately NOT a free-text "weaknesses" field (no such column
    // exists, and T2's "no score without evidence" principle rules one
    // out) — the agent infers gaps the same way it infers strengths:
    // from the user's own recorded entity_skills, just sorted the other
    // way. Small skill sets can make this list overlap with topSkills
    // above; that's an accepted MVP tradeoff, not a bug.
    supabase
      .from("entity_skills")
      .select("level, skills(name)")
      .eq("entity_type", "user")
      .eq("entity_id", user.id)
      .order("level", { ascending: true })
      .limit(5),
    supabase
      .from("career_scores")
      .select("score")
      .eq("user_id", user.id)
      .eq("score_type", "employability")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("career_recommendations")
      .select("payload")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    // Language layer (022): the placement result and the learner's own
    // durable notes. Both are safely null/empty for users who haven't
    // done the placement yet (or before 022 runs — the ignored error
    // just leaves data null, same as any other missing optional row).
    supabase
      .from("user_language_profiles")
      .select("english_level")
      .eq("user_id", user.id)
      .maybeSingle(),
    // Capped at the 15 most recent so a long-lived learner history can't
    // grow the prompt without bound.
    supabase
      .from("learner_notes")
      .select("note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    // Real catalog grounding (fixes the "recommends Udemy/Coursera"
    // bug — without this, the model has zero idea WOW has real courses
    // and falls back to its own training knowledge).
    getPublishedCourses(supabase),
    getEnrollmentContext(supabase, user.id),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const agentName = agentProfile?.chosen_name || "رفيق";
  const activeCapabilities = (capabilities || []).map((c: any) => c.capability as string);
  const goalOption = profile.onboarding_goal
    ? GOALS[profile.account_type as AccountType]?.find((g) => g.value === profile.onboarding_goal)
    : null;
  const genderOption = profile.gender ? GENDERS.find((g) => g.value === profile.gender) : null;

  const systemPrompt =
    buildAgentSystemPrompt(agentName, buildStyleHint(activeCapabilities)) +
    buildCatalogContextBlock(publishedCourses, enrollments) +
    buildDnaContextBlock({
      full_name: profile.full_name,
      points: profile.points,
      level: profile.level,
      capabilities: activeCapabilities,
      age: profile.age,
      gender: genderOption?.ar || null,
      reasonForJoining: goalOption?.ar || profile.onboarding_goal,
      englishLevel: languageProfile?.english_level ?? null,
      learnerNotes: (learnerNoteRows || []).map((n: any) => n.note as string),
      topSkills: (skills || []).map((s: any) => ({ name: s.skills?.name || "", level: s.level })),
      weakSkills: (weakSkills || []).map((s: any) => ({ name: s.skills?.name || "", level: s.level })),
      latestEmployabilityScore: scores?.score ?? null,
      recentRecommendations: (recs || []).map((r: any) => r.payload?.message).filter(Boolean),
    });

  await supabase.from("ai_conversations").insert({ user_id: user.id, role: "user", message });

  let rawReply: string;
  try {
    rawReply = await callAgentWithRetry([
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ]);
  } catch (err) {
    logger.error("agent_call_exhausted", { userId: user.id, error: String(err) });
    return NextResponse.json({ error: "Your agent is unavailable right now." }, { status: 502 });
  }

  const { text: reply, recRaw } = extractRecommendationBlock(rawReply);

  if (recRaw) {
    try {
      const recJson = JSON.parse(recRaw);
      const recParsed = agentRecommendationSchema.safeParse(recJson);
      if (recParsed.success) {
        const { data: novaActor } = await supabase.from("system_actors").select("id").eq("name", "nova").single();
        if (novaActor) {
          await supabase.from("career_recommendations").insert({
            user_id: user.id,
            actor_system_id: novaActor.id,
            kind: recParsed.data.kind,
            payload: { ...recParsed.data.payload, message: recParsed.data.message },
          });
        }
      } else {
        logger.warn("agent_recommendation_invalid_shape", { userId: user.id, issues: recParsed.error.issues });
      }
    } catch (err) {
      logger.warn("agent_recommendation_parse_failed", { userId: user.id, error: String(err) });
    }
  }

  await supabase.from("ai_conversations").insert({ user_id: user.id, role: "assistant", message: reply });

  logger.info("agent_reply_sent", { userId: user.id, remaining: rl.remaining, wroteRecommendation: !!recRaw });

  return NextResponse.json({ reply, agentName });
}
