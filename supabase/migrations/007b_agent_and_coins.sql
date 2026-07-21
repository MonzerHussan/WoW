-- ============================================================
-- WOW - World of Work — Migration 007b
-- Sprint 3 domain additions: Unified Personal Agent + Coins Wallet
-- Run order: 001 → ... → 006 → 007 → 007b → 008. Additive only.
-- ============================================================

-- ============================================================
-- A) UNIFIED PERSONAL AGENT ("رفيق" model — approved design)
-- ============================================================

create table public.user_agent_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  chosen_name text not null default 'رفيق',
  avatar_style text,
  memory_summary jsonb not null default '{}'::jsonb,
  interaction_style text not null default 'balanced'
    check (interaction_style in ('concise','balanced','detailed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_agent_profiles_updated_at before update on public.user_agent_profiles
  for each row execute procedure public.set_updated_at();

alter table public.user_agent_profiles enable row level security;
create policy "Agent profile: owner" on public.user_agent_profiles
  for all using (auth.uid() = user_id);

create or replace function public.handle_new_agent_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_agent_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_create_agent_profile on public.profiles;
create trigger trg_create_agent_profile
  after insert on public.profiles
  for each row execute procedure public.handle_new_agent_profile();

-- ============================================================
-- B) CAPABILITY ACTIVATION TRAIL
-- ============================================================
create table public.capability_activation_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  capability user_capability not null,
  activated_via text not null check (activated_via in ('signup_default','profile_self_service','admin')),
  created_at timestamptz default now()
);
create index idx_capability_log_user on public.capability_activation_log(user_id);
alter table public.capability_activation_log enable row level security;
create policy "Capability log: owner reads" on public.capability_activation_log
  for select using (auth.uid() = user_id);

-- ============================================================
-- C) COINS WALLET — strictly separate from profiles.points
-- ============================================================
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz default now()
);
create trigger trg_wallets_updated_at before update on public.wallets
  for each row execute procedure public.set_updated_at();

create table public.coin_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  type text not null check (type in ('purchase','spend','grant','refund')),
  reason text not null,
  ref_table text,
  ref_id uuid,
  created_at timestamptz default now()
);
create index idx_coin_tx_user on public.coin_transactions(user_id, created_at desc);

create or replace function public.handle_new_wallet()
returns trigger language plpgsql security definer as $$
declare
  welcome_grant constant int := 30;
begin
  insert into public.wallets (user_id, balance) values (new.id, welcome_grant)
  on conflict (user_id) do nothing;

  insert into public.coin_transactions (user_id, amount, type, reason)
  values (new.id, welcome_grant, 'grant', 'welcome_bonus');
  return new;
end $$;

drop trigger if exists trg_create_wallet on public.profiles;
create trigger trg_create_wallet
  after insert on public.profiles
  for each row execute procedure public.handle_new_wallet();

create table public.coin_packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  coins int not null,
  price_usd numeric(8,2) not null,
  is_active boolean not null default true
);

-- SECURITY (pre-execution fix): the original body took p_user/p_amount as
-- free-form caller input with no identity check and no sign check — called
-- directly via PostgREST RPC (default Supabase exposure for every
-- public-schema function) that let any authenticated client drain another
-- user's wallet, or mint free coins with a negative p_amount. Same
-- vulnerability class as the points-award bug in CLAUDE.md rule #4 ("لا
-- تُعِدها"). Fixed in-function so the normal supabaseServer() session
-- client (role `authenticated`, same as app/api/points/award/route.ts)
-- keeps working — no service_role key needed. `is distinct from` (not
-- `<>`) is required: auth.uid() is null for an unauthenticated caller, and
-- `p_user <> null` evaluates to null (neither true nor false) in plpgsql,
-- which does NOT enter the `if` branch — a plain `<>` check would silently
-- let an anon caller through.
create or replace function public.spend_coins(p_user uuid, p_amount int, p_reason text, p_ref_table text default null, p_ref_id uuid default null)
returns boolean language plpgsql security definer as $$
declare
  current_balance int;
begin
  if p_user is distinct from auth.uid() then
    return false;
  end if;
  if p_amount is null or p_amount <= 0 then
    return false;
  end if;

  select balance into current_balance from public.wallets where user_id = p_user for update;
  if current_balance is null or current_balance < p_amount then
    return false;
  end if;

  update public.wallets set balance = balance - p_amount where user_id = p_user;
  insert into public.coin_transactions (user_id, amount, type, reason, ref_table, ref_id)
  values (p_user, -p_amount, 'spend', p_reason, p_ref_table, p_ref_id);
  return true;
end $$;

-- Defense in depth: unauthenticated callers are already rejected by the
-- auth.uid() check above, but revoking anon's EXECUTE grant means that
-- rejection never even needs to run for anon — consistent with
-- /api/points/award requiring a signed-in user via auth.getUser().
-- `authenticated` keeps its default EXECUTE grant untouched.
revoke execute on function public.spend_coins(uuid, int, text, text, uuid) from anon;

alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.coin_packages enable row level security;

create policy "Wallet: owner reads" on public.wallets
  for select using (auth.uid() = user_id);
create policy "Coin tx: owner reads" on public.coin_transactions
  for select using (auth.uid() = user_id);
create policy "Coin packages: public read" on public.coin_packages
  for select using (is_active = true);

insert into public.coin_packages (name, coins, price_usd) values
  ('باقة البداية', 300, 5.00),
  ('باقة النمو', 800, 12.00),
  ('باقة الاحتراف', 2000, 25.00);
