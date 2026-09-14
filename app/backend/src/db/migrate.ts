import { query } from './pool.js';

export async function migrate() {
  console.log('Running migrations...');

  await query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id UUID NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      address TEXT,
      phone TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT,
      pin_code TEXT,
      role TEXT CHECK (role IN ('owner','manager','cashier','kitchen')) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_locations (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      image_url TEXT,
      is_veg BOOLEAN,
      tax_rate_pct NUMERIC(5,2) DEFAULT 5.0,
      is_available BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_item_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_delta NUMERIC(10,2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS addons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price NUMERIC(10,2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_item_addons (
      menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
      addon_id UUID REFERENCES addons(id) ON DELETE CASCADE,
      PRIMARY KEY (menu_item_id, addon_id)
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      unit TEXT CHECK (unit IN ('g','kg','ml','l','pcs')) NOT NULL,
      stock_qty NUMERIC(10,2) DEFAULT 0,
      low_stock_threshold NUMERIC(10,2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
      ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
      qty_consumed NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
      change_qty NUMERIC(10,2) NOT NULL,
      reason TEXT CHECK (reason IN ('sale','restock','wastage','adjustment')),
      ref_order_id UUID,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dine_tables (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      seats INT,
      status TEXT CHECK (status IN ('free','occupied','reserved')) DEFAULT 'free'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      table_id UUID REFERENCES dine_tables(id),
      customer_id UUID,
      order_type TEXT CHECK (order_type IN ('dine_in','takeaway','delivery')) NOT NULL,
      status TEXT CHECK (status IN ('new','preparing','ready','served','completed','cancelled')) DEFAULT 'new',
      placed_by TEXT CHECK (placed_by IN ('staff','customer_qr','customer_online')) NOT NULL,
      subtotal NUMERIC(10,2),
      tax_total NUMERIC(10,2),
      discount_total NUMERIC(10,2) DEFAULT 0,
      platform_fee NUMERIC(10,2) DEFAULT 0,
      fee_payer TEXT CHECK (fee_payer IN ('customer','cafe')),
      grand_total NUMERIC(10,2),
      payment_status TEXT CHECK (payment_status IN ('unpaid','paid','partial','refunded')) DEFAULT 'unpaid',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id UUID REFERENCES menu_items(id),
      variant_id UUID REFERENCES menu_item_variants(id),
      qty INT NOT NULL,
      unit_price NUMERIC(10,2),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS order_item_addons (
      order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
      addon_id UUID REFERENCES addons(id),
      PRIMARY KEY (order_item_id, addon_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      method TEXT CHECK (method IN ('cash','upi','card','razorpay')),
      amount NUMERIC(10,2),
      status TEXT CHECK (status IN ('pending','success','failed')),
      gateway_ref TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT,
      phone TEXT UNIQUE,
      email TEXT,
      loyalty_points INT DEFAULT 0,
      total_orders INT DEFAULT 0,
      total_spent NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS loyalty_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      order_id UUID REFERENCES orders(id),
      points_delta INT,
      reason TEXT CHECK (reason IN ('earn','redeem','adjust')),
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      title TEXT,
      type TEXT CHECK (type IN ('percent','flat','bogo')),
      value NUMERIC(10,2),
      min_order_value NUMERIC(10,2) DEFAULT 0,
      valid_from DATE,
      valid_to DATE,
      is_active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS location_fee_config (
      location_id UUID PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
      monthly_fee NUMERIC(10,2) DEFAULT 0,
      per_order_fee NUMERIC(10,2) DEFAULT 1,
      default_fee_payer TEXT CHECK (default_fee_payer IN ('customer','cafe')) DEFAULT 'customer',
      customer_paid_order_limit INT,
      period_order_count INT DEFAULT 0,
      period_reset_at DATE
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      clock_in TIMESTAMPTZ,
      clock_out TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      location_id UUID,
      action TEXT,
      entity TEXT,
      entity_id UUID,
      meta_json JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log('Migrations complete.');
}

