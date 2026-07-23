# DOMAIN_CONTRACTS.md — Binding Domain Contracts

These contracts bind all future sprints. Tables named here but not yet
created (Jobs, Applications, Projects) MUST follow these shapes when their
sprint arrives — that is how we avoid restructuring without building dead
tables today.

---

## 1. Transparency & Privacy Charter (approved — foundational)

The platform's stated principle: **transparency is our foundation, and we
avoid legal complexity by design, not by disclaimer.**

| # | Rule | Enforced by |
|---|---|---|
| T1 | The user sees 100% of their own Career DNA — every axis, every score, every recommendation. | RLS owner policies (004) |
| T2 | Every computed score ships with a human-readable explanation of its factors and how to improve them. A score without an explanation cannot exist. | `career_scores.explanation NOT NULL` (004) |
| T3 | Organizations see **nothing** of a user's DNA beyond the public profile unless the user grants that specific org a scope (`scores` / `skills` / `full_dna`). Consent is per-organization, revocable anytime. | `career_consents` table (004) + server-side checks |
| T4 | **Personality data is never shareable with organizations. Ever.** It is excluded from every consent scope by schema design. (Not the same guarantee as `profiles.age` — see §11, still an open policy question, not decided.) | `career_consents.scope` check constraint has no personality option |
| T5 | Personality science: Big Five is the primary instrument. DISC/MBTI are optional self-insight enrichment and MUST NOT feed scores, matching, or employer-visible outputs. | Contract rule; enforced in scoring code review |
| T6 | Every AI-generated recommendation is attributed to a `system_actor`, stored, and measurable. The agent's success metric is its acted-on rate. **Note (Sprint 3):** the `system_actors` row is still named `'nova'` internally (an audit-trail label, never shown to users) — the user-facing name is whatever they chose in `user_agent_profiles.chosen_name`. These are deliberately decoupled: one user's agent identity, one fixed internal attribution key. | `career_recommendations` (004) |
| T7 | Automated scores influence *suggestions*, never automated rejections. Any employer-facing ranking derived from scores requires the T3 consent and must show the user it happened. | Contract rule for the Jobs sprint |
| T8 | Account deletion: `status='deleted'` is soft (data inert). Hard erasure exists (`data.hard_delete`, super_admin) and honors user data-deletion requests. | 003 |
| T9 | Minors: guardian-consent policy is a **launch blocker** (see RBAC.md). | Policy gate before public signup |

## 2. Skills contract (implemented in 004 — the backbone)

- One taxonomy: `skills` + `skill_categories`.
- One linkage: `entity_skills (entity_type, entity_id, skill_id, level, source)`.
- **Every** future entity that "has skills" (job, project, assessment)
  extends the `entity_type` check constraint — never a new linkage table.
- Skill `source` distinguishes claims from verified levels. **Binding weight
  order for matching:** `certification_verified` > `employer_verified` >
  `assessment` > `instructor` > `system` > `self`.
- **Evidence rule:** a skill claim without evidence is display-only; only
  evidenced skills (via `skill_evidence`) feed matching and scores. Each
  `entity_skills` row carries a `confidence` (0–100) recomputed from its
  evidence server-side (baseline weights documented in migration 005;
  unverified external links count at 50%).

## 2b. Trust contract (migration 005)

- The numeric Trust Score reuses `career_scores` (`score_type='trust'`) —
  same time-series + mandatory-explanation machinery as every other score
  (T2 applies in full: the user always sees *why* and *how to improve*).
- Feeding events live in `trust_events` (signed weights, auditable,
  server-written only — a user can never write their own trust events).
- **The badge/number split (legal-safety decision):**
  - Objective verification *facts* (identity verified ✓, certified ✓) are
    public profile badges.
  - The behavioral *number* is employer-visible only under a T3 `scores`
    consent, like every other score, and per T7 it ranks — it never
    auto-rejects.

## 2c. Agent quality contract (migration 005; `nova_quality_metrics` is a table/view name, not a UI label — see T6)

- Every recommendation carries `confidence_score`; lifecycle is
  `pending → accepted / rejected / ignored / implemented / dismissed`.
- The `nova_quality_metrics` view (implementation rate per recommendation
  kind) is the agent's own KPI — if implementation rate drops, its prompts
  or targeting get revisited before adding new AI features.

## 3. Jobs & Applications contract (tables in the Jobs sprint)

```
jobs:
  owner_type ('organization'|'user')   -- org posting OR individual client
  owner_id
  is_published boolean                  -- guest visibility rule applies
  skills via entity_skills('job', id)
  status (draft|published|closed)

applications:
  job_id, user_id, status (applied|shortlisted|interview|offer|rejected|withdrawn)
  -- matching score shown to employer ONLY under a T3 'scores' consent,
  -- and the applicant is told their score was shared (T7).

freelance_projects: same owner polymorphism; proposals reference
  freelancer users; disputes resolve via support_lead (003).
```

## 4. Employer visibility contract (Employer Portal sprint)

- Candidate search returns public profile + skills **only**.
- Score-ranked shortlists require per-candidate T3 consent.
- `viewer` org_role = read/filter only; `recruiter` may contact; contact
  events are logged to `audit_log`.
- Sponsored training reports (`training_manager`) show progress and
  completion — never personality, never raw DNA.

## 5. LMS ↔ Career DNA feed contract (wired in Sprint 3 — status below)

| Event | Feeds | Status |
|---|---|---|
| lesson completed | `lesson_progress` → Learning DNA + points (`LESSON_COMPLETE`) | ✅ live, server-verified |
| quiz passed, auto-graded | `quiz_attempts` → Skills DNA via `entity_skills(source='assessment')` + `skill_evidence('quiz_attempt')` + points + `career_scores(employability)` recompute | ✅ live |
| quiz passed, human/hybrid (assessor-confirmed) | same skills/evidence/points feed | ✅ live |
| — `career_scores` recompute specifically for this path | needs the same security-definer-function treatment as `award_quiz_points()` before it's safe; a broad RLS policy letting an assessor write another user's score was deliberately rejected, same reasoning as points | ⬜ deferred (TECH_DEBT.md #9) |
| certificate issued | `certificates` → Experience DNA + Employability recompute | ⬜ not built — no issuance flow/UI exists yet |
| any of the above (once live) | a `career_scores` recompute — always a NEW time-series row, never an update | ✅ (auto path) |

A course must be tagged with the skills it teaches
(`entity_skills(entity_type='course', ...)`) for the quiz-pass feed to
have anything to credit — this was the missing link found during Sprint
3 acceptance testing (migration 011) even after the write-path RLS
gaps were fixed; a course with no skill tags is a silent no-op, not an
error, by design (a content-authoring gap, not a code failure).

## 6. Scoring contract

- Score types now: `employability`, `promotion` (0–100).
- Computed only by `system_actors`; inserted server-side; time-series.
- Explanation shape: `{factors: [{name, weight, value, tip}]}` — `tip` is
  the actionable "how to improve this factor" line shown to the user.
- Recompute triggers are event-driven (section 5), not on-read.

## 7. Workforce outsourcing contract (migration 006 — approved model)

**Legal model (binding):** the platform is a technology intermediary and
quality guarantor. A **licensed third-party partner** (an organization with
the `workforce_partner` capability) is the legal employer / contract
administrator and bears payroll, visas, labor-law and administrative
obligations. An `outsourcing` contract cannot exist without a partner_org
(enforced by check constraint). The platform is never the employer of
record.

**Two contract types, one table (`workforce_contracts`):**
- `guaranteed_placement` — client hires talent directly; platform
  guarantees quality per published `guarantee_terms`.
- `outsourcing` — partner employs the talent; client receives the service.

**Selective guarantee (binding):** guarantees attach only to talent that
clears published thresholds (latest trust score, platform certificate,
skill confidence) — enforced by a DB trigger at contract activation.
Guarantee terms are **public and versioned**: the guarantee is a published
product, never an ad-hoc promise.

**Transparency rules extended:**
- The talent always sees every placement review written about them (RLS).
- Placement reviews feed the talent's DNA: each review writes a
  `trust_events('org_rating_received')` row and may add
  `skill_evidence('manager_review')` for contracted skills (server-side
  wiring in the UI sprint).
- Guarantee claims (`replacement` / `refund`) follow a managed lifecycle
  reviewed under the `guarantees.review` permission (support_lead /
  finance_manager / super_admin).

**Revenue note for Sprint 7:** placement fees and outsourcing margins are
recorded in `commercial_terms` (jsonb) now; billing rails are built in the
Subscriptions sprint alongside the other revenue streams.

## 8. Instructor personal courses + live sessions (migration 014) — ✅ implemented and tested

A second, explicitly separate contract from the shared-curriculum path:
an individual instructor's own course (`owner_type='user'`), which they
alone own and approve — never routed through `content_review_votes`
(migration 008's owner + peer_assessor + nova_check governance), because
there is no *shared* content to govern here. The shared-curriculum
contribution path itself is now also implemented — see §9 below.

| Event | Feeds | Status |
|---|---|---|
| instructor creates a personal course | `courses(owner_type='user', is_published=false)` + a server-generated `invite_code` | ✅ live, tested |
| instructor adds modules/lessons to their own course | direct RLS-guarded writes, no approval gate — the owner is the sole approver of their own course | ✅ live, tested |
| student visits `/join/[invite_code]` | `enrollments` upsert for that course | ✅ live, tested |
| enrolled student views their personal (unpublished) course | `courses`/`modules`/`lessons` resolve via RLS's "enrolled can read" policies, not `is_published` | ✅ live, tested |
| instructor schedules a live session on their course | `live_sessions` row | ✅ live, tested |
| enrolled student clicks "join" on an upcoming session | opens `meeting_link` + `live_session_attendance` row (`joined_at`) | ✅ live, tested — **self-reported only, see caveat below** |

**Transparency-relevant caveat (binding, same spirit as T1–T9):**
`live_session_attendance` is **self-reported by the student**, not
verified by any meeting provider (no Zoom/meeting API integration this
sprint). It must never be treated as proof of actual attendance by any
downstream contract — specifically, it must never feed `skill_evidence`,
points, or `career_scores`. If real attendance verification is ever
wired up (a genuine provider integration), it needs its own explicit
contract entry here, not a silent reuse of this table's semantics.

**Acceptance testing performed** (two real, separately-signed-up
accounts — an instructor and a student, per TESTING_POLICY.md): full
flow end-to-end, plus a regression check confirming the existing
published-catalog flow (`getPublishedCourses`, the PMP course page) is
byte-for-byte unaffected, and a negative-path REST check confirming a
non-enrolled anonymous caller is rejected (RLS `42501`) when attempting
to write attendance for a session it has no access to.

## 9. Curriculum contribution to WOW's shared courses (migrations 015a-d) — ✅ implemented and tested

The governed counterpart to §8: a lesson proposed for a *shared* course
(`owner_type IS NULL`, e.g. the published PMP course) does not become
visible to students on the instructor's say-so — it must clear
`content_review_votes`' binding rule, unchanged from how 008 originally
defined it: any `instructor`/`assessor` capability holder may cast a
peer vote (`peer_instructor`/`peer_assessor`), but only the platform
owner's decision (`voter_type='owner'`, requires the `content.manage`
permission — a narrow role, `content_manager`, not a repurposed
`admin`) is decisive. Peer votes are recorded and shown as context; they
never move `review_status` on their own.

| Event | Feeds | Status |
|---|---|---|
| instructor proposes a lesson on a shared course | `lessons(review_status='nova_check_pending')` + `content_contributions` | ✅ live, tested |
| placeholder automated check | `content_review_votes(voter_type='nova_check')`, always auto-approves — **not real review logic yet**, see SECURITY.md | ✅ live (as a placeholder), tested |
| peer vote (instructor/assessor capability) | `content_review_votes(voter_type='peer_instructor'/'peer_assessor')` — informative only | ✅ live, tested |
| owner decision (`content.manage`) | `content_review_votes(voter_type='owner')` + `lessons.review_status` → `approved`/`rejected`/`human_review`, decisive regardless of peer votes | ✅ live, tested |
| approved lesson becomes visible to enrolled students | ordinary `lessons` SELECT, gated on `review_status='approved'` | ✅ live, tested |

**The visibility gate itself was the real work, not the voting UI.**
Testing this end-to-end surfaced that lesson visibility had never
actually been gated on `review_status` at all (004's original policy
predates the concept) — every enrolled student could already see every
lesson in a course regardless of approval state. Fixed with a
`RESTRICTIVE` policy in migration 015c (a second permissive policy would
have had no effect), with an explicit, tested exemption for
personal-course lessons (§8) so that already-shipped feature stays
completely unaffected by this one. Full details, including the
backfill this required for the 18 already-live PMP lessons, are in
SECURITY.md.

**Acceptance testing performed** (three real accounts — instructor,
peer voter, and the real platform-owner account holding
`content.manage`, per TESTING_POLICY.md): full flow end-to-end,
confirmed via REST with the *student's own JWT* both that the proposal
was invisible before approval and genuinely visible after it (Module 3
going from 5 to 6 lessons), plus a regression check confirming all 18
original PMP lessons remained visible and unchanged throughout.

## 10. قاعدة عدم الادّعاء بمعادلة لغوية رسمية

أي تتبّع لمستوى اللغة الإنجليزية (CEFR أو WOW Readiness Index
الداخلي) هو تقدير داخلي فقط، ولا يُعرض أبداً كمعادل رسمي لاختبارات
معتمدة دولياً مثل IELTS أو TOEFL. أي نص واجهة يذكر مستوى لغوي يجب أن
يتضمن إفصاحاً صريحاً بهذا. هذا يحمي المنصة من مسؤولية قانونية عن
ادّعاء اعتماد لا نملكه.

## 11. وضع حقل العمر بالنسبة لنطاقات الموافقة (وصفي، غير نهائي)

الحقل `age` (`profiles`, migration 016) لا يصل اليوم لأي منظمة، لكن
هذا ناتج حالياً عن أن **لا مسار موافقة يصل لـ`profiles` أصلاً بعد** —
`career_consents.scope` يحكم `career_profiles`/`career_scores` فقط، لا
`profiles`، ولا سياسة RLS تفتح `profiles` لأي طرف غير المالك. هذا ليس
حكماً نهائياً بأن `age` مستثنى دائماً من كل مشاركة مستقبلية بنفس
معاملة Personality DNA (T4) — تلك خصوصية شخصية بحكم تعريفها ومحسومة.
الحكم النهائي بخصوص `age` (هل يُستثنى دوماً، أم يُشارَك بشروط بعد حسم
سياسة القاصرين) **مرتبط مباشرة بالقرار المعلَّق في RBAC.md ("تحديث حرج
على سياسة القاصرين")** ولم يُحسم بعد. أي مسار موافقة أو دمج بيانات
مستقبلي يعرض `profiles` لواجهات المنظمات (مثل Employer Portal، Sprint
5) يجب أن يعود لهذا البند وللقرار المعلَّق في RBAC.md قبل تقرير مصير
`age` فيه — لا أن يفترض معاملة T4 تلقائياً.
