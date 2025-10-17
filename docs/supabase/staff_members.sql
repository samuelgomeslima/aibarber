-- Creates the staff_members table used by the mobile app team management UI
-- Run inside the `public` schema of your Supabase project.

create extension if not exists "pgcrypto";

-- Ensure helper exists to maintain updated_at timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Table storing barbers, managers, and other staff members
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text,
  phone text,
  date_of_birth date,
  barbershop_id uuid references public.barbershops(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete set null,
  role text not null default 'professional' check (
    role in ('administrator', 'manager', 'professional', 'assistant')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint staff_members_phone_digits check (
    phone is null or phone ~ '^[0-9]{10,15}$'
  )
);

create index if not exists staff_members_name_idx on public.staff_members (last_name, first_name);
create index if not exists staff_members_role_idx on public.staff_members (role);
create index if not exists staff_members_barbershop_idx on public.staff_members (barbershop_id);
create unique index if not exists staff_members_email_key on public.staff_members (lower(email)) where email is not null;
create unique index if not exists staff_members_phone_key on public.staff_members (phone) where phone is not null;
create unique index if not exists staff_members_auth_user_key on public.staff_members (auth_user_id) where auth_user_id is not null;

create trigger on_staff_members_updated
before update on public.staff_members
for each row
execute function public.update_updated_at_column();

alter table public.staff_members enable row level security;

-- Allow authenticated users to view and manage team data
create policy if not exists "Authenticated users can read staff" on public.staff_members
for select using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can insert staff" on public.staff_members
for insert with check (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can update staff" on public.staff_members
for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Allow service role full access for background jobs and edge functions
create policy if not exists "Service role has full access to staff" on public.staff_members
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
