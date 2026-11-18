-- =============================================================================
-- INR pricing + handicraft specification fields for products
-- Run AFTER the marketplace schema migration.
--
-- IMPORTANT (Supabase SQL editor):
-- Postgres requires a NEW enum value to be committed before it can be used.
-- Run this file as TWO separate queries (Step 1, then Step 2) — do not run
-- both in one click / one transaction.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — run alone, then wait for success
-- -----------------------------------------------------------------------------
-- alter type public.currency_code add value if not exists 'INR';

-- -----------------------------------------------------------------------------
-- STEP 2 — run after Step 1 succeeded
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists price_inr numeric(12, 2),
  add column if not exists mrp_inr numeric(12, 2),
  add column if not exists craft_technique text,
  add column if not exists dimensions text,
  add column if not exists weight text,
  add column if not exists region_origin text,
  add column if not exists care_instructions text,
  add column if not exists specs jsonb not null default '{}'::jsonb;

-- Safe even if Step 1 already added INR in a prior attempt.
do $$ begin
  alter table public.products
    alter column currency_default set default 'INR';
exception
  when invalid_parameter_value then
    -- Enum not committed yet — leave existing default; app still writes amounts.
    null;
  when others then
    null;
end $$;

comment on column public.products.price_inr is 'Offer price in Indian Rupees';
comment on column public.products.mrp_inr is 'Actual / MRP price in Indian Rupees';
comment on column public.products.specs is 'Structured + custom handicraft attributes (JSON)';
