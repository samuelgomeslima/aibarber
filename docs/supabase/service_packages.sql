-- Service packages bundle multiple services together at a discounted price
-- Run these statements in the `public` schema after the core booking schema.

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  price_cents integer not null check (price_cents >= 0),
  regular_price_cents integer not null check (regular_price_cents >= 0),
  description text,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id)
);

create table if not exists public.service_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.service_packages(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  position integer not null default 0,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id)
);

create index if not exists service_packages_name_idx on public.service_packages (lower(name));
create index if not exists service_package_items_package_idx on public.service_package_items (package_id, position);
create index if not exists service_package_items_service_idx on public.service_package_items (service_id);
create index if not exists service_packages_barbershop_idx on public.service_packages (barbershop_id);
create index if not exists service_package_items_barbershop_idx on public.service_package_items (barbershop_id);

create trigger on_service_packages_updated
before update on public.service_packages
for each row
execute function public.update_updated_at_column();

create trigger on_service_package_items_updated
before update on public.service_package_items
for each row
execute function public.update_updated_at_column();

alter table public.service_packages enable row level security;
alter table public.service_package_items enable row level security;

create policy if not exists "Authenticated users can read packages" on public.service_packages
for select using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.staff_members staff
    where staff.auth_user_id = auth.uid()
      and staff.barbershop_id = service_packages.barbershop_id
  )
);

create policy if not exists "Authenticated users can manage packages" on public.service_packages
for all using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.staff_members staff
    where staff.auth_user_id = auth.uid()
      and staff.barbershop_id = service_packages.barbershop_id
  )
) with check (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.staff_members staff
    where staff.auth_user_id = auth.uid()
      and staff.barbershop_id = service_packages.barbershop_id
  )
);

create policy if not exists "Authenticated users can read package items" on public.service_package_items
for select using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.staff_members staff
    where staff.auth_user_id = auth.uid()
      and staff.barbershop_id = service_package_items.barbershop_id
  )
);

create policy if not exists "Authenticated users can manage package items" on public.service_package_items
for all using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.staff_members staff
    where staff.auth_user_id = auth.uid()
      and staff.barbershop_id = service_package_items.barbershop_id
  )
) with check (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.staff_members staff
    where staff.auth_user_id = auth.uid()
      and staff.barbershop_id = service_package_items.barbershop_id
  )
);

create policy if not exists "Service role can manage packages" on public.service_packages
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Service role can manage package items" on public.service_package_items
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.service_packages is 'Reusable bundles of services with special pricing.';
comment on table public.service_package_items is 'Join table connecting packages to the services they include.';
