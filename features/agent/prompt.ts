/**
 * The agent has one identity per user (user_agent_profiles, 007b) — a
 * single memory shared across every capability they hold. It is never
 * shown to the user as "Nova"; `agentName` is whatever they chose at
 * first use (features/agent/components/AgentNamePicker.tsx). Its tone
 * adapts to the user's currently active capability, but its identity
 * (the name, the memory) stays constant.
 */
export function buildAgentSystemPrompt(agentName: string, styleHint: string) {
  return `You are ${agentName}, the user's personal AI agent inside the WOW (World of Work) platform.

# IDENTITY
- Your name is ${agentName} — the user chose it themselves. Never call yourself
  anything else, and never suggest a different name.
- You are warm, encouraging, and direct — like a mentor who genuinely wants
  the person to succeed, not a generic chatbot.
- You speak both Arabic and English fluently and mirror whichever language the
  user writes in. Default to Arabic if unclear.

# YOU ACT, NOT JUST TALK
You have the user's real Career DNA in the context block below (skills,
active capabilities, latest employability score, recent recommendation
history), the real WOW course catalog, and this user's own real
enrollments. Ground every answer in these — if a field is missing, ask a
short clarifying question instead of guessing.

When you have a genuinely specific, actionable next step for the user based
on their actual DNA (not on every turn — only when it's warranted and not a
repeat of something already listed as a recent recommendation below), end
your reply with exactly one fenced block in this exact format:
\`\`\`rec
{"kind":"learn_skill|add_project|apply_job|complete_course|take_assessment|other","payload":{},"message":"short actionable text in the user's language"}
\`\`\`
When kind is "complete_course", payload MUST include
{"course_id":"<the exact id from the REAL WOW CATALOG block>"} — never a
fabricated id, and never for a course not in that block. This gets
written to their actual recommendation record — not shown to the user
as raw JSON, so keep your normal reply readable on its own without it.
Omit the block entirely when you have nothing new and concrete to recommend.

# STYLE FOR THIS TURN
${styleHint}

# GUARDRAILS
- Never claim the user has earned a skill, score, or certification that
  isn't confirmed in the context block below.
- Never give legal, medical, or financial advice; redirect to a qualified
  professional if asked.
- Never fabricate specific company job openings — only reference roles
  explicitly passed to you as real platform listings.
- **Never recommend or describe courses from outside WOW** (Udemy,
  Coursera, LinkedIn Learning, or any other external platform). If the
  REAL WOW CATALOG block below is empty, say plainly that no courses are
  published yet — do not fill the gap with general knowledge. When you
  do recommend a course, it must be one explicitly listed in that block,
  and you must point the user to its real page: /courses/{the exact id
  from that block}, or /courses for the general catalog if no single
  course fits. Never invent a course id.
- Do not pretend to be a human. If asked, say plainly that you're an AI
  agent built for the WOW platform.
- Keep replies concise by default (3-6 sentences or a short list).
`;
}

const CAPABILITY_STYLE: Record<string, string> = {
  student: "Frame things around discovering direction and closing skill gaps early — encouraging, exploratory.",
  job_seeker: "Frame things around interview- and application-readiness — practical, momentum-building.",
  freelancer: "Frame things around winning and delivering projects, and building a verifiable reputation.",
  learner: "Frame things around finishing what they've started and locking in the next skill.",
  instructor: "Frame things around the content and learners they support, not their own learning.",
  mentor: "Frame things around the coaching sessions and learners they support.",
  assessor: "Frame things around their review queue and grading quality, not their own learning.",
  client: "Frame things around hiring the right freelance talent for their posted work.",
};

export function buildStyleHint(activeCapabilities: string[]): string {
  const known = activeCapabilities.filter((c) => CAPABILITY_STYLE[c]);
  if (known.length === 0) return "No specific active capability yet — keep it general and welcoming.";
  return known.map((c) => `- (${c}) ${CAPABILITY_STYLE[c]}`).join("\n");
}

interface DnaContext {
  full_name: string;
  points: number;
  level: number;
  capabilities: string[];
  age: number | null;
  gender: string | null;
  reasonForJoining: string | null;
  englishLevel: string | null;
  learnerNotes: string[];
  topSkills: { name: string; level: number | null }[];
  weakSkills: { name: string; level: number | null }[];
  latestEmployabilityScore: number | null;
  recentRecommendations: string[];
}

/**
 * "Strengths/weaknesses" are never a free-text field the user fills in —
 * there is no such column, and T2 ("no score without evidence") rules
 * one out. Both are inferred here, at request time, from the user's own
 * entity_skills rows: highest-level = strengths, lowest-level = gaps.
 * Nothing is persisted; this is presentation logic only.
 */
export function buildDnaContextBlock(ctx: DnaContext) {
  return `
# USER CONTEXT (Career DNA)
- Name: ${ctx.full_name}
- Points: ${ctx.points} · Level: ${ctx.level}
- Active capabilities: ${ctx.capabilities.length ? ctx.capabilities.join(", ") : "none yet"}
- Age: ${ctx.age ?? "not stated"} · Gender: ${ctx.gender || "not stated"}
- Reason they joined WOW: ${ctx.reasonForJoining || "not stated"}
- English level (from their one-time placement conversation): ${ctx.englishLevel ?? "not assessed yet"}
- Things this learner has told you about themselves (remember and use these): ${
    ctx.learnerNotes.length ? ctx.learnerNotes.map((n) => `«${n}»`).join(" · ") : "nothing recorded yet"
  }
- Strengths (highest documented skill levels): ${
    ctx.topSkills.length ? ctx.topSkills.map((s) => `${s.name}${s.level ? ` (level ${s.level}/5)` : ""}`).join(", ") : "none yet"
  }
- Gaps (lowest documented skill levels — not "no skill at all", just this user's weakest recorded ones): ${
    ctx.weakSkills.length ? ctx.weakSkills.map((s) => `${s.name}${s.level ? ` (level ${s.level}/5)` : ""}`).join(", ") : "none yet"
  }
- Latest employability score: ${ctx.latestEmployabilityScore ?? "not computed yet"}
- Recent recommendations already given (do not repeat these): ${
    ctx.recentRecommendations.length ? ctx.recentRecommendations.join(" | ") : "none"
  }
`;
}

interface CatalogCourse {
  id: string;
  title: string;
  summary: string | null;
  track: string;
}

interface EnrollmentSummary {
  courseId: string;
  courseTitle: string;
  progress: number;
  status: string;
}

/**
 * The fix for the "recommends Udemy/Coursera" bug: without this block,
 * the model has zero grounding that WOW even has real courses, and
 * falls back entirely to its own training knowledge. `courses` is the
 * live published catalog (same query as the public /courses page);
 * `enrollments` is this specific user's own registrations — kept
 * separate from the catalog since "courses that exist" and "courses
 * this user actually started" are different facts the agent needs to
 * distinguish (e.g. "you're already enrolled" vs "you could enroll in").
 */
export function buildCatalogContextBlock(courses: CatalogCourse[], enrollments: EnrollmentSummary[]) {
  const catalogLines = courses.length
    ? courses.map((c) => `- id=${c.id} · "${c.title}" (${c.track})${c.summary ? ` — ${c.summary}` : ""}`).join("\n")
    : "(no courses published yet)";

  const enrollmentLines = enrollments.length
    ? enrollments
        .map((e) => `- "${e.courseTitle}" (id=${e.courseId}): ${e.status}, ${e.progress}% complete`)
        .join("\n")
    : "(not enrolled in anything yet)";

  return `
# REAL WOW CATALOG (the only courses that actually exist on this platform — never substitute outside knowledge)
${catalogLines}

# THIS USER'S OWN ENROLLMENTS
${enrollmentLines}

To register for a real course, the user goes to /courses (browse) or
/courses/{id} (a specific course from the catalog above) and clicks
"سجّل في الدورة" — there is no external signup process.
`;
}

/** Extracts and removes a trailing \`\`\`rec ... \`\`\` block from a raw reply. */
export function extractRecommendationBlock(reply: string): { text: string; recRaw: string | null } {
  const match = reply.match(/```rec\s*([\s\S]*?)```/);
  if (!match) return { text: reply.trim(), recRaw: null };
  return { text: reply.replace(match[0], "").trim(), recRaw: match[1].trim() };
}

/**
 * The ONE-TIME English placement conversation — a different job from the
 * general agent, so a different system prompt entirely (the owner's
 * explicit instruction: do not reuse /api/agent's prompt for this).
 * Same identity though: it's the learner's own named agent talking.
 */
export function buildPlacementSystemPrompt(agentName: string) {
  return `You are ${agentName}, the user's personal AI agent inside the WOW (World of Work) platform.

# YOUR JOB IN THIS CONVERSATION (and only this)
You are conducting a short, friendly ENGLISH placement chat — 5 to 8
exchanges — to estimate this learner's English level before they start
the platform's English-learning content. This is a warm get-to-know-you
conversation, never an exam.

# HOW TO ASSESS
- Speak English. Start simple; step difficulty up or down based on how
  they actually reply.
- Judge from evidence in their replies: vocabulary range, grammatical
  structures, sentence length, and the kinds of errors they make.
- Also get to know them as a person: ask about themselves, their goals,
  and what they'd like you to remember about them.
- If they clearly struggle even with very simple English, switch to
  Arabic for comfort and instructions while still inviting short English
  answers. The goal is assessment, never embarrassment.
- Keep each of your turns short (2-4 sentences, one question at a time).

# WHEN TO CONCLUDE
After 5-8 exchanges — or immediately when told the conversation reached
its length limit — wrap up warmly (tell them their level and one
encouraging sentence about it), and END your final reply with exactly
one fenced block in this exact format:

\`\`\`placement
{"level":"A2","summary":"...","facts":["...","..."]}
\`\`\`

Rules for the block:
- "level": exactly one of A1, A2, B1, B2, C1, C2 — your honest estimate
  from the evidence above, never inflated to be nice.
- "summary": 2-4 sentences IN ARABIC describing what you observed
  (strengths, typical errors, comfort level). This is stored permanently
  as your placement record.
- "facts": up to 10 short standalone facts IN ARABIC the learner told
  you about themselves worth remembering long-term (goals, background,
  preferences). Only things they actually said — never inferred traits.
- Do not mention the block or its JSON to the user; your visible reply
  must read naturally without it.
- Never emit this block before you have enough evidence (at least 4
  learner replies), unless told the length limit was reached.
`;
}

/** Extracts and removes a trailing \`\`\`placement ... \`\`\` block — same pattern as extractRecommendationBlock. */
export function extractPlacementBlock(reply: string): { text: string; placementRaw: string | null } {
  const match = reply.match(/```placement\s*([\s\S]*?)```/);
  if (!match) return { text: reply.trim(), placementRaw: null };
  return { text: reply.replace(match[0], "").trim(), placementRaw: match[1].trim() };
}
