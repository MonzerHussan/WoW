-- ============================================================
-- WOW - World of Work — Migration 024
-- Central pricing by ACTION TYPE (not per lesson), plus the two narrow
-- security-definer functions that are the only way a price can move.
--
-- WHY BY TYPE, NOT PER LESSON: verified against live data during 023 —
-- every ordinary writing task costs 3 and every module-closing task
-- costs 5, with zero exceptions across all 18 lessons. A per-lesson
-- price would model a variation that does not exist.
--
-- `lessons.content->...->coin_cost` is deliberately NOT deleted (no
-- destructive migration over authored content), but from this migration
-- on it is NON-AUTHORITATIVE for both display and charging — readers go
-- to pricing_units. Historical rows in language_task_submissions keep
-- their own coin_cost/task_text_snapshot, so no past submission is
-- reinterpreted. Tracked in TECH_DEBT as data that is now dead.
--
-- PERMISSION: `finance.edit_rates`, which already exists in the seeded
-- RBAC model (003) and is already held by `finance_manager` and
-- `super_admin`. This is deliberately NOT `content.manage`: RBAC.md
-- lists "financial settings" among `admin`'s explicit denials, and
-- `content_manager` (015a) is a narrow role created purely for
-- curriculum review. Gating prices on a content permission would have
-- silently widened both. No new permission is introduced and no
-- existing role's grants change — the pricing tables simply fall under
-- the "edit rates" permission that was always meant for them.
--
-- AUDIT TRAIL: writes to the existing `audit_log` (003), which had been
-- created with RLS and indexes but never actually written to by
-- anything — this migration is its first real writer. Deliberately NOT
-- a dedicated pricing_audit table: RBAC.md already states that every
-- staff action writes to `audit_log`, and a second competing trail
-- would contradict it. `audit_log` has no INSERT policy, exactly as
-- intended — its comment says inserts happen via SECURITY DEFINER
-- functions only, and these two are the first.
-- ============================================================

create table if not exists public.pricing_units (
  key text primary key,
  coin_cost int not null check (coin_cost >= 0),
  label_ar text,
  label_en text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Seeded with today's real, verified values. `on conflict do nothing`
-- keeps this migration safe to re-run and, more importantly, means
-- re-running it can never silently reset a price an admin has since
-- changed through the UI.
insert into public.pricing_units (key, coin_cost, label_ar, label_en) values
  ('pronunciation_practice',       3, 'تقييم نطق',            'Pronunciation evaluation'),
  ('language_task_writing',        3, 'مهمة كتابة عادية',      'Standard writing task'),
  ('language_task_module_closing', 5, 'مهمة كتابة ختام وحدة', 'Module-closing writing task')
on conflict (key) do nothing;

alter table public.pricing_units enable row level security;

-- Prices are public knowledge to a signed-in learner — the lesson page
-- and the pronunciation widget both display them before charging.
drop policy if exists "Pricing units: signed-in read" on public.pricing_units;
create policy "Pricing units: signed-in read" on public.pricing_units
  for select using (auth.uid() is not null);

-- DELIBERATELY NO insert/update/delete POLICY on pricing_units. With RLS
-- enabled and no write policy, every direct write from a normal
-- `authenticated` session is refused no matter who the caller is — the
-- security-definer functions below are the only door. This is the same
-- "never a broad RLS write for a money-touching table" rule that
-- spend_coins/credit_coins already follow.

-- ============================================================
-- The ONLY way a unit price changes.
--
-- Note the real has_permission signature: it takes the permission key
-- alone and resolves auth.uid() itself (003) — there is no
-- has_permission(uuid, text) overload.
--
-- Raises instead of returning false on a permission failure: a rejected
-- price change must be loud and distinguishable from "key not found",
-- unlike spend_coins where `false` legitimately means "insufficient
-- balance". 42501 = insufficient_privilege, which PostgREST surfaces as
-- a 403.
--
-- audit_log.target_id is a uuid and a pricing_units key is text, so the
-- key travels in `metadata` with target_id left null. The table's
-- `num_nonnulls(actor_user_id, actor_system_id) = 1` check is satisfied
-- because has_permission already proved auth.uid() resolves to a real
-- profiles row — an anonymous caller can never reach the insert.
-- ============================================================
create or replace function public.update_pricing_unit(p_key text, p_new_cost int)
returns boolean language plpgsql security definer
set search_path = public
as $$
declare
  v_old int;
begin
  if not public.has_permission('finance.edit_rates') then
    raise exception 'Not authorized to change pricing'
      using errcode = '42501';
  end if;

  -- Mirrors the table's own CHECK so a bad value is rejected with a
  -- clear message rather than a raw constraint violation.
  if p_new_cost is null or p_new_cost < 0 then
    raise exception 'coin_cost must be a non-negative integer'
      using errcode = '22023';
  end if;

  select coin_cost into v_old from public.pricing_units where key = p_key for update;
  if not found then
    return false;
  end if;

  update public.pricing_units
     set coin_cost = p_new_cost,
         updated_by = auth.uid(),
         updated_at = now()
   where key = p_key;

  -- Written unconditionally, including a no-op change (old = new): the
  -- trail records who touched the price and when, not only when the
  -- number happened to differ.
  insert into public.audit_log (actor_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'pricing.unit_updated',
    'pricing_unit',
    null,
    jsonb_build_object('key', p_key, 'old_coin_cost', v_old, 'new_coin_cost', p_new_cost)
  );

  return true;
end $$;

-- Separate function, not a generic one taking a table name: a
-- dynamic-identifier version would be an injection surface and would
-- make the permission check apply to tables nobody reviewed. Same
-- reasoning the owner gave, kept explicit here.
create or replace function public.update_coin_package_price(p_package_id uuid, p_new_price numeric)
returns boolean language plpgsql security definer
set search_path = public
as $$
declare
  v_old numeric(8,2);
begin
  if not public.has_permission('finance.edit_rates') then
    raise exception 'Not authorized to change pricing'
      using errcode = '42501';
  end if;

  if p_new_price is null or p_new_price < 0 then
    raise exception 'price_usd must be non-negative'
      using errcode = '22023';
  end if;

  select price_usd into v_old from public.coin_packages where id = p_package_id for update;
  if not found then
    return false;
  end if;

  update public.coin_packages set price_usd = p_new_price where id = p_package_id;

  -- Here target_id IS a real uuid, so it is used properly. Prices stay
  -- numeric in metadata — no rounding, unlike an int-typed audit column
  -- would have forced.
  insert into public.audit_log (actor_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'pricing.coin_package_updated',
    'coin_package',
    p_package_id,
    jsonb_build_object('old_price_usd', v_old, 'new_price_usd', p_new_price)
  );

  return true;
end $$;

-- Same defense-in-depth as spend_coins (007b): anon is already rejected
-- by has_permission (auth.uid() is null → no profile row → false), but
-- revoking EXECUTE means that rejection never has to run.
revoke execute on function public.update_pricing_unit(text, int) from anon;
revoke execute on function public.update_coin_package_price(uuid, numeric) from anon;

-- Self-check, same discipline as 023: fail loudly rather than leave a
-- half-seeded pricing table that would make lessons look free. Also
-- asserts the permission this migration depends on actually exists in
-- the seeded RBAC model, since a typo there would produce functions
-- that reject everyone forever.
do $$
declare
  v_units int;
  v_perm int;
begin
  select count(*) into v_units from public.pricing_units
   where key in ('pronunciation_practice', 'language_task_writing', 'language_task_module_closing');
  if v_units <> 3 then
    raise exception 'Expected the 3 seeded pricing units, found %', v_units;
  end if;

  select count(*) into v_perm from public.role_permissions
   where permission_key = 'finance.edit_rates';
  if v_perm = 0 then
    raise exception 'finance.edit_rates is not granted to any role — pricing would be uneditable';
  end if;

  raise notice '024 OK: % pricing units seeded, finance.edit_rates granted to % role(s)', v_units, v_perm;
end $$;
