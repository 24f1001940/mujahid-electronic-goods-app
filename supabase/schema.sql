-- Create the JSON payload tables used by the offline sync adapter.
-- Apply this in the Supabase SQL editor, then configure RLS for your deployment.

create table if not exists meg_products (
  id bigint primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meg_invoices (
  invoice_no text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meg_khata (
  customer_phone text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meg_repairs (
  token_no text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meg_expenses (
  id bigint primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meg_raw_materials (
  id bigint primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meg_orders (
  order_no text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meg_repair_payments (
  id bigint primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Do not enable public write access in production. Configure authenticated
-- policies after enabling Supabase Auth and assigning shop staff roles.
