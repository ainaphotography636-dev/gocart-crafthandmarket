-- =============================================================================
-- Unique artisan_code + product SKU — backfill, sequence, triggers
-- Safe to re-run. Run in Supabase SQL Editor if migrations aren't auto-applied.
-- Format: ART001 / ART001-001 (zero-padded to at least 3 digits)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step A — Artisan code sequence + backfill / dedupe
-- -----------------------------------------------------------------------------
create sequence if not exists public.artisan_code_seq;

-- Park duplicate / non-standard codes so we can reassign uniquely
with ranked as (
  select
    id,
    artisan_code,
    row_number() over (
      partition by upper(trim(artisan_code))
      order by created_at asc nulls last, id asc
    ) as rn,
    (artisan_code ~ '^ART[0-9]{3,}$') as is_standard
  from public.artisans
)
update public.artisans a
set artisan_code = 'PENDING-' || substr(replace(a.id::text, '-', ''), 1, 12)
from ranked r
where a.id = r.id
  and (
    a.artisan_code is null
    or btrim(a.artisan_code) = ''
    or not r.is_standard
    or r.rn > 1
  );

-- Assign sequential ART### to anyone still pending / non-standard
with to_fix as (
  select
    id,
    row_number() over (order by created_at asc nulls last, id asc) as rn
  from public.artisans
  where artisan_code !~ '^ART[0-9]{3,}$'
),
max_existing as (
  select coalesce(
    max(nullif(regexp_replace(artisan_code, '^ART', ''), '')::int),
    0
  ) as m
  from public.artisans
  where artisan_code ~ '^ART[0-9]{3,}$'
)
update public.artisans a
set artisan_code = 'ART' || lpad((max_existing.m + to_fix.rn)::text, 3, '0')
from to_fix, max_existing
where a.id = to_fix.id;

-- Sync sequence so next nextval() returns MAX+1
select setval(
  'public.artisan_code_seq',
  greatest(
    coalesce((
      select max(nullif(regexp_replace(artisan_code, '^ART', ''), '')::int)
      from public.artisans
      where artisan_code ~ '^ART[0-9]{3,}$'
    ), 0),
    1
  ),
  true
);

alter table public.artisans
  alter column artisan_code set default 'PENDING';

alter table public.artisans
  alter column artisan_code set not null;

do $$ begin
  alter table public.artisans add constraint artisans_artisan_code_key unique (artisan_code);
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Step B — Auto-generate artisan_code on INSERT; lock on UPDATE
-- -----------------------------------------------------------------------------
create or replace function public.generate_unique_artisan_code()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Codes are immutable once assigned
    new.artisan_code := old.artisan_code;
    return new;
  end if;

  new.artisan_code :=
    'ART' || lpad(nextval('public.artisan_code_seq')::text, 3, '0');

  if new.next_sku_seq is null or new.next_sku_seq < 1 then
    new.next_sku_seq := 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_generate_artisan_code on public.artisans;
create trigger trg_generate_artisan_code
  before insert or update on public.artisans
  for each row
  execute function public.generate_unique_artisan_code();

-- -----------------------------------------------------------------------------
-- Step C — Product SKU backfill + auto-generate per artisan
-- -----------------------------------------------------------------------------

-- Park duplicate SKUs
with ranked as (
  select
    id,
    row_number() over (
      partition by upper(trim(sku))
      order by created_at asc nulls last, id asc
    ) as rn
  from public.products
  where sku is not null and btrim(sku) <> ''
)
update public.products p
set sku = 'PENDING-' || substr(replace(p.id::text, '-', ''), 1, 16)
from ranked r
where p.id = r.id and r.rn > 1;

-- Park blank / non-standard SKUs
update public.products
set sku = 'PENDING-' || substr(replace(id::text, '-', ''), 1, 16)
where sku is null
   or btrim(sku) = ''
   or sku !~ '^ART[0-9]{3,}-[0-9]{3,}$';

-- Reassign sequential SKUs per artisan using parent artisan_code
with ordered as (
  select
    p.id,
    a.artisan_code,
    row_number() over (
      partition by p.artisan_id
      order by p.created_at asc nulls last, p.id asc
    ) as rn
  from public.products p
  join public.artisans a on a.id = p.artisan_id
)
update public.products p
set sku = o.artisan_code || '-' || lpad(o.rn::text, 3, '0')
from ordered o
where p.id = o.id;

-- Sync artisans.next_sku_seq = max suffix + 1
update public.artisans a
set next_sku_seq = 1
where not exists (
  select 1 from public.products p where p.artisan_id = a.id
);

update public.artisans a
set next_sku_seq = s.next_seq
from (
  select
    artisan_id,
    coalesce(max(nullif(substring(sku from '-(\d+)$'), '')::int), 0) + 1 as next_seq
  from public.products
  group by artisan_id
) s
where a.id = s.artisan_id;

alter table public.products
  alter column sku set default 'PENDING';

alter table public.products
  alter column sku set not null;

do $$ begin
  alter table public.products add constraint products_sku_key unique (sku);
exception when duplicate_object then null;
end $$;

create or replace function public.generate_unique_product_sku()
returns trigger
language plpgsql
as $$
declare
  v_code text;
  v_next int;
  v_lock_key int;
begin
  if tg_op = 'UPDATE' then
    -- SKUs are immutable once assigned
    new.sku := old.sku;
    -- Keep artisan ownership stable for numbering integrity
    new.artisan_id := old.artisan_id;
    return new;
  end if;

  -- Serialize minting per artisan (prevents concurrent ART###-001 collisions)
  v_lock_key := hashtext(new.artisan_id::text);
  perform pg_advisory_xact_lock(872001, v_lock_key);

  select artisan_code into v_code
  from public.artisans
  where id = new.artisan_id;

  if v_code is null then
    raise exception 'products.artisan_id % has no artisan_code', new.artisan_id;
  end if;

  select coalesce(max(nullif(substring(sku from '-(\d+)$'), '')::int), 0) + 1
  into v_next
  from public.products
  where artisan_id = new.artisan_id
    and sku ~ ('^' || v_code || '-[0-9]+$');

  update public.artisans
  set next_sku_seq = greatest(coalesce(next_sku_seq, 1), v_next)
  where id = new.artisan_id
  returning next_sku_seq into v_next;

  new.sku := v_code || '-' || lpad(v_next::text, 3, '0');

  update public.artisans
  set next_sku_seq = v_next + 1
  where id = new.artisan_id;

  return new;
end;
$$;

drop trigger if exists trg_generate_product_sku on public.products;
create trigger trg_generate_product_sku
  before insert or update on public.products
  for each row
  execute function public.generate_unique_product_sku();

-- Strip accidental [ART###-###] prefixes stored inside title
update public.products
set title = trim(regexp_replace(title, '^\[ART[0-9]+-[0-9]+\]\s*', '', 'i'))
where title ~* '^\[ART[0-9]+-[0-9]+\]';

comment on sequence public.artisan_code_seq is
  'Monotonic source for ART### artisan_code values';
comment on function public.generate_unique_artisan_code() is
  'BEFORE INSERT/UPDATE: mint immutable ART### codes from artisan_code_seq';
comment on function public.generate_unique_product_sku() is
  'BEFORE INSERT/UPDATE: mint immutable <ART###>-<NNN> SKUs per artisan';
