-- Authentication and tenancy helpers for AIBarber
-- Run inside the `public` schema of your Supabase project after enabling auth.

create extension if not exists "pgcrypto";

-- Shared trigger function for updated_at maintenance
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Root entity that represents a single barbershop
create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text,
  timezone text not null default 'America/Sao_Paulo',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists barbershops_name_key on public.barbershops (lower(name));
create index if not exists barbershops_owner_idx on public.barbershops (owner_id);

create trigger on_barbershops_updated
before update on public.barbershops
for each row
execute function public.update_updated_at_column();

alter table public.barbershops enable row level security;

create policy if not exists "Barbershop owners can manage their shop" on public.barbershops
for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy if not exists "Service role can manage barbershops" on public.barbershops
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Ensure staff members can be linked back to barbershops and auth users
alter table public.staff_members
  add column if not exists barbershop_id uuid references public.barbershops(id) on delete set null,
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists staff_members_barbershop_idx on public.staff_members (barbershop_id);
create unique index if not exists staff_members_auth_user_key on public.staff_members (auth_user_id)
  where auth_user_id is not null;

comment on table public.barbershops is 'Stores high level data about each barbershop using the platform.';
