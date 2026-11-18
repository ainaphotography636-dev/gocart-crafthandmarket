-- =============================================================================
-- Staff / admin RBAC fields on profiles (Supabase Auth users)
-- Run after marketplace + client_role migrations.
-- =============================================================================

alter table public.profiles
  add column if not exists admin_role text,
  add column if not exists permissions text[] not null default '{}'::text[],
  add column if not exists is_founder boolean not null default false,
  add column if not exists portfolio text not null default '';

comment on column public.profiles.admin_role is
  'Staff hierarchy: SUPER_ADMIN | MAIN_ADMIN | OPERATIONS | ARTISAN_LEAD | B2B_TRADE';
comment on column public.profiles.permissions is
  'Module grants for non-super-admin staff (empty = role defaults)';
comment on column public.profiles.is_founder is
  'Locked founder Super Admin — exactly one should be true';
comment on column public.profiles.portfolio is
  'Short staff bio / portfolio blurb shown in admin directory';

create index if not exists profiles_admin_role_idx
  on public.profiles (admin_role)
  where admin_role is not null;

-- Staff directory is readable by authenticated admins (marketplace role = admin)
drop policy if exists "Admins can view staff profiles" on public.profiles;
create policy "Admins can view staff profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles self
      where self.id = auth.uid()
        and self.role = 'admin'
    )
  );

-- Ensure at most one founder flag (soft guard; app also enforces)
create unique index if not exists profiles_single_founder_idx
  on public.profiles (is_founder)
  where is_founder = true;
