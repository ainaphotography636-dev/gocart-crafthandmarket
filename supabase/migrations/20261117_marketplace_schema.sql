-- =============================================================================
-- Crafthand Market — Supabase multi-vendor handicraft marketplace schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query), top to bottom.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where practical.
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('buyer', 'artisan', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.artisan_verification_status as enum (
    'pending',
    'verified',
    'rejected',
    'suspended'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.escrow_status as enum (
    'held',
    'released',
    'refunded',
    'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.marketplace_order_status as enum (
    'pending_payment',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.currency_code as enum ('USD', 'GBP', 'CAD');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'buyer',
  phone text,
  preferred_currency public.currency_code not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'buyer')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- artisans (workshop / vendor)
-- -----------------------------------------------------------------------------
create table if not exists public.artisans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  workshop_name text not null,
  username text not null unique,
  artisan_code text not null unique,
  description text default '',
  logo_url text,
  contact_phone text,
  address text,
  region text,
  gi_tags text[] not null default '{}',
  verification_status public.artisan_verification_status not null default 'pending',
  is_active boolean not null default false,
  -- Payout placeholders (store encrypted refs / Stripe Connect IDs later)
  payout_provider text,
  payout_account_ref text,
  payout_currency public.currency_code not null default 'USD',
  next_sku_seq integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artisans_username_format check (username ~ '^[a-z0-9_-]{3,40}$'),
  constraint artisans_code_format check (artisan_code ~ '^ART[0-9A-Z-]{2,20}$')
);

create index if not exists artisans_verification_idx
  on public.artisans (verification_status, is_active);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text,
  material text,
  gi_tag text,
  sku text not null unique,
  -- Multi-currency pricing (store amounts as major units, e.g. 49.99)
  price_usd numeric(12, 2) not null,
  price_gbp numeric(12, 2),
  price_cad numeric(12, 2),
  mrp_usd numeric(12, 2),
  currency_default public.currency_code not null default 'USD',
  images text[] not null default '{}',
  video_proof_url text,
  in_stock boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_positive check (price_usd > 0)
);

create index if not exists products_artisan_idx on public.products (artisan_id);
create index if not exists products_published_idx on public.products (is_published, in_stock);

-- -----------------------------------------------------------------------------
-- orders + order_items (escrow-aware checkout)
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  total_amount numeric(12, 2) not null,
  currency public.currency_code not null default 'USD',
  status public.marketplace_order_status not null default 'pending_payment',
  escrow_status public.escrow_status not null default 'held',
  -- Shipping
  shipping_name text,
  shipping_phone text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  shipping_country text,
  tracking_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_positive check (total_amount >= 0)
);

create index if not exists orders_buyer_idx on public.orders (buyer_id);
create index if not exists orders_escrow_idx on public.orders (escrow_status, status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  artisan_id uuid not null references public.artisans (id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null,
  currency public.currency_code not null default 'USD',
  title_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint order_items_qty_positive check (quantity > 0),
  constraint order_items_price_positive check (unit_price >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists artisans_set_updated_at on public.artisans;
create trigger artisans_set_updated_at
  before update on public.artisans
  for each row execute procedure public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.artisans enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- artisans
drop policy if exists "Public can view active artisans" on public.artisans;
create policy "Public can view active artisans"
  on public.artisans for select
  using (is_active = true and verification_status = 'verified');

drop policy if exists "Artisans manage own workshop" on public.artisans;
create policy "Artisans manage own workshop"
  on public.artisans for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- products
drop policy if exists "Public can view published products" on public.products;
create policy "Public can view published products"
  on public.products for select
  using (is_published = true and in_stock = true);

drop policy if exists "Artisans manage own products" on public.products;
create policy "Artisans manage own products"
  on public.products for all
  using (
    exists (
      select 1 from public.artisans a
      where a.id = products.artisan_id and a.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.artisans a
      where a.id = products.artisan_id and a.profile_id = auth.uid()
    )
  );

-- orders
drop policy if exists "Buyers view own orders" on public.orders;
create policy "Buyers view own orders"
  on public.orders for select
  using (auth.uid() = buyer_id);

drop policy if exists "Buyers create own orders" on public.orders;
create policy "Buyers create own orders"
  on public.orders for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "Buyers update own open orders" on public.orders;
create policy "Buyers update own open orders"
  on public.orders for update
  using (auth.uid() = buyer_id);

-- order_items
drop policy if exists "Buyers view own order items" on public.order_items;
create policy "Buyers view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );

drop policy if exists "Buyers insert own order items" on public.order_items;
create policy "Buyers insert own order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );

drop policy if exists "Artisans view items for their products" on public.order_items;
create policy "Artisans view items for their products"
  on public.order_items for select
  using (
    exists (
      select 1 from public.artisans a
      where a.id = order_items.artisan_id and a.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Helpful grants (anon / authenticated use RLS)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
