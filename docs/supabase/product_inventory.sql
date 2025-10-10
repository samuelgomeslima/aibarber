-- Creates supporting structures for product inventory tracking in Supabase
-- Run inside the `public` schema of your Supabase project.

-- Ensure the products table exists with timestamps
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text unique,
  description text,
  cost_cents integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists products_sku_idx on public.products (sku);

-- Supabase projects include this helper, but create it if missing.
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger on_products_updated
before update on public.products
for each row
execute function public.update_updated_at_column();

-- Table to store every stock movement (sales and restocks)
create table if not exists public.product_stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('sell', 'restock')),
  quantity integer not null check (quantity > 0),
  delta integer not null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id)
);

create index if not exists product_stock_movements_product_created_at_idx
  on public.product_stock_movements (product_id, created_at desc);

-- RPC helper to atomically register a stock movement and keep totals in sync
create or replace function public.record_product_movement(
  p_product_id uuid,
  p_quantity integer,
  p_movement_type text,
  p_note text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer;
  v_product public.products;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception using message = 'Quantity must be greater than zero';
  end if;

  if p_movement_type not in ('sell', 'restock') then
    raise exception using message = 'Invalid movement type';
  end if;

  select *
    into v_product
    from public.products
   where id = p_product_id
   for update;

  if not found then
    raise exception using message = 'Product not found';
  end if;

  v_delta := case when p_movement_type = 'sell' then -p_quantity else p_quantity end;

  if v_product.stock_quantity + v_delta < 0 then
    raise exception using message = 'Insufficient stock';
  end if;

  update public.products
     set stock_quantity = stock_quantity + v_delta,
         updated_at = timezone('utc', now())
   where id = p_product_id
   returning * into v_product;

  insert into public.product_stock_movements (
    product_id,
    movement_type,
    quantity,
    delta,
    note,
    created_by
  ) values (
    p_product_id,
    p_movement_type,
    p_quantity,
    v_delta,
    p_note,
    auth.uid()
  );

  return v_product;
end;
$$;

comment on function public.record_product_movement is
  'Updates product stock and stores the movement (sell/restock) in a single transaction.';

alter table public.products enable row level security;
alter table public.product_stock_movements enable row level security;

create policy if not exists "Authenticated users can read products" on public.products
for select using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can manage products" on public.products
for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "Service role can manage products" on public.products
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read stock movements" on public.product_stock_movements
for select using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can manage stock movements" on public.product_stock_movements
for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "Service role can manage stock movements" on public.product_stock_movements
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
