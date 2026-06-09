-- ============================================================
-- INVICTOS SPORTS CENTER — SCHEMA COMPLETO v2
-- Ejecutar TODO en: Supabase → SQL Editor → Run
-- ============================================================

-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- ============================================================
-- APP CONFIG (PINs de acceso)
-- ============================================================
create table if not exists app_config (
  key   text primary key,
  value text not null
);

insert into app_config (key, value) values
  ('pin_admin',  '1234'),
  ('pin_cajero', '5678')
on conflict (key) do nothing;

-- ============================================================
-- CANCHAS
-- ============================================================
create table if not exists fields (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  sport_type      text not null default 'fútbol',
  price_per_hour  numeric(10,2) not null default 0,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ============================================================
-- RESERVAS
-- ============================================================
create table if not exists reservations (
  id              uuid primary key default uuid_generate_v4(),
  field_id        uuid references fields(id) on delete set null,
  customer_name   text not null,
  customer_phone  text,
  date            date not null,
  start_time      time not null,
  end_time        time not null,
  total_amount    numeric(10,2) not null default 0,
  amount_paid     numeric(10,2) not null default 0,
  status          text not null default 'confirmada'
                    check (status in ('confirmada','completada','cancelada','pendiente')),
  payment_status  text not null default 'pendiente'
                    check (payment_status in ('pendiente','parcial','pagado')),
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- INVENTARIO (productos + bebidas fusionados)
-- ============================================================
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  category    text not null default 'producto'
                check (category in ('producto','bebida')),
  price       numeric(10,2) not null default 0,
  cost        numeric(10,2) not null default 0,
  stock       integer not null default 0,
  min_stock   integer not null default 5,
  unit        text not null default 'unidad',
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- CAMPEONATOS
-- ============================================================
create table if not exists championships (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  sport_type        text not null default 'fútbol',
  category          text,
  start_date        date,
  end_date          date,
  registration_fee  numeric(10,2) not null default 0,
  prize             text,
  max_teams         integer,
  status            text not null default 'inscripcion'
                      check (status in ('inscripcion','en_curso','finalizado','cancelado')),
  notes             text,
  created_at        timestamptz default now()
);

-- ============================================================
-- EQUIPOS
-- ============================================================
create table if not exists teams (
  id                  uuid primary key default uuid_generate_v4(),
  championship_id     uuid references championships(id) on delete cascade,
  name                text not null,
  captain_name        text,
  captain_phone       text,
  player_count        integer default 0,
  registration_paid   boolean default false,
  amount_paid         numeric(10,2) default 0,
  notes               text,
  created_at          timestamptz default now()
);

-- ============================================================
-- VENTAS (caja central)
-- ============================================================
create table if not exists sales (
  id              uuid primary key default uuid_generate_v4(),
  sale_type       text not null
                    check (sale_type in ('producto','bebida','alquiler','campeonato','otro')),
  customer_name   text,
  total_amount    numeric(10,2) not null default 0,
  payment_method  text not null default 'efectivo'
                    check (payment_method in ('efectivo','tarjeta','transferencia','otro')),
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- ITEMS DE VENTA
-- ============================================================
create table if not exists sale_items (
  id            uuid primary key default uuid_generate_v4(),
  sale_id       uuid references sales(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  product_name  text not null,
  quantity      integer not null default 1,
  unit_price    numeric(10,2) not null default 0,
  subtotal      numeric(10,2) generated always as (quantity * unit_price) stored,
  created_at    timestamptz default now()
);

-- ============================================================
-- RLS — acceso abierto con anon key (app interna)
-- ============================================================
alter table app_config     enable row level security;
alter table fields         enable row level security;
alter table reservations   enable row level security;
alter table products       enable row level security;
alter table championships  enable row level security;
alter table teams          enable row level security;
alter table sales          enable row level security;
alter table sale_items     enable row level security;

create policy "public_all" on app_config    for all using (true) with check (true);
create policy "public_all" on fields        for all using (true) with check (true);
create policy "public_all" on reservations  for all using (true) with check (true);
create policy "public_all" on products      for all using (true) with check (true);
create policy "public_all" on championships for all using (true) with check (true);
create policy "public_all" on teams         for all using (true) with check (true);
create policy "public_all" on sales         for all using (true) with check (true);
create policy "public_all" on sale_items    for all using (true) with check (true);

-- ============================================================
-- DATOS DE EJEMPLO (opcional — borrar si no quieres)
-- ============================================================
insert into fields (name, sport_type, price_per_hour) values
  ('Cancha 1', 'fútbol', 80000),
  ('Cancha 2', 'microfútbol', 60000)
on conflict do nothing;
