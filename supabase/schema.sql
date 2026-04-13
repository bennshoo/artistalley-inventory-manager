-- Art Business Inventory App Schema
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- CATEGORY
create table if not exists category (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- PRODUCT
create table if not exists product (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  image_url text,
  quantity int not null default 0,
  category_id uuid references category(id) on delete set null,
  created_at timestamptz default now()
);

-- SUPPLIER
create table if not exists supplier (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  created_at timestamptz default now()
);

-- RESTOCK
create table if not exists restock (
  id uuid primary key default gen_random_uuid(),
  quantity int not null,
  unit_cost numeric(10,4) not null,
  date date not null,
  product_id uuid not null references product(id) on delete cascade,
  supplier_id uuid references supplier(id) on delete set null,
  created_at timestamptz default now()
);

-- INVENTORY_ADJUSTMENT
create table if not exists inventory_adjustment (
  id uuid primary key default gen_random_uuid(),
  delta int not null,
  note text,
  date date not null,
  product_id uuid not null references product(id) on delete cascade,
  created_at timestamptz default now()
);

-- EVENT
create table if not exists event (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  location text,
  tax_rate numeric(6,4) not null default 0,
  created_at timestamptz default now()
);

-- EVENT_REVENUE
create table if not exists event_revenue (
  id uuid primary key default gen_random_uuid(),
  payment_method text not null check (payment_method in ('square', 'cash', 'venmo')),
  starting_balance numeric(10,2) not null default 0,
  ending_balance numeric(10,2) not null default 0,
  event_id uuid not null references event(id) on delete cascade,
  created_at timestamptz default now()
);

-- COST
create table if not exists cost (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  amount numeric(10,2) not null,
  note text,
  event_id uuid references event(id) on delete cascade,
  supplier_id uuid references supplier(id) on delete set null,
  created_at timestamptz default now()
);

-- SALES_SHEET
create table if not exists sales_sheet (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'imported')),
  event_id uuid not null references event(id) on delete cascade,
  created_at timestamptz default now()
);

-- SALES_SHEET_ROW
create table if not exists sales_sheet_row (
  id uuid primary key default gen_random_uuid(),
  qty_sold int not null default 0,
  unit_cost numeric(10,4) not null default 0,
  notes text,
  sheet_id uuid not null references sales_sheet(id) on delete cascade,
  product_id uuid not null references product(id) on delete cascade,
  created_at timestamptz default now()
);

-- SALE
create table if not exists sale (
  id uuid primary key default gen_random_uuid(),
  qty_sold int not null,
  unit_cost numeric(10,4) not null,
  date date not null,
  product_id uuid not null references product(id) on delete cascade,
  event_id uuid not null references event(id) on delete cascade,
  sales_sheet_id uuid not null references sales_sheet(id) on delete cascade,
  created_at timestamptz default now()
);

-- Row Level Security
alter table category enable row level security;
alter table product enable row level security;
alter table supplier enable row level security;
alter table restock enable row level security;
alter table inventory_adjustment enable row level security;
alter table event enable row level security;
alter table event_revenue enable row level security;
alter table cost enable row level security;
alter table sales_sheet enable row level security;
alter table sales_sheet_row enable row level security;
alter table sale enable row level security;

-- RLS Policies: allow authenticated users full access
create policy "auth_all" on category for all to authenticated using (true) with check (true);
create policy "auth_all" on product for all to authenticated using (true) with check (true);
create policy "auth_all" on supplier for all to authenticated using (true) with check (true);
create policy "auth_all" on restock for all to authenticated using (true) with check (true);
create policy "auth_all" on inventory_adjustment for all to authenticated using (true) with check (true);
create policy "auth_all" on event for all to authenticated using (true) with check (true);
create policy "auth_all" on event_revenue for all to authenticated using (true) with check (true);
create policy "auth_all" on cost for all to authenticated using (true) with check (true);
create policy "auth_all" on sales_sheet for all to authenticated using (true) with check (true);
create policy "auth_all" on sales_sheet_row for all to authenticated using (true) with check (true);
create policy "auth_all" on sale for all to authenticated using (true) with check (true);

-- Storage bucket for product images (run via Supabase dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', false);
