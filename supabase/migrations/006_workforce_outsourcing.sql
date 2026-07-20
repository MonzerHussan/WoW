-- ============================================================
-- WOW - World of Work — Migration 006
-- Sprint 2.2: WORKFORCE OUTSOURCING (third-party partner model)
--
-- LEGAL MODEL (binding, see DOMAIN_CONTRACTS.md §7):
--   The PLATFORM is a technology intermediary + quality guarantor.
--   A LICENSED THIRD-PARTY PARTNER (workforce_partner org) is the legal
--   employer / contract administrator and bears payroll, visas, labor-law
--   and administrative obligations. Every outsourcing contract MUST have
--   a partner_org; the platform never becomes the employer of record.
--
-- Run order: 001 → 002 → 003 → 004 → 005 → 006. Additive only.
-- NOTE: the ALTER TYPE below must not be used by rows inside this same
-- migration (Postgres rule) — and it isn't.
-- ============================================================

-- 1. The licensed partner is an organization capability.
alter type org_capability add value if not exists 'workforce_partner';

-- 2. Guarantee terms — PUBLIC and versioned (transparency: the guarantee
--    is a published product, never an ad-hoc promise).
--    SELECTIVE ELIGIBILITY (approved principle): the guarantee applies
--    only to talent that clears evidence/trust thresholds.
create table public.guarantee_terms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                       -- e.g. 'WOW Certified Guarantee v1'
  version int not null default 1,
  trial_period_days int not null default 90,
  replacements_included int not null default 1,
  refund_policy jsonb not null default '{}'::jsonb,   -- {type:'fee_refund', cap_pct:100, window_days:90}
  -- Eligibility thresholds (checked at contract creation):
  min_trust_score numeric(5,2),             -- latest career_scores(trust)
  min_skill_confidence numeric(5,2),        -- avg confidence on contracted skills
  requires_platform_certificate boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique (name, version)
);
alter table public.guarantee_terms enable row level security;
create policy "Guarantee terms: public read" on public.guarantee_terms
  for select using (is_active = true);

-- 3. Contracts — the core entity. Both models supported:
--    guaranteed_placement: client hires talent directly; platform guarantees.
--    outsourcing: partner_org is the legal employer; client receives service.
create table public.workforce_contracts (
  id uuid primary key default uuid_generate_v4(),
  contract_type text not null check (contract_type in ('guaranteed_placement','outsourcing')),
  client_org_id uuid not null references public.organizations(id),
  talent_user_id uuid not null references public.profiles(id),
  partner_org_id uuid references public.organizations(id),
  guarantee_id uuid references public.guarantee_terms(id),
  role_title text not null,
  commercial_terms jsonb not null default '{}'::jsonb,  -- rates/margins (billing wired in Sprint 7)
  status text not null default 'draft' check (status in (
    'draft','pending_signatures','active','completed','terminated','disputed'
  )),
  starts_at date,
  ends_at date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Outsourcing REQUIRES a licensed partner (the legal model above):
  check (contract_type <> 'outsourcing' or partner_org_id is not null)
);
create index idx_wf_contracts_client on public.workforce_contracts(client_org_id, status);
create index idx_wf_contracts_talent on public.workforce_contracts(talent_user_id, status);
create index idx_wf_contracts_partner on public.workforce_contracts(partner_org_id, status);
create trigger trg_wf_contracts_updated_at before update on public.workforce_contracts
  for each row execute procedure public.set_updated_at();

-- Guard: a contract with a guarantee may only be ACTIVATED for eligible
-- talent. Eligibility check helper (thresholds from guarantee_terms):
create or replace function public.is_guarantee_eligible(p_talent uuid, p_guarantee uuid)
returns boolean language plpgsql security definer stable as $$
declare
  g record;
  latest_trust numeric;
  has_cert boolean;
begin
  select * into g from public.guarantee_terms where id = p_guarantee;
  if g is null then return false; end if;

  if g.min_trust_score is not null then
    select score into latest_trust from public.career_scores
    where user_id = p_talent and score_type = 'trust'
    order by computed_at desc limit 1;
    if latest_trust is null or latest_trust < g.min_trust_score then
      return false;
    end if;
  end if;

  if g.requires_platform_certificate then
    select exists(select 1 from public.certificates where user_id = p_talent)
      into has_cert;
    if not has_cert then return false; end if;
  end if;

  -- min_skill_confidence is checked in server code against the contract's
  -- specific skills (entity_skills confidence avg) — needs contract skills
  -- context that SQL alone shouldn't guess.
  return true;
end $$;

create or replace function public.guard_contract_activation()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'active' and coalesce(old.status,'') <> 'active' then
    if new.guarantee_id is not null
       and not public.is_guarantee_eligible(new.talent_user_id, new.guarantee_id) then
      raise exception 'Talent does not meet the guarantee eligibility thresholds';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_contract_activation on public.workforce_contracts;
create trigger trg_guard_contract_activation
  before update of status on public.workforce_contracts
  for each row execute procedure public.guard_contract_activation();

-- 4. Placements — the live engagement under a contract.
create table public.placements (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.workforce_contracts(id) on delete cascade,
  status text not null default 'onboarding' check (status in (
    'onboarding','active','on_hold','completed','terminated_early'
  )),
  started_at date,
  ended_at date,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create index idx_placements_contract on public.placements(contract_id);

-- 5. Periodic client reviews of the placement.
--    WIRING CONTRACT (server-side, Sprint that builds the UI):
--    each review also (a) writes a trust_events('org_rating_received')
--    row and (b) may add skill_evidence(evidence_type='manager_review')
--    for the contracted skills — the placement feeds the talent's DNA.
create table public.placement_reviews (
  id uuid primary key default uuid_generate_v4(),
  placement_id uuid not null references public.placements(id) on delete cascade,
  reviewer_user_id uuid not null references public.profiles(id),  -- client-side member
  rating int not null check (rating between 1 and 5),
  feedback text,
  period_start date,
  period_end date,
  created_at timestamptz default now()
);
create index idx_placement_reviews_placement on public.placement_reviews(placement_id);

-- 6. Guarantee claims — replacement / refund, with a managed lifecycle.
create table public.guarantee_claims (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.workforce_contracts(id),
  claim_type text not null check (claim_type in ('replacement','refund')),
  reason text not null,
  status text not null default 'submitted' check (status in (
    'submitted','under_review','approved','rejected','fulfilled'
  )),
  submitted_by uuid not null references public.profiles(id),
  resolved_by uuid references public.profiles(id),
  resolution_notes text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
create index idx_guarantee_claims_contract on public.guarantee_claims(contract_id, status);

-- Claims are reviewed under a dedicated permission (staff):
insert into public.permissions (key, description) values
  ('guarantees.review', 'Review and resolve guarantee claims (replacement/refund)')
on conflict (key) do nothing;
insert into public.role_permissions (role, permission_key) values
  ('support_lead','guarantees.review'),
  ('finance_manager','guarantees.review'),
  ('super_admin','guarantees.review')
on conflict do nothing;

-- 7. RLS — every party sees its own contracts; talent always sees their own.
alter table public.workforce_contracts enable row level security;
alter table public.placements enable row level security;
alter table public.placement_reviews enable row level security;
alter table public.guarantee_claims enable row level security;

create policy "Contracts: talent reads own" on public.workforce_contracts
  for select using (auth.uid() = talent_user_id);
create policy "Contracts: client org staff" on public.workforce_contracts
  for select using (public.org_role_of(client_org_id) in ('owner','org_admin','recruiter'));
create policy "Contracts: partner org staff" on public.workforce_contracts
  for select using (partner_org_id is not null
    and public.org_role_of(partner_org_id) in ('owner','org_admin'));
create policy "Contracts: staff with permission" on public.workforce_contracts
  for select using (public.has_permission('guarantees.review'));

create policy "Placements: contract parties" on public.placements
  for select using (exists (
    select 1 from public.workforce_contracts c
    where c.id = contract_id and (
      c.talent_user_id = auth.uid()
      or public.org_role_of(c.client_org_id) in ('owner','org_admin','recruiter')
      or (c.partner_org_id is not null and public.org_role_of(c.partner_org_id) in ('owner','org_admin'))
    )
  ));

-- TRANSPARENCY (T-rule): the talent ALWAYS sees reviews about them.
create policy "Reviews: contract parties incl. talent" on public.placement_reviews
  for select using (exists (
    select 1 from public.placements p
    join public.workforce_contracts c on c.id = p.contract_id
    where p.id = placement_id and (
      c.talent_user_id = auth.uid()
      or public.org_role_of(c.client_org_id) in ('owner','org_admin','recruiter')
      or (c.partner_org_id is not null and public.org_role_of(c.partner_org_id) in ('owner','org_admin'))
    )
  ));
create policy "Reviews: client members write" on public.placement_reviews
  for insert with check (exists (
    select 1 from public.placements p
    join public.workforce_contracts c on c.id = p.contract_id
    where p.id = placement_id
      and public.org_role_of(c.client_org_id) in ('owner','org_admin','recruiter')
  ));

create policy "Claims: contract parties read" on public.guarantee_claims
  for select using (exists (
    select 1 from public.workforce_contracts c
    where c.id = contract_id and (
      c.talent_user_id = auth.uid()
      or public.org_role_of(c.client_org_id) in ('owner','org_admin')
      or public.has_permission('guarantees.review')
    )
  ));
create policy "Claims: client admins submit" on public.guarantee_claims
  for insert with check (exists (
    select 1 from public.workforce_contracts c
    where c.id = contract_id
      and public.org_role_of(c.client_org_id) in ('owner','org_admin')
  ));
