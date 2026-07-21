-- ============================================================
-- WOW - World of Work — Migration 008
-- Sprint 2.3 domain additions: Assessor Quality System,
-- Multilingual Content, Language Proficiency Tracking,
-- Content Governance Voting
-- Run order: 001 → 002 → ... → 007 → 008. Additive only.
-- See DOMAIN_CONTRACTS.md §11-15 for the binding rules behind this file.
-- ============================================================

-- ============================================================
-- A) ALL PMP LEVELS ARE HYBRID (approved — raises credibility floor)
-- ============================================================
alter table quizzes alter column assessment_mode set default 'hybrid';
update quizzes set assessment_mode = 'hybrid' where pmp_level is not null;

alter table quiz_attempts add column if not exists review_deadline timestamptz;

create or replace function public.set_review_deadline()
returns trigger language plpgsql as $$
begin
  if new.graded_by is null and new.review_deadline is null then
    new.review_deadline := new.submitted_at + interval '48 hours';
  end if;
  return new;
end $$;

drop trigger if exists trg_set_review_deadline on public.quiz_attempts;
create trigger trg_set_review_deadline
  before insert on public.quiz_attempts
  for each row execute procedure public.set_review_deadline();

-- ============================================================
-- B) ASSESSOR QUALITY SYSTEM
-- ============================================================
alter table earner_profiles add column if not exists assessor_tier text
  check (assessor_tier in ('trainee','certified','senior'))
  default 'trainee';

alter table earner_profiles add column if not exists can_publish_directly boolean default false;

create table public.assessor_calibration_results (
  id uuid primary key default uuid_generate_v4(),
  assessor_user_id uuid not null references public.profiles(id),
  test_attempt_id uuid references public.quiz_attempts(id),
  gold_standard_score numeric(5,2) not null,
  assessor_given_score numeric(5,2) not null,
  deviation numeric(5,2) generated always as (abs(gold_standard_score - assessor_given_score)) stored,
  passed boolean not null,
  created_at timestamptz default now()
);
create index idx_calibration_assessor on public.assessor_calibration_results(assessor_user_id);

alter table public.assessor_calibration_results enable row level security;
create policy "Calibration: own results" on public.assessor_calibration_results
  for select using (auth.uid() = assessor_user_id);
create policy "Calibration: staff review" on public.assessor_calibration_results
  for select using (public.has_permission('content.moderate'));

-- ============================================================
-- C) MULTILINGUAL CONTENT
-- ============================================================
alter table lessons add column if not exists translations jsonb not null default '{}'::jsonb;

alter table enrollments add column if not exists study_language text not null default 'ar';

-- ============================================================
-- D) LANGUAGE PROFICIENCY TRACKING
-- ============================================================
create table public.language_proficiency_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cefr_estimated_level text check (cefr_estimated_level in ('A1','A2','B1','B2','C1','C2')),
  wow_readiness_score numeric(5,2) check (wow_readiness_score between 0 and 100),
  assessed_via text not null check (assessed_via in ('quiz','placement_test','instructor_review')),
  evidence_id uuid references public.skill_evidence(id),
  is_opt_in boolean not null default true,
  measured_at timestamptz default now()
);
create index idx_lang_proficiency_user on public.language_proficiency_history(user_id, measured_at desc);

alter table public.language_proficiency_history enable row level security;
create policy "Language proficiency: owner" on public.language_proficiency_history
  for select using (auth.uid() = user_id);

alter table certificates add column if not exists language_readiness_note text;

-- ============================================================
-- E) CONTENT GOVERNANCE VOTING
-- ============================================================
alter table lessons add column if not exists review_status text
  check (review_status in ('nova_check_pending','nova_check_failed','human_review','approved','rejected'))
  default 'nova_check_pending';
alter table lessons add column if not exists last_edited_by uuid references public.profiles(id);

create table public.content_contributions (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  contributor_id uuid not null references public.profiles(id),
  contribution_type text not null check (contribution_type in ('created','edited','translated','reviewed','approved')),
  language text,
  created_at timestamptz default now()
);
create index idx_content_contrib_lesson on public.content_contributions(lesson_id);

create table public.content_review_votes (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content_version int not null default 1,
  voter_type text not null check (voter_type in ('owner','peer_assessor','nova_check')),
  voter_id uuid references public.profiles(id),
  vote text not null check (vote in ('approve','reject','needs_revision')),
  comment text,
  created_at timestamptz default now(),
  check (voter_type = 'nova_check' or voter_id is not null)
);
create index idx_content_votes_lesson on public.content_review_votes(lesson_id, content_version);

alter table public.content_contributions enable row level security;
alter table public.content_review_votes enable row level security;

create policy "Contributions: contributors and staff read" on public.content_contributions
  for select using (
    contributor_id = auth.uid() or public.has_permission('content.manage')
  );
create policy "Contributions: instructor capability writes" on public.content_contributions
  for insert with check (contributor_id = auth.uid());

create policy "Votes: instructor/assessor capability reads" on public.content_review_votes
  for select using (exists (
    select 1 from public.user_capabilities uc
    where uc.user_id = auth.uid() and uc.capability in ('instructor','assessor')
  ) or public.has_permission('content.manage'));
create policy "Votes: eligible voters write" on public.content_review_votes
  for insert with check (
    (voter_type = 'owner' and public.has_permission('content.manage'))
    or (voter_type = 'peer_assessor' and voter_id = auth.uid() and exists (
      select 1 from public.user_capabilities uc
      where uc.user_id = auth.uid() and uc.capability = 'assessor'
    ))
  );
