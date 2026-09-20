-- 0003_indexes.sql — performance + idempotency indexes.

-- ── Tenancy / scoping ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS locations_business_idx      ON public.locations (business_id);
CREATE INDEX IF NOT EXISTS profiles_business_idx       ON public.profiles (business_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx           ON public.profiles (role);
CREATE INDEX IF NOT EXISTS user_locations_user_idx     ON public.user_locations (user_id);
CREATE INDEX IF NOT EXISTS user_locations_location_idx ON public.user_locations (location_id);

-- ── Menu ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS menu_categories_location_idx ON public.menu_categories (location_id);
CREATE INDEX IF NOT EXISTS menu_items_location_idx      ON public.menu_items (location_id);
CREATE INDEX IF NOT EXISTS menu_items_category_idx      ON public.menu_items (category_id);
CREATE INDEX IF NOT EXISTS menu_items_avail_idx         ON public.menu_items (location_id, is_available);
CREATE INDEX IF NOT EXISTS variants_item_idx            ON public.menu_item_variants (menu_item_id);
CREATE INDEX IF NOT EXISTS addons_location_idx          ON public.addons (location_id);
CREATE INDEX IF NOT EXISTS item_addons_item_idx         ON public.menu_item_addons (menu_item_id);
CREATE INDEX IF NOT EXISTS item_addons_addon_idx        ON public.menu_item_addons (addon_id);

-- ── Inventory ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ingredients_location_idx     ON public.ingredients (location_id);
CREATE INDEX IF NOT EXISTS ingredients_low_stock_idx    ON public.ingredients (location_id)
  WHERE stock_qty <= low_stock_threshold;
CREATE INDEX IF NOT EXISTS recipes_item_idx             ON public.recipes (menu_item_id);
CREATE INDEX IF NOT EXISTS recipes_ingredient_idx       ON public.recipes (ingredient_id);
CREATE INDEX IF NOT EXISTS inventory_logs_ingredient_idx ON public.inventory_logs (ingredient_id);
CREATE INDEX IF NOT EXISTS inventory_logs_order_idx     ON public.inventory_logs (ref_order_id);

-- ── Tables ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS dine_tables_location_idx     ON public.dine_tables (location_id);

-- ── Orders (ops dashboard + reports) ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS orders_location_idx          ON public.orders (location_id);
CREATE INDEX IF NOT EXISTS orders_status_idx            ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx           ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS orders_loc_status_created_idx
  ON public.orders (location_id, status, created_at);
CREATE INDEX IF NOT EXISTS orders_loc_created_idx       ON public.orders (location_id, created_at);
CREATE INDEX IF NOT EXISTS orders_table_idx             ON public.orders (table_id);
CREATE INDEX IF NOT EXISTS orders_customer_idx          ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx        ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_menu_item_idx    ON public.order_items (menu_item_id);
CREATE INDEX IF NOT EXISTS order_item_addons_item_idx   ON public.order_item_addons (order_item_id);
CREATE INDEX IF NOT EXISTS order_item_addons_addon_idx  ON public.order_item_addons (addon_id);

-- ── Payments: gateway-ref idempotency ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS payments_order_idx           ON public.payments (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_order_gateway_uidx
  ON public.payments (order_id, gateway_ref) WHERE gateway_ref IS NOT NULL;

-- ── Customers / loyalty ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS customers_business_idx       ON public.customers (business_id);
CREATE INDEX IF NOT EXISTS loyalty_customer_idx         ON public.loyalty_ledger (customer_id);
CREATE INDEX IF NOT EXISTS loyalty_order_idx            ON public.loyalty_ledger (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_earn_once_uidx
  ON public.loyalty_ledger (customer_id, order_id, reason) WHERE reason = 'earn';

-- ── Offers / shifts / audit / tokens ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS offers_location_idx          ON public.offers (location_id);
CREATE INDEX IF NOT EXISTS offers_active_window_idx     ON public.offers (location_id, is_active, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS shifts_user_idx              ON public.shifts (user_id);
CREATE INDEX IF NOT EXISTS shifts_location_idx          ON public.shifts (location_id);
CREATE INDEX IF NOT EXISTS audit_location_created_idx   ON public.audit_logs (location_id, created_at);
CREATE INDEX IF NOT EXISTS audit_entity_idx             ON public.audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS device_tokens_user_idx       ON public.device_tokens (user_id);

-- ── Search helpers ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS menu_items_name_trgm_idx     ON public.menu_items USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_phone_trgm_idx     ON public.customers USING gin (phone gin_trgm_ops);
