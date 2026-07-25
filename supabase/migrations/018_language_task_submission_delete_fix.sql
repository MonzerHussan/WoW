-- ============================================================
-- WOW - World of Work — Migration 018
-- Real bug found during acceptance testing of 017, not a design change:
-- app/api/lms/language-task/submit/route.ts inserts a submission row,
-- then calls spend_coins(); on insufficient balance it tries to DELETE
-- that row as a rollback. 017 deliberately shipped with no DELETE
-- policy at all ("a submission is permanent once made") — so that
-- rollback DELETE silently matched zero RLS-visible rows and no-opped
-- (the exact "PostgREST treats zero-row UPDATE/DELETE as success, not
-- an error" failure mode SECURITY.md already documents from Sprint
-- 3.3's assessor-approve bug). Confirmed live: a real 402
-- insufficient-balance attempt left an orphaned submission row behind
-- with no matching coin_transaction.
--
-- Fix: a DELETE policy narrow enough to permit exactly the rollback
-- case and nothing else — a row can only be deleted by its own owner,
-- and only if no coin_transaction was ever recorded against it. A
-- submission that was actually paid for (spend_coins succeeded and
-- wrote a coin_transactions row referencing it) stays permanently
-- undeletable, preserving 017's original intent.
-- ============================================================

drop policy if exists "owner can delete own unpaid submission" on public.language_task_submissions;
create policy "owner can delete own unpaid submission"
  on public.language_task_submissions for delete
  using (
    user_id = auth.uid()
    and not exists (
      select 1 from public.coin_transactions
      where ref_table = 'language_task_submissions' and ref_id = language_task_submissions.id
    )
  );
