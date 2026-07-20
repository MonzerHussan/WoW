-- ============================================================
-- WOW - World of Work — Migration 003
-- Complete RBAC & Actors Model ("no rebuild later" blueprint)
-- Status: APPROVED (final). Run after 001 and 002 in order.
-- Additive only. Builds on 001 (schema.sql) + 002 (rbac_and_indexes).
-- ============================================================

-- ------------------------------------------------------------
-- 0. ACCOUNT STATUS (gap closed in final review)
-- users.suspend_temp / bans / soft-delete need a field to act on.
-- 'deleted' = SOFT delete (data retained, account inert) — distinct from
-- the data.hard_delete permission, which is the only path to real erasure.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active','suspended','banned','deleted'));

create index if not exists idx_profiles_status on public.profiles(status);

-- ============================================================
-- LAYER 1 — PLATFORM STAFF (functional roles + atomic permissions)
-- ============================================================

-- 1a. Extend app_role beyond (user, moderator, admin) from migration 002.
alter type app_role add value if not exists 'support_agent';
alter type app_role add value if not exists 'support_lead';
alter type app_role add value if not exists 'accountant';
alter type app_role add value if not exists 'finance_manager';
alter type app_role add value if not exists 'tech_support';
alter type app_role add value if not exists 'super_admin';

-- 1b. Atomic permissions. RLS and UI check PERMISSIONS, never role names,
--     so new roles later = data insert, not a migration.
create table public.permissions (
  key text primary key,          -- e.g. 'finance.read', 'users.suspend'
  description text not null
);

create table public.role_permissions (
  role app_role not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role, permission_key)
);

insert into public.permissions (key, description) values
  ('tickets.read',            'View support tickets and basic user info'),
  ('tickets.respond',         'Reply to support tickets'),
  ('tickets.escalate',        'Escalate tickets'),
  ('users.suspend_temp',      'Temporarily suspend an account'),
  ('refunds.small',           'Issue refunds under the configured cap'),
  ('refunds.large',           'Issue refunds above the cap'),
  ('disputes.resolve',        'Resolve freelance payment disputes'),
  ('content.moderate',        'Review and act on reported content'),
  ('finance.read',            'Read revenue, commissions, invoices, tax reports'),
  ('finance.approve_payouts', 'Approve instructor/mentor/freelancer payouts'),
  ('finance.edit_rates',      'Change commission rates'),
  ('system.observability',    'View logs, dashboards, integration health'),
  ('system.jobs',             'Re-run background jobs'),
  ('users.manage',            'Create/edit/deactivate users'),
  ('content.manage',          'Full content administration'),
  ('roles.assign',            'Assign platform roles (below super_admin)'),
  ('roles.assign_super',      'Assign the super_admin role'),
  ('settings.financial',      'Edit sensitive financial settings'),
  ('data.hard_delete',        'Permanently delete data'),
  ('audit.read',              'Read the audit log');

insert into public.role_permissions (role, permission_key) values
  ('support_agent','tickets.read'), ('support_agent','tickets.respond'),
  ('support_lead','tickets.read'), ('support_lead','tickets.respond'),
  ('support_lead','tickets.escalate'), ('support_lead','users.suspend_temp'),
  ('support_lead','refunds.small'), ('support_lead','disputes.resolve'),
  ('moderator','content.moderate'),
  ('accountant','finance.read'),
  ('finance_manager','finance.read'), ('finance_manager','finance.approve_payouts'),
  ('finance_manager','finance.edit_rates'), ('finance_manager','refunds.large'),
  ('tech_support','system.observability'), ('tech_support','system.jobs'),
  ('admin','users.manage'), ('admin','content.manage'), ('admin','content.moderate'),
  ('admin','roles.assign'), ('admin','audit.read'),
  ('super_admin','users.manage'), ('super_admin','content.manage'),
  ('super_admin','roles.assign'), ('super_admin','roles.assign_super'),
  ('super_admin','settings.financial'), ('super_admin','data.hard_delete'),
  ('super_admin','audit.read'), ('super_admin','finance.read'),
  ('super_admin','finance.approve_payouts'), ('super_admin','finance.edit_rates');

-- Permission check helper for RLS/policies/UI.
create or replace function public.has_permission(perm text)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = auth.uid() and rp.permission_key = perm
  );
$$;

-- HARD RULE (enforce in app + this trigger): only a super_admin assigns super_admin.
create or replace function public.guard_super_admin_promotion()
returns trigger language plpgsql security definer as $$
begin
  if new.role = 'super_admin' and coalesce(old.role,'user') <> 'super_admin' then
    if not public.has_permission('roles.assign_super') then
      raise exception 'Only a super_admin can assign super_admin';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_super_admin on public.profiles;
create trigger trg_guard_super_admin
  before update of role on public.profiles
  for each row execute procedure public.guard_super_admin_promotion();

-- ============================================================
-- LAYER 2 — INDIVIDUAL CAPABILITIES (many per user, not one column)
-- ============================================================
create type user_capability as enum (
  'job_seeker',   -- apply to jobs
  'freelancer',   -- offer services, take freelance projects
  'client',       -- post freelance projects as an individual
  'learner',      -- enroll in courses/paths
  'instructor',   -- create courses, earn revenue
  'mentor',       -- offer paid career coaching sessions
  'assessor'      -- human grading / certification review
);

-- DECISION (approved): assessment is BOTH automatic and human.
-- Every assessable unit (quiz, PMP level exam, certification) created in
-- Sprint 2+ carries an assessment_mode:
--   'auto'   → graded by the system (instant)
--   'human'  → graded by an assessor / certification_body
--   'hybrid' → auto-graded first, human review required to certify
create type assessment_mode as enum ('auto','human','hybrid');

-- DECISION (approved): mentors see the published catalog (courses + jobs)
-- from day one — the mentor capability includes read access to all
-- is_published catalog items across both education and employment, so a
-- mentor can build guidance plans that reference real courses and real
-- openings. (Same anon-visible catalog, but guaranteed for mentors even if
-- parts of the catalog are later restricted to specific capabilities.)

create table public.user_capabilities (
  user_id uuid not null references public.profiles(id) on delete cascade,
  capability user_capability not null,
  enabled_at timestamptz default now(),
  primary key (user_id, capability)
);
alter table public.user_capabilities enable row level security;
create policy "Own capabilities: read" on public.user_capabilities
  for select using (auth.uid() = user_id);
create policy "Own capabilities: manage" on public.user_capabilities
  for all using (auth.uid() = user_id);
create index idx_user_capabilities_capability on public.user_capabilities(capability);

-- NOTE: profiles.account_type is DEMOTED to an onboarding hint only.
-- On signup it seeds initial capabilities (student→learner,
-- job_seeker→job_seeker, freelancer→freelancer+client, employee→learner,
-- company→ organization creation flow). It is no longer a permission source.

-- Earning profiles (instructor / mentor / assessor share one shape).
create type earner_kind as enum ('instructor','mentor','assessor');
create table public.earner_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind earner_kind not null,
  bio text,
  commission_rate numeric(5,2),          -- platform default if null
  payout_account jsonb,                  -- provider-agnostic
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','suspended')),
  created_at timestamptz default now(),
  unique (user_id, kind)
);
alter table public.earner_profiles enable row level security;
create policy "Own earner profile: read" on public.earner_profiles
  for select using (auth.uid() = user_id);
create policy "Own earner profile: update" on public.earner_profiles
  for update using (auth.uid() = user_id);

-- ============================================================
-- LAYER 3 — ORGANIZATIONS & MEMBERSHIPS
-- ============================================================
create type org_type as enum ('company','institute','certification_body');
create type org_capability as enum (
  'hiring',             -- post jobs
  'freelance_hiring',   -- hire freelancers
  'training_provider',  -- offer courses (institutes; companies if allowed)
  'training_consumer',  -- train own employees & track them
  'certification'       -- issue/endorse certificates (PMP levels etc.)
);
create type org_role as enum (
  'owner',            -- exactly one; cannot be removed; deletes/transfers org
  'org_admin',        -- members, settings, billing
  'recruiter',        -- post jobs/projects, contact candidates
  'viewer',           -- read/filter only (HR viewer)
  'org_instructor',   -- institute-affiliated instructor (own courses only)
  'training_manager', -- enroll employees, track progress
  'member'            -- plain employee; appears in training reports
);

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  type org_type not null,
  name text not null,
  owner_user_id uuid not null references public.profiles(id),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','suspended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_orgs_updated_at before update on public.organizations
  for each row execute procedure public.set_updated_at();

create table public.organization_capabilities (
  org_id uuid not null references public.organizations(id) on delete cascade,
  capability org_capability not null,
  primary key (org_id, capability)
);

create table public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_role org_role not null default 'member',
  invited_by uuid references public.profiles(id),
  joined_at timestamptz default now(),
  primary key (org_id, user_id)
);
create index idx_org_members_user on public.organization_members(user_id);

alter table public.organizations enable row level security;
alter table public.organization_capabilities enable row level security;
alter table public.organization_members enable row level security;

create or replace function public.org_role_of(p_org uuid)
returns org_role language sql security definer stable as $$
  select org_role from public.organization_members
  where org_id = p_org and user_id = auth.uid();
$$;

create policy "Org: members read" on public.organizations
  for select using (public.org_role_of(id) is not null);
create policy "Org: admins update" on public.organizations
  for update using (public.org_role_of(id) in ('owner','org_admin'));
create policy "Org caps: members read" on public.organization_capabilities
  for select using (public.org_role_of(org_id) is not null);
create policy "Org members: members read" on public.organization_members
  for select using (public.org_role_of(org_id) is not null);
create policy "Org members: admins manage" on public.organization_members
  for all using (public.org_role_of(org_id) in ('owner','org_admin'));

-- Owner integrity: the owner row in organization_members cannot be deleted
-- and owner_user_id can only change via a transfer that keeps exactly one owner.
create or replace function public.guard_owner_membership()
returns trigger language plpgsql security definer as $$
begin
  if old.org_role = 'owner' then
    raise exception 'The owner membership cannot be removed; transfer ownership first';
  end if;
  return old;
end $$;
drop trigger if exists trg_guard_owner_membership on public.organization_members;
create trigger trg_guard_owner_membership
  before delete on public.organization_members
  for each row execute procedure public.guard_owner_membership();

-- ============================================================
-- POLYMORPHIC OWNERSHIP RULE (jobs / projects / courses — future tables)
-- Every listing table created in Sprints 2/4/5 MUST use:
--   owner_type text check (owner_type in ('user','organization')),
--   owner_id uuid not null
-- so individual instructors & institutes (or individual clients & companies)
-- share one table. Enrollments gain sponsor_org_id uuid null → when set,
-- the enrollment is company-sponsored and visible to its training_manager.
-- ============================================================

-- ============================================================
-- GUESTS (unauthenticated visitors) — explicit, not implicit
-- Guests may browse PUBLIC catalog data only: published courses, published
-- jobs, and freelancer public profiles. They can never apply/enroll/contact.
-- Implementation: catalog tables get `is_published boolean` and an anon
-- SELECT policy `using (is_published = true)`. Applied when those tables
-- are created (Sprints 2/4); recorded here as the binding decision.
-- ============================================================

-- ============================================================
-- SYSTEM ACTORS (Nova, schedulers) — auditable non-human identity
-- ============================================================
create table public.system_actors (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,          -- 'nova', 'scheduler'
  description text
);
insert into public.system_actors (name, description) values
  ('nova', 'AI mentor agent'),
  ('scheduler', 'Background jobs: points, badge sweeps, digests');

-- ============================================================
-- AUDIT LOG — persistent table (upgrades the stdout-only auditLog())
-- actor is EITHER a user OR a system actor, never both.
-- ============================================================
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid references public.profiles(id),
  actor_system_id uuid references public.system_actors(id),
  action text not null,               -- 'refund.issued', 'role.assigned', ...
  target_type text,                   -- 'user','organization','payout',...
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  check (num_nonnulls(actor_user_id, actor_system_id) = 1)
);
create index idx_audit_log_actor on public.audit_log(actor_user_id, created_at desc);
create index idx_audit_log_target on public.audit_log(target_type, target_id);
alter table public.audit_log enable row level security;
create policy "Audit: permission-gated read" on public.audit_log
  for select using (public.has_permission('audit.read'));
-- Inserts happen via service role / SECURITY DEFINER functions only.

-- ============================================================
-- AFFILIATES (referral marketers) — decided now, not deferred
-- ============================================================
create table public.affiliates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  referral_code text unique not null,
  commission_rate numeric(5,2) not null default 10.00,
  status text not null default 'active' check (status in ('active','paused','terminated')),
  created_at timestamptz default now()
);
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_user_id uuid unique not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.affiliates enable row level security;
alter table public.referrals enable row level security;
create policy "Affiliate: own row" on public.affiliates
  for select using (auth.uid() = user_id);
create policy "Referrals: own" on public.referrals
  for select using (exists (
    select 1 from public.affiliates a
    where a.id = affiliate_id and a.user_id = auth.uid()
  ));

-- ============================================================
-- API PARTNERS (universities, gov job portals) — keys, not user roles
-- ============================================================
create table public.api_partners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  key_hash text unique not null,       -- store a hash, never the raw key
  scopes text[] not null default '{}', -- e.g. {'jobs.read','courses.read'}
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz default now(),
  last_used_at timestamptz
);
-- No RLS-for-users: accessed only via service role in dedicated API routes.

-- ============================================================
-- DISPUTES — handled by support_lead via 'disputes.resolve' permission
-- (decision: a permission on an existing role, not a new role). The
-- disputes table itself ships with the freelance-payments sprint.
-- ============================================================
