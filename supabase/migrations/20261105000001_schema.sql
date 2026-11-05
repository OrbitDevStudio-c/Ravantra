-- =====================================================================
-- RAVANTRA — core schema
-- Multi-division commerce + salon platform on Supabase PostgreSQL
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.division_kind as enum ('products', 'services');
  create type public.order_status as enum ('pending','confirmed','processing','shipped','delivered','cancelled','refunded');
  create type public.payment_status as enum ('pending','successful','failed','refunded');
  create type public.appointment_status as enum ('pending','confirmed','completed','cancelled','no_show');
  create type public.inventory_reason as enum ('initial','restock','adjustment','sale','order_cancelled','return','damage');
  create type public.discount_type as enum ('percent','fixed');
  create type public.promotion_placement as enum ('home_banner','home_strip','division_banner');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));

create table public.business_divisions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  short_name text not null,
  tagline text not null default '',
  description text not null default '',
  kind public.division_kind not null default 'products',
  accent_color text not null default '#B69A72' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  hero_image text,
  banner_image text,
  logo_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  -- when set, every permission granted by this role is scoped to this division
  division_id uuid references public.business_divisions(id) on delete cascade,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create index user_roles_role_idx on public.user_roles (role_id);

create table public.division_managers (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.business_divisions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Division Manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, user_id)
);

-- ---------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.business_divisions(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  image text,
  sort_order int not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, slug)
);
create index categories_division_idx on public.categories (division_id, sort_order);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.business_divisions(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  sku text not null unique,
  short_description text not null default '',
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  ingredients text,
  highlights text[] not null default '{}',
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_active boolean not null default true,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  search tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.products_search_refresh()
returns trigger language plpgsql as $$
begin
  new.search :=
    setweight(to_tsvector('simple', coalesce(new.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.short_description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags, ' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'C');
  return new;
end $$;
create trigger products_search_tg before insert or update of name, short_description, tags, description
  on public.products for each row execute function public.products_search_refresh();
create index products_division_idx on public.products (division_id) where is_active;
create index products_category_idx on public.products (category_id);
create index products_featured_idx on public.products (is_featured) where is_featured and is_active;
create index products_created_idx on public.products (created_at desc);
create index products_search_idx on public.products using gin (search);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  storage_path text,
  alt text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null default 'Standard',
  size text,
  color text,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  volume text,
  price numeric(12,2) check (price is null or price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id, sort_order);

-- One inventory row per variant. Kept separate from catalogue data on purpose.
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references public.product_variants(id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_low_idx on public.inventory (quantity) where quantity <= 3;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  change int not null check (change <> 0),
  quantity_after int not null check (quantity_after >= 0),
  reason public.inventory_reason not null,
  note text,
  order_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null check (postal_code ~ '^[1-9][0-9]{5}$'),
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default on public.addresses (user_id) where is_default;

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

-- ---------------------------------------------------------------------
-- Marketing
-- ---------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9]{3,24}$'),
  description text not null default '',
  discount_type public.discount_type not null,
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_subtotal numeric(12,2) not null default 0 check (min_subtotal >= 0),
  max_discount numeric(12,2) check (max_discount is null or max_discount > 0),
  division_id uuid references public.business_divisions(id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  used_count int not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 90),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  eyebrow text not null default '',
  title text not null,
  subtitle text not null default '',
  cta_label text not null default 'Shop now',
  cta_href text not null default '/' check (cta_href ~ '^/'),
  image text,
  placement public.promotion_placement not null default 'home_banner',
  division_id uuid references public.business_divisions(id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'website',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index newsletter_email_uniq on public.newsletter_subscribers (lower(email));

-- ---------------------------------------------------------------------
-- Orders & payments (separate from appointments by design)
-- ---------------------------------------------------------------------
create sequence public.order_number_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('RV-' || nextval('public.order_number_seq')::text),
  user_id uuid not null references public.profiles(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  shipping_address jsonb not null,
  notes text,
  stock_released boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount_total + shipping_total)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  division_id uuid not null references public.business_divisions(id) on delete restrict,
  product_name text not null,
  variant_name text,
  sku text not null,
  image text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_division_idx on public.order_items (division_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay','demo')),
  provider_order_id text unique,
  provider_payment_id text unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  method text,
  failure_reason text,
  refunded_amount numeric(12,2) not null default 0,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

-- ---------------------------------------------------------------------
-- Salon & Spa
-- ---------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.business_divisions(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null,
  name text not null,
  description text not null default '',
  duration_min int not null check (duration_min between 15 and 480 and duration_min % 15 = 0),
  price numeric(12,2) not null check (price >= 0),
  image text,
  is_popular boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stylists (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.business_divisions(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  name text not null,
  title text not null default '',
  bio text not null default '',
  image text,
  specialties text[] not null default '{}',
  experience_years int not null default 0 check (experience_years >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stylist_services (
  stylist_id uuid not null references public.stylists(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stylist_id, service_id)
);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (stylist_id, weekday)
);

create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index blocked_slots_stylist_idx on public.blocked_slots (stylist_id, starts_at);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('APT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  stylist_id uuid not null references public.stylists(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  price numeric(12,2) not null check (price >= 0),
  notes text,
  cancel_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- hard guarantee against double booking a stylist
  constraint appointments_no_overlap exclude using gist (
    stylist_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending','confirmed'))
);
create index appointments_customer_idx on public.appointments (customer_id, starts_at desc);
create index appointments_starts_idx on public.appointments (starts_at);
create index appointments_stylist_idx on public.appointments (stylist_id, starts_at);

-- ---------------------------------------------------------------------
-- Reviews & activity
-- ---------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '' check (char_length(body) <= 2000),
  is_published boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, created_at desc) where is_published;
create unique index reviews_one_per_user on public.reviews (product_id, user_id) where user_id is not null;

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  division_id uuid references public.business_divisions(id) on delete set null,
  summary text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','business_divisions','roles','permissions','division_managers','categories','products',
    'product_images','product_variants','inventory','addresses','carts','cart_items','wishlists',
    'coupons','promotions','newsletter_subscribers','orders','payments','services','stylists',
    'working_hours','blocked_slots','appointments','reviews'
  ] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
