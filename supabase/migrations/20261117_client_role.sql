-- =============================================================================
-- Add `client` shopper role (keeps legacy `buyer` as a synonym in app code).
-- Run in Supabase SQL Editor after the marketplace schema migration.
-- =============================================================================

do $$ begin
  alter type public.user_role add value 'client';
exception
  when duplicate_object then null;
end $$;

-- Prefer client for new profiles when metadata omits role.
alter table public.profiles
  alter column role set default 'client';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := lower(coalesce(new.raw_user_meta_data->>'role', 'client'));
  resolved public.user_role := 'client';
begin
  if requested = 'artisan' then
    resolved := 'artisan';
  elsif requested = 'admin' then
    resolved := 'admin';
  elsif requested = 'buyer' then
    -- Legacy signup value → store as client going forward.
    resolved := 'client';
  else
    resolved := 'client';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    resolved
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;
