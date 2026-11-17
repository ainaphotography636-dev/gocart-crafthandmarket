-- =============================================================================
-- INR pricing + handicraft specification fields for products
-- Run after the marketplace schema migration.
-- =============================================================================

do $$ begin
  alter type public.currency_code add value 'INR';
exception
  when duplicate_object then null;
end $$;

alter table public.products
  add column if not exists price_inr numeric(12, 2),
  add column if not exists mrp_inr numeric(12, 2),
  add column if not exists craft_technique text,
  add column if not exists dimensions text,
  add column if not exists weight text,
  add column if not exists region_origin text,
  add column if not exists care_instructions text,
  add column if not exists specs jsonb not null default '{}'::jsonb;

-- Prefer INR as the marketplace default for new rows.
alter table public.products
  alter column currency_default set default 'INR';

comment on column public.products.price_inr is 'Offer price in Indian Rupees';
comment on column public.products.mrp_inr is 'Actual / MRP price in Indian Rupees';
comment on column public.products.specs is 'Structured + custom handicraft attributes (JSON)';
