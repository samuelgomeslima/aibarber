-- Creates tables to manage bundled service packages in Supabase
-- Run inside the `public` schema of your Supabase project.

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  standard_price_cents integer not null check (standard_price_cents >= 0),
  discount_price_cents integer not null check (discount_price_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint service_packages_discount_check
    check (discount_price_cents <= standard_price_cents)
);

create table if not exists public.service_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.service_packages(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  quantity integer not null check (quantity > 0)
);

create unique index if not exists service_package_items_unique
  on public.service_package_items (package_id, service_id);

alter table public.service_packages enable row level security;
alter table public.service_package_items enable row level security;

create policy if not exists "Authenticated users can read service packages" on public.service_packages
for select using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can manage service packages" on public.service_packages
for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "Service role can manage service packages" on public.service_packages
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read package items" on public.service_package_items
for select using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can manage package items" on public.service_package_items
for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "Service role can manage package items" on public.service_package_items
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
