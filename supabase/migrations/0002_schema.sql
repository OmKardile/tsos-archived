-- 0002_schema.sql — TSOS full schema (24 tables).
-- Conventions: UUID PKs via gen_random_uuid(), timestamptz created_at DEFAULT now().
-- No updated_at columns (change history goes through audit_logs / triggers).
-- Creation order respects FK dependencies.

-- ── Tenancy ────────────────────────────────────────────────────────────────

CREATE TABLE public.businesses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid,
  name          text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid       NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name       text        NOT NULL,
  slug       citext      NOT NULL UNIQUE,
  address    text,
  phone      text,
  timezone   text        NOT NULL DEFAULT 'Asia/Kolkata',
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Staff profile. id MUST equal auth.users.id (created by handle_new_user trigger).
-- pin_code stores a SHA-256 hex digest, never plaintext (see functions/pin-login).
CREATE TABLE public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email       text,
  name        text,
  role        text        NOT NULL DEFAULT 'cashier'
              CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen')),
  business_id uuid        REFERENCES public.businesses (id) ON DELETE SET NULL,
  pin_code    text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_locations (
  user_id     uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  location_id uuid        NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, location_id)
);

-- ── Menu ───────────────────────────────────────────────────────────────────

CREATE TABLE public.menu_categories (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid    NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  name        text    NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

CREATE TABLE public.menu_items (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  uuid          NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  category_id  uuid          REFERENCES public.menu_categories (id) ON DELETE SET NULL,
  name         text          NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url    text,
  is_veg       boolean       NOT NULL DEFAULT true,
  is_available boolean       NOT NULL DEFAULT true,
  tax_rate_pct numeric(5,2)  NOT NULL DEFAULT 5.00,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_item_variants (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  uuid          NOT NULL REFERENCES public.menu_items (id) ON DELETE CASCADE,
  name          text          NOT NULL,
  price_delta   numeric(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.addons (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid          NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  name        text          NOT NULL,
  price       numeric(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE public.menu_item_addons (
  menu_item_id uuid NOT NULL REFERENCES public.menu_items (id) ON DELETE CASCADE,
  addon_id     uuid NOT NULL REFERENCES public.addons (id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, addon_id)
);

-- ── Inventory ──────────────────────────────────────────────────────────────

CREATE TABLE public.ingredients (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id          uuid          NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  name                 text          NOT NULL,
  unit                 text          NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'pcs')),
  stock_qty            numeric(12,3) NOT NULL DEFAULT 0,
  low_stock_threshold  numeric(12,3) NOT NULL DEFAULT 0
);

CREATE TABLE public.recipes (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  uuid          NOT NULL REFERENCES public.menu_items (id) ON DELETE CASCADE,
  ingredient_id uuid          NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  qty_consumed  numeric(12,3) NOT NULL CHECK (qty_consumed > 0),
  UNIQUE (menu_item_id, ingredient_id)
);

-- ── Tables / QR ────────────────────────────────────────────────────────────

CREATE TABLE public.dine_tables (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid    NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  label       text    NOT NULL,
  qr_token    text    NOT NULL UNIQUE,
  seats       integer NOT NULL DEFAULT 2,
  status      text    NOT NULL DEFAULT 'free'
              CHECK (status IN ('free', 'occupied', 'reserved'))
);

-- ── Customers / loyalty ────────────────────────────────────────────────────

CREATE TABLE public.customers (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid          NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name           text,
  phone          text          NOT NULL,
  email          text,
  loyalty_points integer       NOT NULL DEFAULT 0,
  total_orders   integer       NOT NULL DEFAULT 0,
  total_spent    numeric(12,2) NOT NULL DEFAULT 0,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (business_id, phone)
);

-- ── Ordering ───────────────────────────────────────────────────────────────

CREATE TABLE public.orders (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id    uuid          NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  table_id       uuid          REFERENCES public.dine_tables (id) ON DELETE SET NULL,
  customer_id    uuid          REFERENCES public.customers (id) ON DELETE SET NULL,
  order_type     text          NOT NULL DEFAULT 'dine_in'
                 CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  status         text          NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  placed_by      uuid          REFERENCES public.profiles (id) ON DELETE SET NULL,
  subtotal       numeric(12,2) NOT NULL DEFAULT 0,
  tax_total      numeric(12,2) NOT NULL DEFAULT 0,
  discount_total numeric(12,2) NOT NULL DEFAULT 0,
  platform_fee   numeric(12,2) NOT NULL DEFAULT 0,
  fee_payer      text          NOT NULL DEFAULT 'customer'
                 CHECK (fee_payer IN ('customer', 'cafe')),
  grand_total    numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text          NOT NULL DEFAULT 'unpaid'
                 CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid          NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  menu_item_id uuid          NOT NULL REFERENCES public.menu_items (id) ON DELETE RESTRICT,
  variant_id   uuid          REFERENCES public.menu_item_variants (id) ON DELETE SET NULL,
  qty          integer       NOT NULL CHECK (qty > 0),
  unit_price   numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  notes        text
);

CREATE TABLE public.order_item_addons (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id  uuid          NOT NULL REFERENCES public.order_items (id) ON DELETE CASCADE,
  addon_id       uuid          NOT NULL REFERENCES public.addons (id) ON DELETE RESTRICT,
  price          numeric(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE public.payments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid        NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  method      text        NOT NULL CHECK (method IN ('cash', 'upi', 'card')),
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  status      text        NOT NULL DEFAULT 'paid',
  gateway_ref text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Inventory logs (after orders: FK to orders) ────────────────────────────

CREATE TABLE public.inventory_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid        NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  change_qty    numeric(12,3) NOT NULL,
  reason        text        NOT NULL CHECK (reason IN ('sale', 'restock', 'wastage', 'adjustment')),
  ref_order_id  uuid        REFERENCES public.orders (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Loyalty ledger (after orders) ──────────────────────────────────────────

CREATE TABLE public.loyalty_ledger (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid        NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  order_id     uuid        REFERENCES public.orders (id) ON DELETE SET NULL,
  points_delta integer     NOT NULL,
  reason       text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Offers / fees ──────────────────────────────────────────────────────────

CREATE TABLE public.offers (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid          NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  title           text          NOT NULL,
  type            text          NOT NULL CHECK (type IN ('flat', 'percent', 'bogo')),
  value           numeric(12,2) NOT NULL CHECK (value >= 0),
  min_order_value numeric(12,2) NOT NULL DEFAULT 0,
  valid_from      timestamptz,
  valid_to        timestamptz,
  is_active       boolean       NOT NULL DEFAULT true
);

CREATE TABLE public.location_fee_config (
  location_id              uuid          PRIMARY KEY REFERENCES public.locations (id) ON DELETE CASCADE,
  monthly_fee              numeric(12,2) NOT NULL DEFAULT 0,
  per_order_fee            numeric(12,2) NOT NULL DEFAULT 1,
  default_fee_payer        text          NOT NULL DEFAULT 'customer'
                           CHECK (default_fee_payer IN ('customer', 'cafe')),
  customer_paid_order_limit integer      NOT NULL DEFAULT 100,
  period_order_count       integer       NOT NULL DEFAULT 0,
  period_reset_at          timestamptz   NOT NULL DEFAULT now()
);

-- ── Ops ────────────────────────────────────────────────────────────────────

CREATE TABLE public.shifts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  location_id uuid        NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  clock_in    timestamptz NOT NULL DEFAULT now(),
  clock_out   timestamptz,
  CHECK (clock_out IS NULL OR clock_out > clock_in)
);

CREATE TABLE public.audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  location_id uuid        REFERENCES public.locations (id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity      text        NOT NULL,
  entity_id   text,
  meta_json   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.device_tokens (
  user_id    uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  token      text        NOT NULL,
  platform   text        NOT NULL CHECK (platform IN ('android', 'windows', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, token)
);
