-- =============================================================================
-- STEP 1 of INR support: add INR to currency_code enum.
-- Run this query ALONE and wait for success before running column changes.
-- (Postgres: new enum values must be committed before use.)
-- =============================================================================

alter type public.currency_code add value if not exists 'INR';
