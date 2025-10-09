-- Creates the cash_movements table used by the cash register features
-- Run inside the `public` schema of your Supabase project.

create extension if not exists "pgcrypto";

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type text not null check (movement_type in ('service', 'product')),
  amount_cents integer not null check (amount_cents >= 0),
  occurred_at timestamptz not null default timezone('utc', now()),
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id)
);

create index if not exists cash_movements_occurred_created_idx
  on public.cash_movements (occurred_at desc, created_at desc);

create index if not exists cash_movements_type_idx
  on public.cash_movements (movement_type);

alter table public.cash_movements enable row level security;

create policy if not exists "Authenticated users can read cash movements" on public.cash_movements
for select using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can insert cash movements" on public.cash_movements
for insert with check (auth.role() = 'authenticated');

create policy if not exists "Service role has full access to cash movements" on public.cash_movements
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
