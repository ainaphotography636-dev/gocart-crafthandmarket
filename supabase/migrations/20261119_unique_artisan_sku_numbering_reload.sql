-- =============================================================================
-- Resume / re-run helper after 42P07 on artisans_artisan_code_key
-- Safe to run even if the first migration partially applied.
-- =============================================================================

-- Ensure sequence exists and is synced
create sequence if not exists public.artisan_code_seq;

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
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.artisans'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(artisan_code)%'
  ) then
    alter table public.artisans
      add constraint artisans_artisan_code_key unique (artisan_code);
  end if;
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;

create or replace function public.generate_unique_artisan_code()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
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

-- Product SKU backfill (idempotent)
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

update public.products
set sku = 'PENDING-' || substr(replace(id::text, '-', ''), 1, 16)
where sku is null
   or btrim(sku) = ''
   or sku !~ '^ART[0-9]{3,}-[0-9]{3,}$';

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
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(sku)%'
  ) then
    alter table public.products
      add constraint products_sku_key unique (sku);
  end if;
exception
  when duplicate_object then null;
  when duplicate_table then null;
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
    new.sku := old.sku;
    new.artisan_id := old.artisan_id;
    return new;
  end if;

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

update public.products
set title = trim(regexp_replace(title, '^\[ART[0-9]+-[0-9]+\]\s*', '', 'i'))
where title ~* '^\[ART[0-9]+-[0-9]+\]';

comment on sequence public.artisan_code_seq is
  'Monotonic source for ART### artisan_code values';
comment on function public.generate_unique_artisan_code() is
  'BEFORE INSERT/UPDATE: mint immutable ART### codes from artisan_code_seq';
comment on function public.generate_unique_product_sku() is
  'BEFORE INSERT/UPDATE: mint immutable <ART###>-<NNN> SKUs per artisan';
