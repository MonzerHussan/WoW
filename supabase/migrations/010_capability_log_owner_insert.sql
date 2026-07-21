-- ============================================================
-- WOW - World of Work — Migration 010
-- Fix: capability_activation_log (007b) had a SELECT-only RLS policy —
-- no INSERT policy meant nobody (not even the row's own owner, acting
-- through the normal session-bound client) could ever write to it, since
-- RLS denies by default when enabled with no matching policy. Adds the
-- owner-write policy, matching the same pattern already used everywhere
-- else in the schema (e.g. "Own capabilities: manage" on
-- user_capabilities, 003) — no service_role required.
-- Run order: 001 → ... → 009 → 010. Additive only.
-- ============================================================

create policy "Capability log: owner inserts own" on public.capability_activation_log
  for insert with check (auth.uid() = user_id);
