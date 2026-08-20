-- ============================================================
-- WOW - World of Work — Migration 077
-- The counterpart's display name for the two parties to an instructor
-- assignment. Narrowest possible: two fields, participants only.
--
-- WHY A FUNCTION AND NOT AN RLS POLICY. RLS filters ROWS, never
-- COLUMNS. A "participants may read each other" SELECT policy on
-- profiles would hand over the WHOLE row — all 17 columns, including
-- email, age, gender, role, status, points and level. That is the exact
-- lesson migration 063 already recorded for lessons.draft_content.
--
-- Nor can it be fixed with a column-level REVOKE the way 063 did:
-- `revoke select (email) on profiles` applies to the ROLE, so it would
-- also stop a user reading their own email and break the app. 063 could
-- only do it because nothing legitimately read draft_content.
--
-- So: NO new policy on profiles. One SECURITY DEFINER function that
-- returns exactly two fields and never lets the row out — the same
-- "no policy = no path, one verified function is the only door" shape
-- as 027/028/030/033/074.
--
-- WHICH NAME IS RETURNED IS DECIDED HERE, NOT IN THE UI. If the
-- counterpart is the INSTRUCTOR, the function returns
-- instructor_profiles.display_name; if the counterpart is the LEARNER,
-- it returns profiles.full_name. An instructor who deliberately chose a
-- display name different from their legal name (a professional handle,
-- a shortened form, a surname they would rather not publish) must not
-- have profiles.full_name leave the database at all — hiding it in the
-- UI is not concealment, since the data still crossed the wire. Putting
-- the CASE here also means the counterpart has ONE name everywhere:
-- the same string in the request card and later in the conversation.
--
-- STATUS SCOPE: 'pending' and 'accepted' only. No surface needs a
-- declined counterpart's name — the instructor panel renders only
-- pending, messaging requires accepted, and the learner's own list
-- takes the instructor's name from instructor_profiles, which has been
-- signed-in readable since 040. Excluding 'declined' therefore costs
-- nothing and narrows what leaves the database.
--
-- THIS FUNCTION IS NOW A SECURITY BOUNDARY. SECURITY DEFINER bypasses
-- RLS entirely (the same property behind the 075 hole), so profiles is
-- protected on this path by the WHERE clause below and nothing else.
-- Its participants predicate is the whole guard.
--
-- avatar_url is included on the owner's explicit approval: the avatars
-- bucket has been PUBLIC-read since 041, so the image is already
-- served to anyone with the URL — passing the URL is not a new
-- exposure. Both parties' avatars come from profiles.avatar_url;
-- instructor_profiles has no avatar column of its own.
--
-- No earlier migration is modified.
-- ============================================================

create or replace function public.get_my_assignment_counterparts()
returns table (
  assignment_id uuid,
  counterpart_id uuid,
  counterpart_name text,
  counterpart_avatar_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ia.id as assignment_id,
    cp.id as counterpart_id,
    -- The counterpart is the INSTRUCTOR exactly when the caller is the
    -- learner. NULL rather than a full_name fallback when an instructor
    -- has no profile row: a missing display name must never degrade
    -- into leaking the real one. The UI substitutes a generic label.
    case
      when ia.learner_id = auth.uid() then ip.display_name
      else pr.full_name
    end as counterpart_name,
    pr.avatar_url as counterpart_avatar_url
  from public.instructor_assignments ia
  cross join lateral (
    select case
             when ia.instructor_id = auth.uid() then ia.learner_id
             else ia.instructor_id
           end as id
  ) cp
  join public.profiles pr on pr.id = cp.id
  left join public.instructor_profiles ip on ip.user_id = cp.id
  where auth.uid() is not null
    and (ia.instructor_id = auth.uid() or ia.learner_id = auth.uid())
    and ia.status in ('pending', 'accepted');
$$;

revoke execute on function public.get_my_assignment_counterparts() from public, anon;
grant execute on function public.get_my_assignment_counterparts() to authenticated;

-- ============================================================
-- SELF-CHECK
-- ============================================================
do $$
declare
  v_secdef boolean;
  v_config text;
  v_result text;
  v_profiles_policies int;
begin
  select p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '')
    into v_secdef, v_config
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_my_assignment_counterparts';

  if v_secdef is null then
    raise exception '077 failed: get_my_assignment_counterparts() was not created';
  end if;
  if not v_secdef then
    raise exception '077 failed: the function must be SECURITY DEFINER to read profiles at all';
  end if;
  if v_config not like '%search_path=public%' then
    raise exception '077 failed: search_path is not pinned (config: %) — a SECURITY DEFINER function without it is hijackable', v_config;
  end if;

  -- Read the ACTUAL signature back rather than trusting the source
  -- above: this is what proves no extra column can escape.
  select pg_get_function_result(p.oid) into v_result
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_my_assignment_counterparts';

  if v_result ilike '%email%' or v_result ilike '%points%' or v_result ilike '%role%'
     or v_result ilike '%age%' or v_result ilike '%gender%' or v_result ilike '%status%' then
    raise exception '077 failed: the function returns a column outside the approved two (result: %)', v_result;
  end if;
  if v_result not ilike '%counterpart_name%' or v_result not ilike '%counterpart_avatar_url%' then
    raise exception '077 failed: expected counterpart_name and counterpart_avatar_url in the result (got: %)', v_result;
  end if;

  -- profiles must be left exactly as it was: no new read policy.
  select count(*) into v_profiles_policies
    from pg_policies where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT';
  if v_profiles_policies <> 2 then
    raise exception '077 failed: profiles SELECT policies changed (expected the original 2, found %) — this migration must add none', v_profiles_policies;
  end if;

  raise notice '077 OK: counterpart lookup installed (2 fields, participants + pending/accepted only); profiles policies untouched; search_path pinned. Result: %', v_result;
end $$;
