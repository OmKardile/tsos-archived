-- reseed-orders.sql — re-restore the 3 Demo Cafe sample orders (0008_seed §Orders).
-- Needed when order data was wiped after seeding (e.g. over-eager smoke-test
-- cleanup). IDEMPOTENT: every INSERT skips fixed IDs that already exist.
-- Run in the Dashboard SQL editor (postgres role bypasses RLS).
-- Restores: orders c000...(001 completed/takeaway ₹392 paid,
-- 002 preparing/dine-in T1 ₹116.50 paid, 003 new/delivery ₹267 unpaid) +
-- items/addons/payments/loyalty-earn/sale-logs, T1 back to occupied.
-- Does NOT touch the fee counter (direct inserts bypass _next_fee).

-- ── orders ────────────────────────────────────────────────────────────────
INSERT INTO public.orders
  (id, location_id, table_id, customer_id, order_type, status, placed_by,
   subtotal, tax_total, discount_total, platform_fee, fee_payer, grand_total, payment_status, created_at)
SELECT * FROM (VALUES
  ('c0000000-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, NULL,
   'a0000000-0000-0000-0000-000000000001'::uuid, 'takeaway', 'completed', NULL,
   420.00, 21.00, 50.00, 1.00, 'customer', 392.00, 'paid', '2026-09-10T12:30:00+05:30'::timestamptz),
  ('c0000000-0000-0000-0000-000000000002'::uuid, '22222222-2222-2222-2222-222222222222'::uuid,
   '90000000-0000-0000-0000-000000000001'::uuid,
   'a0000000-0000-0000-0000-000000000002'::uuid, 'dine_in', 'preparing', NULL,
   110.00, 5.50, 0.00, 1.00, 'customer', 116.50, 'paid', '2026-09-14T19:05:00+05:30'::timestamptz),
  ('c0000000-0000-0000-0000-000000000003'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, NULL,
   'a0000000-0000-0000-0000-000000000003'::uuid, 'delivery', 'new', NULL,
   280.00, 14.00, 28.00, 1.00, 'customer', 267.00, 'unpaid', '2026-09-15T13:45:00+05:30'::timestamptz)
) AS v(id, location_id, table_id, customer_id, order_type, status, placed_by,
       subtotal, tax_total, discount_total, platform_fee, fee_payer, grand_total, payment_status, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = v.id);

-- ── items ─────────────────────────────────────────────────────────────────
INSERT INTO public.order_items (id, order_id, menu_item_id, variant_id, qty, unit_price, notes)
SELECT * FROM (VALUES
  ('d0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, '50000000-0000-0000-0000-000000000004'::uuid, 2, 190.00, NULL),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000006'::uuid, NULL, 1, 40.00, NULL),
  ('d0000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, NULL, 1, 60.00, 'less sugar'),
  ('d0000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000007'::uuid, NULL, 1, 50.00, NULL),
  ('d0000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-000000000003'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, NULL, 1, 160.00, NULL),
  ('d0000000-0000-0000-0000-000000000006'::uuid, 'c0000000-0000-0000-0000-000000000003'::uuid, '40000000-0000-0000-0000-000000000008'::uuid, NULL, 1, 80.00, 'extra spicy')
) AS v(id, order_id, menu_item_id, variant_id, qty, unit_price, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.id = v.id);

-- ── addon (Oat Milk on order-3 latte) ──────────────────────────────────────
INSERT INTO public.order_item_addons (id, order_item_id, addon_id, price)
SELECT 'e0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000005'::uuid, '60000000-0000-0000-0000-000000000002'::uuid, 40.00
WHERE NOT EXISTS (SELECT 1 FROM public.order_item_addons WHERE id = 'e0000000-0000-0000-0000-000000000001');

-- ── payments ──────────────────────────────────────────────────────────────
INSERT INTO public.payments (id, order_id, method, amount, status, gateway_ref, created_at)
SELECT * FROM (VALUES
  ('e1000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'cash', 392.00, 'paid', NULL, '2026-09-10T12:32:00+05:30'::timestamptz),
  ('e1000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 'upi', 116.50, 'paid', 'seed-upi-001', '2026-09-14T19:06:00+05:30'::timestamptz)
) AS v(id, order_id, method, amount, status, gateway_ref, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.id = v.id);

-- ── loyalty earn for completed order 001 (39 pts) ──────────────────────────
INSERT INTO public.loyalty_ledger (id, customer_id, order_id, points_delta, reason, created_at)
SELECT 'f0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 39, 'earn', '2026-09-10T12:35:00+05:30'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_ledger WHERE id = 'f0000000-0000-0000-0000-000000000001');

-- ── sale logs for order 001 ────────────────────────────────────────────────
INSERT INTO public.inventory_logs (ingredient_id, change_qty, reason, ref_order_id)
SELECT * FROM (VALUES
  ('70000000-0000-0000-0000-000000000001'::uuid,  -36.000, 'sale', 'c0000000-0000-0000-0000-000000000001'::uuid),
  ('70000000-0000-0000-0000-000000000002'::uuid, -300.000, 'sale', 'c0000000-0000-0000-0000-000000000001'::uuid),
  ('70000000-0000-0000-0000-000000000005'::uuid,  -80.000, 'sale', 'c0000000-0000-0000-0000-000000000001'::uuid),
  ('70000000-0000-0000-0000-000000000006'::uuid,  -60.000, 'sale', 'c0000000-0000-0000-0000-000000000001'::uuid)
) AS v(ingredient_id, change_qty, reason, ref_order_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_logs il
  WHERE il.ref_order_id = v.ref_order_id AND il.reason = 'sale' AND il.ingredient_id = v.ingredient_id
);

-- ── stock back to seed levels (undoes smoke-test consumption) ─────────────
UPDATE public.ingredients SET stock_qty = 5000  WHERE id = '70000000-0000-0000-0000-000000000001';
UPDATE public.ingredients SET stock_qty = 10000 WHERE id = '70000000-0000-0000-0000-000000000002';
UPDATE public.ingredients SET stock_qty = 3000  WHERE id = '70000000-0000-0000-0000-000000000003';
UPDATE public.ingredients SET stock_qty = 2000  WHERE id = '70000000-0000-0000-0000-000000000004';
UPDATE public.ingredients SET stock_qty = 4000  WHERE id = '70000000-0000-0000-0000-000000000005';
UPDATE public.ingredients SET stock_qty = 6000  WHERE id = '70000000-0000-0000-0000-000000000006';
UPDATE public.ingredients SET stock_qty = 50    WHERE id = '70000000-0000-0000-0000-000000000007';

-- ── T1 occupied (order 002 is preparing dine-in there) ─────────────────────
UPDATE public.dine_tables SET status = 'occupied'
WHERE id = '90000000-0000-0000-0000-000000000001';

-- ── fee counter back to seed ───────────────────────────────────────────────
UPDATE public.location_fee_config SET period_order_count = 3
WHERE location_id = '22222222-2222-2222-2222-222222222222';
