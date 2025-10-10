-- Service packages tables for Supabase
-- Run these statements inside the `public` schema after applying booking_management.sql.

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  price_cents integer not null check (price_cents >= 0),
  original_price_cents integer not null check (original_price_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id)
);

create trigger on_service_packages_updated
before update on public.service_packages
for each row
execute function public.update_updated_at_column();

comment on table public.service_packages is 'Discounted bundles made of multiple services.';

create table if not exists public.service_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.service_packages(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists service_package_items_package_service_idx
  on public.service_package_items (package_id, service_id);

comment on table public.service_package_items is 'Stores how many times each service appears in a package.';

alter table public.service_packages enable row level security;
alter table public.service_package_items enable row level security;

create policy if not exists "Authenticated users can read service packages" on public.service_packages
for select using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
);

create policy if not exists "Authenticated users can manage service packages" on public.service_packages
for all using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
)
  with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );

create policy if not exists "Service role can manage service packages" on public.service_packages
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read package items" on public.service_package_items
for select using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.service_packages p
    where p.id = service_package_items.package_id
      and p.created_by = auth.uid()
  )
);

create policy if not exists "Authenticated users can manage package items" on public.service_package_items
for all using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.service_packages p
    where p.id = service_package_items.package_id
      and p.created_by = auth.uid()
  )
)
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.service_packages p
      where p.id = service_package_items.package_id
        and p.created_by = auth.uid()
    )
  );

create policy if not exists "Service role can manage package items" on public.service_package_items
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
