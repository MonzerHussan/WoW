-- ============================================================
-- 007 — Signup flow alignment with the RBAC model (RBAC.md)
-- ============================================================
-- 1. New account_type hints surfaced on the signup page:
--    'instructor' → individual who will get the `instructor` capability
--                   (user_capabilities) after onboarding
--    'institute'  → the founder signs up as an individual; after onboarding
--                   they are directed to create an organization of type
--                   'institute' (same path as 'company')
--    Reminder (003): account_type is an ONBOARDING HINT only — never a
--    permission source. Capabilities and org roles remain the authority.
--
-- 2. handle_new_user() fixes:
--    a) FIX (critical): the original function referenced the account_type
--       enum unqualified. GoTrue (supabase_auth_admin) calls the trigger
--       with a search_path that does not include public, so the cast blew
--       up with "Database error saving new user" on EVERY signup.
--       `set search_path = public` + schema-qualified cast fixes it.
--    b) OAuth providers (Google) put the display name in
--       raw_user_meta_data->>'name' rather than 'full_name' — coalesce
--       both so OAuth profiles are not created with an empty name.

alter type account_type add value if not exists 'instructor';
alter type account_type add value if not exists 'institute';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, account_type)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    new.email,
    coalesce(
      (new.raw_user_meta_data->>'account_type')::public.account_type,
      'student'::public.account_type
    )
  );
  return new;
end;
$$;
