-- Service packages allow bundling multiple services with discounted pricing.

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  regular_price_cents integer check (regular_price_cents >= 0),
  created_at timestamp with time zone default now()
);

comment on table public.service_packages is 'Bundles of services sold together, often with a discount.';
comment on column public.service_packages.price_cents is 'Discounted price of the package in cents.';
comment on column public.service_packages.regular_price_cents is 'Optional reference price of the services without discount.';

create table if not exists public.service_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.service_packages(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  quantity integer not null check (quantity > 0)
);

comment on table public.service_package_items is 'Services included in each package and how many uses are granted.';

create index if not exists service_package_items_package_id_idx on public.service_package_items (package_id);
create index if not exists service_package_items_service_id_idx on public.service_package_items (service_id);
