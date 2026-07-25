-- ============================================================
-- WOW - World of Work — Migration 020
-- Coin wallet activation on /profile: bilingual package names +
-- credit_coins(), a LOCALLY-SIMULATED purchase — no real payment
-- gateway. Mirrors spend_coins() (007b): security definer, re-verifies
-- the caller server-side, never trusts a client-supplied coin amount
-- (the amount is always read from coin_packages by id).
-- ============================================================

alter table public.coin_packages
  add column if not exists name_en text;

update public.coin_packages set name_en = 'Starter Pack' where name = 'باقة البداية';
update public.coin_packages set name_en = 'Growth Pack' where name = 'باقة النمو';
update public.coin_packages set name_en = 'Pro Pack' where name = 'باقة الاحتراف';

create or replace function public.credit_coins(p_user uuid, p_package_id uuid)
returns boolean language plpgsql security definer as $$
declare
  v_coins int;
begin
  if p_user is distinct from auth.uid() then
    return false;
  end if;

  select coins into v_coins from public.coin_packages where id = p_package_id and is_active = true;
  if v_coins is null then
    return false;
  end if;

  update public.wallets set balance = balance + v_coins where user_id = p_user;
  if not found then
    insert into public.wallets (user_id, balance) values (p_user, v_coins);
  end if;

  -- 'simulated_purchase' is a deliberately distinct reason from any
  -- future real-payment-gateway purchase, so this stays filterable out
  -- of any real financial report later. See TECH_DEBT.md: this path
  -- has no rate limit — a real payment gateway must replace it before
  -- any Beta traffic beyond the closed test circle.
  insert into public.coin_transactions (user_id, amount, type, reason, ref_table, ref_id)
  values (p_user, v_coins, 'purchase', 'simulated_purchase', 'coin_packages', p_package_id);

  return true;
end $$;

revoke execute on function public.credit_coins(uuid, uuid) from anon;
