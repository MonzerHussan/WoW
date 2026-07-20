-- ============================================================
-- WOW - World of Work — Migration 005
-- Sprint 2.1: Evidence Engine + Trust Score + verified sources
--             + Nova recommendation quality metrics
-- Run order: 001 → 002 → 003 → 004 → 005. Additive only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. VERIFIED SKILL SOURCES (approved suggestion)
-- employer_verified / certification_verified carry more weight
-- than self-claims in matching. Weight order (binding, see
-- DOMAIN_CONTRACTS.md §2): certification_verified > employer_verified
-- > assessment > instructor > system > self.
-- ------------------------------------------------------------
alter table public.entity_skills drop constraint entity_skills_source_check;
alter table public.entity_skills add constraint entity_skills_source_check
  check (source in (
    'self','assessment','system','employer','instructor',
    'employer_verified','certification_verified'
  ));

-- Confidence on each skill claim: derived from its evidence (below),
-- recomputed server-side whenever evidence changes. 0–100.
alter table public.entity_skills
  add column if not exists confidence numeric(5,2)
  check (confidence between 0 and 100);

-- ------------------------------------------------------------
-- 2. EVIDENCE ENGINE (approved suggestion #1)
-- Skill → Evidence → Confidence. The platform stops relying on claims.
-- ------------------------------------------------------------
create table public.skill_evidence (
  id uuid primary key default uuid_generate_v4(),
  entity_skill_id uuid not null references public.entity_skills(id) on delete cascade,
  evidence_type text not null check (evidence_type in (
    'certificate',        -- links a certificates row
    'quiz_attempt',       -- links a passed quiz_attempts row
    'project',            -- platform project / freelance delivery
    'instructor_review',  -- rating from a course instructor
    'manager_review',     -- rating from an org manager (employer side)
    'video',              -- demonstration video
    'github',             -- external repo link
    'portfolio',          -- external portfolio link
    'interview',          -- structured interview result
    'other'
  )),
  -- Internal evidence points at a real row; external evidence is a URL.
  ref_table text,               -- e.g. 'certificates','quiz_attempts'
  ref_id uuid,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,   -- rating value, notes, repo stats...
  -- Verification of the evidence itself:
  verified_by_type text check (verified_by_type in ('system','assessor','organization','instructor')),
  verified_by_id uuid,
  verified_at timestamptz,
  submitted_by uuid not null references public.profiles(id),
  created_at timestamptz default now(),
  check (num_nonnulls(ref_id, external_url) >= 1)
);
create index idx_skill_evidence_skill on public.skill_evidence(entity_skill_id);
create index idx_skill_evidence_ref on public.skill_evidence(ref_table, ref_id);

alter table public.skill_evidence enable row level security;
-- The skill owner sees & submits their own evidence.
create policy "Evidence: owner of the user-skill" on public.skill_evidence
  for select using (exists (
    select 1 from public.entity_skills es
    where es.id = entity_skill_id
      and es.entity_type = 'user' and es.entity_id = auth.uid()
  ));
create policy "Evidence: owner submits" on public.skill_evidence
  for insert with check (submitted_by = auth.uid());
-- Verification writes happen server-side (assessor queue / org flows).

-- Confidence recomputation contract (implemented in Sprint 3 services):
-- confidence = weighted sum of verified evidence, capped 100. Baseline
-- weights (tunable in one place, shared/constants):
--   certificate(verified) 30 · quiz_attempt(passed) 25 · manager_review 20
--   instructor_review 15 · project 15 · interview 15 · github 10
--   portfolio 10 · video 5 · unverified external evidence counts at 50%.

-- ------------------------------------------------------------
-- 3. NOVA RECOMMENDATION QUALITY (approved suggestion)
-- confidence_score + richer lifecycle so Nova itself is measurable.
-- ------------------------------------------------------------
alter table public.career_recommendations
  add column if not exists confidence_score numeric(5,2)
    check (confidence_score between 0 and 100);

alter table public.career_recommendations
  drop constraint career_recommendations_status_check;
alter table public.career_recommendations
  add constraint career_recommendations_status_check
  check (status in ('pending','accepted','rejected','ignored','implemented','dismissed'));

-- Nova quality view: acceptance & implementation rates per kind.
create view public.nova_quality_metrics as
select
  kind,
  count(*) as total,
  count(*) filter (where status = 'accepted') as accepted,
  count(*) filter (where status = 'implemented') as implemented,
  count(*) filter (where status in ('rejected','ignored','dismissed')) as not_taken,
  round(avg(confidence_score), 2) as avg_confidence,
  round(100.0 * count(*) filter (where status = 'implemented') / nullif(count(*),0), 2) as implementation_rate
from public.career_recommendations
group by kind;

-- ------------------------------------------------------------
-- 4. TRUST SCORE (approved suggestion #2 — with the legal-safety design)
-- DESIGN DECISION (binding):
--  a) The NUMERIC trust score reuses career_scores (score_type='trust'):
--     time-series + explanation NOT NULL — same transparency machinery,
--     no parallel scoring system.
--  b) OBJECTIVE verification facts (identity verified, certified) are
--     public badges. The BEHAVIORAL number follows consent rule T3 for
--     employer visibility — this split is what keeps us clear of
--     discrimination/legal exposure.
-- ------------------------------------------------------------
alter table public.career_scores drop constraint career_scores_score_type_check;
alter table public.career_scores add constraint career_scores_score_type_check
  check (score_type in ('employability','promotion','trust'));

-- Objective verification facts (badge-level, public-safe):
alter table public.profiles
  add column if not exists identity_verified_at timestamptz;

-- Trust factors feeding the score (recorded events, auditable):
create table public.trust_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'identity_verified','experience_confirmed','certificate_earned',
    'org_rating_received','assessment_passed','project_delivered',
    'commitment_positive','commitment_negative','dispute_lost','dispute_won'
  )),
  weight numeric(6,2) not null,          -- signed; negatives allowed
  source_type text check (source_type in ('system','organization','assessor')),
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create index idx_trust_events_user on public.trust_events(user_id, created_at desc);
alter table public.trust_events enable row level security;
create policy "Trust events: owner reads" on public.trust_events
  for select using (auth.uid() = user_id);
-- Inserts are server-side only (system/org/assessor flows) — a user can
-- never write their own trust events.
