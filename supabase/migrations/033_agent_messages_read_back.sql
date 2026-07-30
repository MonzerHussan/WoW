-- ============================================================
-- WOW - World of Work — Migration 033
-- Closes TECH_DEBT #17: the agent's conversation history was written
-- but never read back, so it died on every reload and was never shared
-- across surfaces (the floating agent, the dashboard's AgentChat).
--
-- REUSES `ai_conversations` (schema.sql) INSTEAD OF A NEW TABLE. It
-- already has exactly the shape this feature needs — user_id, role,
-- a text column, created_at — and, notably, an index built exactly for
-- this access pattern (`(user_id, created_at desc)`, migration 002)
-- that nothing ever queried until now. Building a second, parallel
-- table would have meant two diverging conversation logs for the same
-- feature. Renamed rather than left as-is: the table's own header
-- comment still says "NOVA", the persona this codebase renamed away
-- from in Sprint 3 (app/api/agent/route.ts's own comment), and
-- `content` matches every other message-shaped column in this schema
-- better than `message` does.
--
-- WRITE ACCESS: the table previously had an owner-insert policy
-- (`auth.uid() = user_id`), which meant a client could POST a fake
-- 'assistant' row directly via PostgREST — never exploited, but a real
-- latent hole: a fabricated assistant turn would be blindly trusted as
-- real conversation history and fed back into a future prompt as
-- context, an unusual angle on prompt injection specific to this
-- feature. That policy is dropped; the table has NO write policy at
-- all now, protected the same way pricing_units/placement_usage are
-- (030) — the FOR EACH STATEMENT `forbid_client_write()` trigger from
-- that migration is reused here unchanged rather than duplicated,
-- since with zero write policies a ROW-level trigger would never fire
-- for the same reason documented there.
--
-- record_agent_turn(p_user_message, p_assistant_reply) is the only
-- writer: SECURITY DEFINER, no p_user parameter (self-only, same
-- "cannot spoof another user" shape as award_lesson_points), writes
-- BOTH rows in one call — deliberately only after a real OpenAI reply
-- exists, so a failed model call can never leave an orphaned user-only
-- turn with no matching reply. This also means app/api/agent/route.ts
-- no longer writes eagerly before the OpenAI call the way it used to.
-- ============================================================

alter table public.ai_conversations rename to agent_messages;
alter table public.agent_messages rename column message to content;

alter policy "Conversations are viewable by owner"
  on public.agent_messages rename to "Agent messages: owner reads";

drop policy "Conversations are insertable by owner" on public.agent_messages;

drop trigger if exists trg_agent_messages_forbid_client_write on public.agent_messages;
create trigger trg_agent_messages_forbid_client_write
  before insert or update or delete on public.agent_messages
  for each statement execute procedure public.forbid_client_write();

create or replace function public.record_agent_turn(p_user_message text, p_assistant_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.agent_messages (user_id, role, content)
  values
    (auth.uid(), 'user', p_user_message),
    (auth.uid(), 'assistant', p_assistant_reply);
end;
$$;

revoke execute on function public.record_agent_turn(text, text) from public, anon;
grant execute on function public.record_agent_turn(text, text) to authenticated;

-- Self-check, same discipline as every migration in this file's family.
do $$
declare
  v_table_exists boolean;
  v_old_table_exists boolean;
  v_column_exists boolean;
  v_fn int;
  v_trigger int;
  v_insert_policy int;
begin
  select exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'agent_messages')
    into v_table_exists;
  if not v_table_exists then
    raise exception 'agent_messages was not created (rename failed)';
  end if;

  select exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'ai_conversations')
    into v_old_table_exists;
  if v_old_table_exists then
    raise exception 'ai_conversations still exists — rename did not take effect';
  end if;

  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'agent_messages' and column_name = 'content'
  ) into v_column_exists;
  if not v_column_exists then
    raise exception 'agent_messages.content column was not created (rename failed)';
  end if;

  select count(*) into v_fn from pg_proc where proname = 'record_agent_turn';
  if v_fn = 0 then
    raise exception 'record_agent_turn() was not created';
  end if;

  select count(*) into v_trigger from pg_trigger
   where tgisinternal = false and tgname = 'trg_agent_messages_forbid_client_write';
  if v_trigger <> 1 then
    raise exception 'trg_agent_messages_forbid_client_write is not installed';
  end if;

  select count(*) into v_insert_policy from pg_policies
   where schemaname = 'public' and tablename = 'agent_messages' and cmd = 'INSERT';
  if v_insert_policy <> 0 then
    raise exception 'agent_messages must have ZERO insert policies, found %', v_insert_policy;
  end if;

  raise notice '033 OK: agent_messages (renamed from ai_conversations) locked down, record_agent_turn() installed';
end $$;
