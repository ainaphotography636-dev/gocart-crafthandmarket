-- =============================================================================
-- Featured Luxury Handicrafts — unify storefront + admin on public.products
-- Run in Supabase SQL Editor (Dashboard → SQL). Safe to re-run.
-- =============================================================================

alter table public.products
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_order integer not null default 0,
  add column if not exists badge_left text,
  add column if not exists badge_right text,
  add column if not exists catalog_status text not null default 'draft';

do $$ begin
  alter table public.products
    drop constraint if exists products_catalog_status_check;
  alter table public.products
    add constraint products_catalog_status_check
    check (catalog_status in ('draft', 'pending', 'approved'));
exception when others then null;
end $$;

create index if not exists products_featured_idx
  on public.products (is_featured, featured_order, created_at desc);

-- Backfill from existing published stock + claimable seed specs
update public.products
set
  catalog_status = case when is_published then 'approved' else 'draft' end,
  badge_left = coalesce(badge_left, specs->>'badge'),
  badge_right = coalesce(badge_right, specs->>'series'),
  is_featured = case
    when sku in ('ART101-001', 'ART102-001', 'ART103-001', 'ART001-001') then true
    when coalesce((specs->>'isFeatured')::boolean, false) then true
    else is_featured
  end,
  featured_order = case sku
    when 'ART103-001' then 1
    when 'ART102-001' then 2
    when 'ART101-001' then 3
    when 'ART001-001' then 4
    else coalesce(nullif(specs->>'featuredOrder', '')::int, featured_order)
  end
where true;

comment on column public.products.is_featured is 'Show on Featured Luxury Handicrafts storefront grid';
comment on column public.products.featured_order is 'Sort order for featured grid (ascending)';
comment on column public.products.badge_left is 'Top-left card pill (e.g. GI-TAG HANDLOOM)';
comment on column public.products.badge_right is 'Top-right status pill (e.g. READY TO SHIP)';
comment on column public.products.catalog_status is 'draft | pending | approved — admin moderation';
