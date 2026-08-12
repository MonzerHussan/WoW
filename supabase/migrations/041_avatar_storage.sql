-- ============================================================
-- WOW - World of Work — Migration 041
-- Avatar upload (navigation-restructuring batch, item 6). `profiles.
-- avatar_url` has existed since schema.sql with nothing that ever wrote
-- to it — this is the first real writer.
--
-- A public Storage bucket, not a signed-URL/private one: avatars are
-- shown to other users by design (leaderboard, any future "who's this"
-- context) — there is no privacy expectation on a profile picture the
-- same way there is on, say, a certificate, so public read keeps this
-- simple rather than routing every avatar view through a signed-URL
-- refresh.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- One file per user, path convention `{user_id}/avatar.<ext>` — enforced
-- by the policies below via `(storage.foldername(name))[1] = auth.uid()::text`,
-- the standard Supabase Storage RLS pattern for "first path segment is
-- the owner's own id".
drop policy if exists "Avatars: public read" on storage.objects;
create policy "Avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Avatars: owner uploads own" on storage.objects;
create policy "Avatars: owner uploads own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatars: owner updates own" on storage.objects;
create policy "Avatars: owner updates own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatars: owner deletes own" on storage.objects;
create policy "Avatars: owner deletes own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- SELF-CHECK
-- ============================================================

do $$
declare
  v_bucket_exists boolean;
  v_policies int;
begin
  select exists(select 1 from storage.buckets where id = 'avatars') into v_bucket_exists;
  if not v_bucket_exists then
    raise exception 'avatars bucket was not created';
  end if;

  select count(*) into v_policies
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like 'Avatars:%';
  if v_policies <> 4 then
    raise exception 'expected 4 avatar storage policies, found %', v_policies;
  end if;

  raise notice '041 OK: avatars bucket (public) created with 4 owner-scoped write policies';
end $$;
