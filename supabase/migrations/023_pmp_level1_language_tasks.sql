-- ============================================================
-- WOW - World of Work — Migration 023
-- Content-only, no schema change: adds a `language_task` key at the
-- ROOT of the existing `lessons.content` jsonb for the 12 PMP Level 1
-- lessons that had no writing task, each drilling that lesson's own
-- grammar point and vocabulary. Authored by the product owner
-- directly — Claude Code's role here is applying and verifying it,
-- not writing the content.
--
-- WHY A NEW ROOT KEY INSTEAD OF module_closing (owner's decision):
-- the 6 existing tasks live under `content.module_closing
-- .optional_language_task` and belong there — those 6 lessons really
-- are module endings, and the UI renders a "لإنهاء هذه الوحدة" card
-- for them. These 12 are mid-module lessons. Putting their tasks
-- under `module_closing` would make that closing card appear on
-- lessons that close nothing — a semantic error, not just a cosmetic
-- one.
--
-- The 6 old rows are NOT migrated and NOT touched. Readers resolve
-- `content.language_task ?? content.module_closing` instead, so both
-- shapes keep working and no existing submission is invalidated
-- (`language_task_submissions.task_text_snapshot` still matches what
-- those users were actually shown).
--
-- Verified against live data before writing this file: the 12 target
-- lessons have no `module_closing` object at all, and the 6 lessons
-- that do have one are disjoint from them — so no lesson can end up
-- showing two tasks.
--
-- Cost is 3 coins here, not the 5 used for module-closing tasks:
-- these are shorter (80-120 words, single grammar point). It is read
-- from the database server-side on every submission, never hardcoded
-- in the client (CLAUDE.md #4).
-- ============================================================

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','Write 80-100 words in English describing a project you have seen or worked on. Use the present simple to state facts about it, and include at least three of this lesson''s words: project, operations, scope, deliverable, stakeholder.',
  'coin_cost', 3
)) where title = 'Lesson 1.1: What Is a Project? Why Do Most Fail?';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','In 80-100 words, compare two of the three life cycles (predictive, agile, hybrid) for a project of your choice. Use at least two comparative structures: "more ... than", "less ... than", or "unlike X, Y ...".',
  'coin_cost', 3
)) where title = 'Lesson 1.2: Project Life Cycles — Predictive, Agile, and Hybrid';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','Write a short charter summary (100-120 words) for any project idea. Use "must", "should" and "need to" at least once each, to state what is required, what is recommended, and what is practically necessary.',
  'coin_cost', 3
)) where title = 'Lesson 2.1: The Project Charter — The Birth Certificate of a Project';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','In 80-100 words, describe three stakeholders of a project you know. Define each one using a relative clause with "who", "that" or "which" — for example: "The sponsor is the person who approves the budget."',
  'coin_cost', 3
)) where title = 'Lesson 2.2: Who Are the Stakeholders?';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','Write 80-100 words placing three stakeholders in the power/interest grid. Use the first conditional at least twice: "If a stakeholder has high power, you will ...".',
  'coin_cost', 3
)) where title = 'Lesson 2.3: The Power/Interest Grid';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','In 80-100 words, describe how a project you know started. Use the present perfect for results that still matter ("the charter has been approved") and the past simple for finished moments with a stated time ("we started in March").',
  'coin_cost', 3
)) where title = 'Lesson 3.1: Initiating';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','Write 80-100 words about planning a small project. Use at least two verbs followed by -ing (avoid, involve, mean) and two followed by "to" + verb (need, plan, decide).',
  'coin_cost', 3
)) where title = 'Lesson 3.2: Planning';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','In 80-100 words, describe what a project manager actually does during execution. Use at least three -ing forms in parallel: "managing the team", "coordinating vendors", "ensuring quality".',
  'coin_cost', 3
)) where title = 'Lesson 3.3: Executing';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','Write 80-100 words explaining how you would monitor a project. Use "while", "during" and "throughout" at least once each, correctly — remember that "during" is followed by a noun, but "while" is followed by a full clause.',
  'coin_cost', 3
)) where title = 'Lesson 3.4: Monitoring & Controlling';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','In 80-100 words, write three of your own "X over Y" value statements describing how you would like your team to work, in the style of the Agile Manifesto. Then explain one of them in two sentences.',
  'coin_cost', 3
)) where title = 'Lesson 4.1: The Agile Mindset';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','Write 80-100 words explaining the three Scrum roles to someone who has never heard of Scrum. Use the compound nouns correctly: Product Owner, Scrum Master, Sprint Planning, Daily Standup.',
  'coin_cost', 3
)) where title = 'Lesson 4.2: Scrum';

update public.lessons set content = content || jsonb_build_object('language_task', jsonb_build_object(
  'prompt','In 80-100 words, explain why a project you know exists — link it directly to the organization''s strategy. Use "because", "so that" and "in order to" at least once each.',
  'coin_cost', 3
)) where title = 'Lesson 5.1: Why Projects Exist — Linking Work to Corporate Strategy';

-- Self-check: a title typo would silently update zero rows (an UPDATE
-- matching nothing is not an error in Postgres — the same class of
-- silent no-op that migration 018 had to fix for DELETE). Fail loudly
-- instead of leaving a lesson quietly without its task.
do $$
declare
  v_new int;
  v_old int;
  v_both int;
begin
  select count(*) into v_new from public.lessons where content ? 'language_task';
  select count(*) into v_old from public.lessons
    where content->'module_closing' ? 'optional_language_task';
  select count(*) into v_both from public.lessons
    where content ? 'language_task'
      and content->'module_closing' ? 'optional_language_task';

  if v_new <> 12 then
    raise exception 'Expected 12 lessons with content->language_task, found %', v_new;
  end if;
  if v_old <> 6 then
    raise exception 'Expected the 6 original module_closing tasks to be untouched, found %', v_old;
  end if;
  if v_both <> 0 then
    raise exception 'Lesson(s) carry BOTH task shapes — the reader would show a duplicate: %', v_both;
  end if;

  raise notice '023 OK: % new language_task lessons, % untouched module_closing tasks, % overlaps', v_new, v_old, v_both;
end $$;
