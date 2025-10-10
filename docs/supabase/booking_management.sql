-- Core booking data structures for Supabase
-- Run these statements inside the `public` schema of your project.

create extension if not exists "pgcrypto";

-- Helper to keep updated_at columns fresh
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Customers that can be linked to bookings
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  phone text,
  email text,
  date_of_birth date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id),
  constraint customers_phone_digits check (
    phone is null or phone ~ '^[0-9]{8,15}$'
  ),
  constraint customers_email_format check (
    email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
  )
);

drop index if exists public.customers_phone_key;
drop index if exists public.customers_email_key;
create unique index if not exists customers_phone_key on public.customers (created_by, phone)
  where phone is not null;
create unique index if not exists customers_email_key on public.customers (created_by, lower(email))
  where email is not null;
create index if not exists customers_name_idx on public.customers (last_name, first_name);

create trigger on_customers_updated
before update on public.customers
for each row
execute function public.update_updated_at_column();

comment on table public.customers is 'Stores customer profiles used for bookings and communication.';

-- Services offered by the barbershop
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  estimated_minutes integer not null check (estimated_minutes > 0),
  price_cents integer not null check (price_cents >= 0),
  icon text not null default 'content-cut',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id)
);

drop index if exists public.services_name_key;
create unique index if not exists services_name_key on public.services (created_by, lower(name));
create index if not exists services_price_idx on public.services (price_cents);

create trigger on_services_updated
before update on public.services
for each row
execute function public.update_updated_at_column();

comment on table public.services is 'Catalog of available services and pricing.';

-- Appointments that join customers, services, and staff members
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start time not null,
  "end" time not null,
  service_id uuid not null references public.services(id) on delete restrict,
  barber uuid not null references public.staff_members(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id),
  constraint bookings_time_range check ("end" > start),
  constraint bookings_unique_slot unique (date, start, barber)
);

create index if not exists bookings_date_start_idx on public.bookings (date, start);
create index if not exists bookings_customer_idx on public.bookings (customer_id);
create index if not exists bookings_service_idx on public.bookings (service_id);

create trigger on_bookings_updated
before update on public.bookings
for each row
execute function public.update_updated_at_column();

comment on table public.bookings is 'Stores scheduled appointments for the barbershop.';

-- Tracks staff allocation per booking for reporting and utilization insights
create table if not exists public.staff_usage (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  start timestamptz not null default timezone('utc', now()),
  "end" timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id),
  constraint staff_usage_end_after_start check ("end" is null or "end" >= start),
  constraint staff_usage_unique_assignment unique (booking_id, staff_member_id)
);

create index if not exists staff_usage_staff_idx on public.staff_usage (staff_member_id, start desc);
create index if not exists staff_usage_service_idx on public.staff_usage (service_id);

comment on table public.staff_usage is 'Logs how staff members spend their time per booking for later analytics.';

-- Enable row level security and grant access policies
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.staff_usage enable row level security;

create policy if not exists "Authenticated users can read customers" on public.customers
for select using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
);

create policy if not exists "Authenticated users can manage customers" on public.customers
for all using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
)
  with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );

create policy if not exists "Service role can manage customers" on public.customers
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read services" on public.services
for select using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
);

create policy if not exists "Authenticated users can manage services" on public.services
for all using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
)
  with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );

create policy if not exists "Service role can manage services" on public.services
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read bookings" on public.bookings
for select using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
);

create policy if not exists "Authenticated users can modify bookings" on public.bookings
for all using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
)
  with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );

create policy if not exists "Service role can manage bookings" on public.bookings
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read staff usage" on public.staff_usage
for select using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
);

create policy if not exists "Authenticated users can manage staff usage" on public.staff_usage
for all using (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
)
  with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );

create policy if not exists "Service role can manage staff usage" on public.staff_usage
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
