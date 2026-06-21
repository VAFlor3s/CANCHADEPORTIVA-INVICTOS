-- ============================================
-- SPORTS CENTER - SCHEMA COMPLETO SUPABASE
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLA: categorías de productos
-- ============================================
create table if not exists product_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  color text default '#22c55e',
  icon text default 'package',
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: productos (cancha crea sus propios)
-- ============================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category_id uuid references product_categories(id) on delete set null,
  price decimal(10,2) not null default 0,
  cost decimal(10,2) default 0,
  stock integer default 0,
  min_stock integer default 5,
  unit text default 'unidad',
  image_url text,
  is_beverage boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TABLA: clientes
-- ============================================
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  document_id text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: canchas / espacios
-- ============================================
create table if not exists fields (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sport_type text not null default 'fútbol',
  capacity integer default 22,
  price_per_hour decimal(10,2) not null default 0,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: alquileres de cancha
-- ============================================
create table if not exists reservations (
  id uuid primary key default uuid_generate_v4(),
  field_id uuid references fields(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_hours decimal(4,2) generated always as (
    extract(epoch from (end_time - start_time)) / 3600
  ) stored,
  total_amount decimal(10,2) not null,
  status text not null default 'confirmada' check (status in ('confirmada','cancelada','completada','pendiente')),
  payment_status text not null default 'pendiente' check (payment_status in ('pendiente','parcial','pagado')),
  amount_paid decimal(10,2) default 0,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: campeonatos
-- ============================================
create table if not exists championships (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sport_type text not null default 'fútbol',
  category text,
  start_date date,
  end_date date,
  registration_fee decimal(10,2) default 0,
  prize_description text,
  max_teams integer,
  status text not null default 'inscripcion' check (status in ('inscripcion','en_curso','finalizado','cancelado')),
  description text,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: equipos
-- ============================================
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  championship_id uuid references championships(id) on delete cascade,
  name text not null,
  captain_name text,
  captain_phone text,
  player_count integer default 0,
  registration_paid boolean default false,
  amount_paid decimal(10,2) default 0,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: partidos
-- ============================================
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  championship_id uuid references championships(id) on delete cascade,
  field_id uuid references fields(id) on delete set null,
  home_team_id uuid references teams(id) on delete cascade,
  away_team_id uuid references teams(id) on delete cascade,
  match_date date,
  match_time time,
  home_score integer,
  away_score integer,
  stage text default 'grupo',
  status text default 'programado' check (status in ('programado','en_juego','finalizado','cancelado')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: ventas (caja)
-- ============================================
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  sale_type text not null default 'producto' check (sale_type in ('producto','bebida','alquiler','campeonato','otro')),
  customer_name text,
  customer_id uuid references customers(id) on delete set null,
  reservation_id uuid references reservations(id) on delete set null,
  total_amount decimal(10,2) not null,
  payment_method text default 'efectivo' check (payment_method in ('efectivo','tarjeta','transferencia','otro')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: detalle de ventas
-- ============================================
create table if not exists sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  unit_price decimal(10,2) not null,
  subtotal decimal(10,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: movimientos de stock
-- ============================================
create table if not exists stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  movement_type text not null check (movement_type in ('entrada','salida','ajuste')),
  quantity integer not null,
  reason text,
  reference_id uuid,
  created_at timestamptz default now()
);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Categorías por defecto
insert into product_categories (name, description, color, icon) values
  ('Bebidas', 'Gaseosas, agua, energizantes y más', '#0ea5e9', 'coffee'),
  ('Snacks', 'Papas, galletas, maní y similares', '#f59e0b', 'cookie'),
  ('Equipamiento', 'Balones, petos, conos', '#8b5cf6', 'shield'),
  ('Otros', 'Productos varios', '#6b7280', 'package')
on conflict do nothing;

-- Cancha por defecto
insert into fields (name, sport_type, capacity, price_per_hour, description) values
  ('Cancha Principal', 'fútbol', 22, 50000, 'Cancha de grama sintética, medidas reglamentarias'),
  ('Cancha 2', 'fútbol', 12, 35000, 'Cancha de microfútbol')
on conflict do nothing;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de ventas diarias
create or replace view daily_sales_summary as
select
  date_trunc('day', created_at) as day,
  sale_type,
  count(*) as total_transactions,
  sum(total_amount) as total_revenue
from sales
group by 1, 2
order by 1 desc;

-- Vista de reservas con cancha
create or replace view reservations_detail as
select
  r.*,
  f.name as field_name,
  f.sport_type
from reservations r
left join fields f on r.field_id = f.id;

-- Vista de productos con bajo stock
create or replace view low_stock_products as
select * from products
where stock <= min_stock and is_active = true
order by stock asc;

-- ============================================
-- ROW LEVEL SECURITY (desactivado para uso personal)
-- Si quieres auth, activa esto y configura políticas
-- ============================================
-- alter table products enable row level security;
-- alter table sales enable row level security;
-- etc.


-- ============================================
-- TABLA: configuración de la app (PINs, etc.)
-- ============================================
create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- PINs por defecto (Admin: 1234, Cajero: 5678)
insert into app_config (key, value) values
  ('pin_admin', '1234'),
  ('pin_cajero', '5678')
on conflict (key) do nothing;

-- RLS: permitir lectura/escritura a usuarios anon (la app usa anon key)
alter table app_config enable row level security;
create policy "allow_all_app_config" on app_config for all using (true) with check (true);
