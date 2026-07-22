-- ============================================================
-- WOW - World of Work — Migration 015a
-- Split from a single 015 draft that hit Postgres error 55P04: "unsafe
-- use of new value 'content_manager' of enum type app_role" — a newly
-- added enum value (ALTER TYPE ... ADD VALUE) cannot be referenced in
-- the same transaction it was added in; it must be committed on its
-- own first. Supabase's SQL Editor runs a pasted multi-statement file
-- as one implicit transaction, so the original draft's later statements
-- using 'content_manager' caused the whole thing to abort — nothing
-- from that draft persisted (confirmed via a read-only diagnostic
-- against pg_enum/pg_policies/pg_proc before writing this split).
--
-- This file does ONLY the enum add. Run it by itself and let it finish
-- before running 015b, which does everything that actually uses the
-- new value.
--
-- Run order: 001 → ... → 014 → 015a → 015b. Additive only.
-- ============================================================

alter type app_role add value if not exists 'content_manager';
