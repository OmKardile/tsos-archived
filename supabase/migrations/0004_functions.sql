-- 0004_functions.sql — trusted-pricing RPCs + membership helpers.

-- ══ Membership helpers ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_member(p_uid uuid, p_loc uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $helper$
  SELECT EXISTS (
    SELECT 1 FROM public.user_locations ul
    WHERE ul.user_id = p_uid AND ul.location_id = p_loc
  );
$helper$;

CREATE OR REPLACE FUNCTION public.my_business(p_uid uuid)
RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $helper$
  SELECT p.business_id FROM public.profiles p WHERE p.id = p_uid;
$helper$;

CREATE OR REPLACE FUNCTION public.has_role(p_uid uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $helper$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_uid AND p.role = ANY (p_roles)
  );
$helper$;

-- Internal fee engine
CREATE OR REPLACE FUNCTION public._next_fee(
  p_location_id uuid,
  OUT fee numeric,
  OUT payer text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $helper$
DECLARE
  v_cfg RECORD;
BEGIN
  SELECT per_order_fee, default_fee_payer, customer_paid_order_limit, period_order_count
    INTO v_cfg
    FROM public.location_fee_config
    WHERE location_id = p_location_id
    FOR UPDATE;
  IF NOT FOUND THEN
    fee := 1; payer := 'customer';
    RETURN;
  END IF;
  fee := COALESCE(v_cfg.per_order_fee, 0);
  IF v_cfg.period_order_count >= v_cfg.customer_paid_order_limit THEN
    payer := 'cafe';
  ELSE
    payer := COALESCE(v_cfg.default_fee_payer, 'customer');
  END IF;
  UPDATE public.location_fee_config
    SET period_order_count = period_order_count + 1
    WHERE location_id = p_location_id;
END;
$helper$;

-- ══ create_order (staff) ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_order(
  p_location_id    uuid,
  p_order_type     text,
  p_table_id       uuid    DEFAULT NULL,
  p_customer_id    uuid    DEFAULT NULL,
  p_items          jsonb   DEFAULT '[]'::jsonb,
  p_offer_id       uuid    DEFAULT NULL,
  p_loyalty_redeem integer DEFAULT 0,
  p_payment_method text    DEFAULT 'cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid          uuid := auth.uid();
  v_biz          uuid;
  v_order_id     uuid;
  v_it           jsonb;
  v_menu_item_id uuid;
  v_variant_id   uuid;
  v_qty          int;
  v_notes        text;
  v_aids         jsonb;
  v_price        numeric(10,2);
  v_tax_rate     numeric(5,2);
  v_delta        numeric(10,2);
  v_addon_sum    numeric;
  v_aid          uuid;
  v_aprice       numeric(10,2);
  v_line_sub     numeric;
  v_line_tax     numeric;
  v_subtotal     numeric := 0;
  v_tax_total    numeric := 0;
  v_discount     numeric := 0;
  v_loyalty_val  numeric := 0;
  v_redeem       int := 0;
  v_balance      int := 0;
  v_fee          numeric;
  v_fee_payer    text;
  v_grand        numeric;
  v_total_qty    int := 0;
  v_cheapest     numeric;
  v_o_type       text;
  v_o_value      numeric;
  v_o_min        numeric;
  v_line         RECORD;
  v_oi_id        uuid;
BEGIN
  IF p_order_type NOT IN ('dine_in', 'takeaway', 'delivery') THEN
    RAISE EXCEPTION 'Invalid order_type: %', p_order_type;
  END IF;
  IF p_payment_method NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  SELECT l.business_id INTO v_biz
    FROM public.locations l WHERE l.id = p_location_id AND l.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location not found or inactive'; END IF;

  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated';
  ELSIF NOT public.is_member(v_uid, p_location_id) THEN
    RAISE EXCEPTION 'Access denied for location';
  ELSIF NOT public.has_role(v_uid, ARRAY['owner', 'manager', 'cashier']) THEN
    RAISE EXCEPTION 'Role not permitted to create orders';
  END IF;

  IF p_table_id IS NOT NULL THEN
    PERFORM 1 FROM public.dine_tables
      WHERE id = p_table_id AND location_id = p_location_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Table does not belong to location'; END IF;
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT c.loyalty_points INTO v_balance FROM public.customers c
      WHERE c.id = p_customer_id AND c.business_id = v_biz FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found in this business'; END IF;
  END IF;

  CREATE TEMP TABLE tmp_lines (
    menu_item_id uuid, variant_id uuid, qty int, notes text,
    unit_price numeric, tax_rate numeric, addon_ids uuid[], addon_total numeric
  ) ON COMMIT DROP;

  FOR v_it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      v_menu_item_id := (v_it ->> 'menu_item_id')::uuid;
      v_qty := (v_it ->> 'qty')::int;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Malformed order item: %', v_it;
    END;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Item qty must be > 0'; END IF;
    v_variant_id := NULLIF(v_it ->> 'variant_id', '')::uuid;
    v_notes := NULLIF(v_it ->> 'notes', '');
    v_aids := COALESCE(v_it -> 'addon_ids', '[]'::jsonb);
    IF jsonb_typeof(v_aids) <> 'array' THEN RAISE EXCEPTION 'addon_ids must be an array'; END IF;

    SELECT mi.price, mi.tax_rate_pct INTO v_price, v_tax_rate
      FROM public.menu_items mi
      WHERE mi.id = v_menu_item_id AND mi.location_id = p_location_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found at location', v_menu_item_id; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.menu_items mi
                   WHERE mi.id = v_menu_item_id AND mi.is_available = true) THEN
      RAISE EXCEPTION 'Menu item % is not available', v_menu_item_id;
    END IF;

    v_delta := 0;
    IF v_variant_id IS NOT NULL THEN
      SELECT v.price_delta INTO v_delta FROM public.menu_item_variants v
        WHERE v.id = v_variant_id AND v.menu_item_id = v_menu_item_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variant % does not belong to item %', v_variant_id, v_menu_item_id; END IF;
    END IF;

    v_addon_sum := 0;
    FOR v_aid IN SELECT value::uuid FROM jsonb_array_elements_text(v_aids) AS value LOOP
      SELECT a.price INTO v_aprice FROM public.addons a
        WHERE a.id = v_aid AND a.location_id = p_location_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Addon % not found at location', v_aid; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.menu_item_addons mia
                     WHERE mia.menu_item_id = v_menu_item_id AND mia.addon_id = v_aid) THEN
        RAISE EXCEPTION 'Addon % is not linked to item %', v_aid, v_menu_item_id;
      END IF;
      v_addon_sum := v_addon_sum + v_aprice;
    END LOOP;

    v_line_sub := ((v_price + v_delta) + v_addon_sum) * v_qty;
    v_line_tax := v_line_sub * (v_tax_rate / 100);
    v_subtotal := v_subtotal + v_line_sub;
    v_tax_total := v_tax_total + v_line_tax;
    v_total_qty := v_total_qty + v_qty;
    IF v_cheapest IS NULL OR ((v_price + v_delta) + v_addon_sum) < v_cheapest THEN
      v_cheapest := (v_price + v_delta) + v_addon_sum;
    END IF;

    INSERT INTO tmp_lines
      SELECT v_menu_item_id, v_variant_id, v_qty, v_notes,
             (v_price + v_delta), v_tax_rate,
             COALESCE((SELECT array_agg(value::uuid)
                       FROM jsonb_array_elements_text(v_aids) AS value), '{}'::uuid[]),
             v_addon_sum;
  END LOOP;

  IF p_offer_id IS NOT NULL THEN
    SELECT o.type, o.value, o.min_order_value INTO v_o_type, v_o_value, v_o_min
      FROM public.offers o
      WHERE o.id = p_offer_id AND o.location_id = p_location_id AND o.is_active = true
        AND (o.valid_from IS NULL OR now() >= o.valid_from)
        AND (o.valid_to IS NULL OR now() <= o.valid_to);
    IF NOT FOUND THEN RAISE EXCEPTION 'Offer invalid, expired or not applicable'; END IF;
    IF v_subtotal < v_o_min THEN
      RAISE EXCEPTION 'Offer needs minimum order value %', v_o_min;
    END IF;
    CASE v_o_type
      WHEN 'flat' THEN v_discount := LEAST(v_o_value, v_subtotal);
      WHEN 'percent' THEN v_discount := LEAST(v_subtotal * (v_o_value / 100), v_subtotal);
      WHEN 'bogo' THEN
        IF v_total_qty < 2 THEN RAISE EXCEPTION 'BOGO needs at least 2 items'; END IF;
        v_discount := CASE WHEN v_o_value > 0 THEN LEAST(v_o_value, v_cheapest) ELSE v_cheapest END;
      ELSE RAISE EXCEPTION 'Unknown offer type';
    END CASE;
  END IF;

  IF COALESCE(p_loyalty_redeem, 0) > 0 THEN
    IF p_customer_id IS NULL THEN RAISE EXCEPTION 'Loyalty redemption needs a customer'; END IF;
    IF v_subtotal < 100 THEN RAISE EXCEPTION 'Loyalty redemption needs minimum order ₹100'; END IF;
    v_redeem := LEAST(p_loyalty_redeem, v_balance, FLOOR(v_subtotal - v_discount)::int);
    IF v_redeem < 0 THEN v_redeem := 0; END IF;
    v_loyalty_val := v_redeem;
  END IF;

  SELECT f.fee, f.payer INTO v_fee, v_fee_payer FROM public._next_fee(p_location_id) AS f;

  v_grand := v_subtotal + v_tax_total - v_discount - v_loyalty_val
             + CASE WHEN v_fee_payer = 'customer' THEN v_fee ELSE 0 END;
  IF v_grand < 0 THEN v_grand := 0; END IF;

  INSERT INTO public.orders
    (location_id, table_id, customer_id, order_type, status, placed_by,
     subtotal, tax_total, discount_total, platform_fee, fee_payer, grand_total, payment_status)
  VALUES
    (p_location_id, p_table_id, p_customer_id, p_order_type, 'new', v_uid,
     v_subtotal, v_tax_total, v_discount, v_fee, v_fee_payer, v_grand, 'paid')
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM tmp_lines LOOP
    INSERT INTO public.order_items (order_id, menu_item_id, variant_id, qty, unit_price, notes)
      VALUES (v_order_id, v_line.menu_item_id, v_line.variant_id, v_line.qty,
              v_line.unit_price, v_line.notes)
      RETURNING id INTO v_oi_id;
    INSERT INTO public.order_item_addons (order_item_id, addon_id, price)
      SELECT v_oi_id, u.aid, ad.price
      FROM unnest(v_line.addon_ids) AS u(aid)
      JOIN public.addons ad ON ad.id = u.aid;
  END LOOP;

  INSERT INTO public.payments (order_id, method, amount, status)
    VALUES (v_order_id, p_payment_method, v_grand, 'paid');

  IF v_redeem > 0 THEN
    UPDATE public.customers SET loyalty_points = loyalty_points - v_redeem
      WHERE id = p_customer_id;
    INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (p_customer_id, v_order_id, -v_redeem, 'redeem');
  END IF;

  IF p_order_type = 'dine_in' AND p_table_id IS NOT NULL THEN
    UPDATE public.dine_tables SET status = 'occupied' WHERE id = p_table_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (v_uid, p_location_id, 'create_order', 'orders', v_order_id::text,
            jsonb_build_object('grand_total', v_grand, 'method', p_payment_method));

  RETURN jsonb_build_object(
    'id', v_order_id, 'subtotal', v_subtotal, 'tax_total', v_tax_total,
    'discount_total', v_discount, 'loyalty_redeemed', v_redeem,
    'platform_fee', v_fee, 'fee_payer', v_fee_payer, 'grand_total', v_grand);
END;
$func$;

-- ══ transition_order_status ════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.transition_order_status(p_order_id uuid, p_to_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid   uuid := auth.uid();
  v_o     RECORD;
  v_from  text;
  v_pts   int;
  v_n     int;
  v_ing   uuid;
  v_need  numeric;
BEGIN
  IF p_to_status NOT IN ('preparing', 'ready', 'served', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid target status: %', p_to_status;
  END IF;

  SELECT * INTO v_o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  v_from := v_o.status;

  IF v_from IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Order is terminal (%)', v_from;
  END IF;
  IF p_to_status = 'cancelled' THEN NULL;
  ELSIF p_to_status = 'preparing' AND v_from = 'new' THEN NULL;
  ELSIF p_to_status = 'ready' AND v_from = 'preparing' THEN NULL;
  ELSIF p_to_status = 'served' AND v_from = 'ready' THEN NULL;
  ELSIF p_to_status = 'completed' AND v_from = 'served' THEN NULL;
  ELSE RAISE EXCEPTION 'Illegal transition % → %', v_from, p_to_status;
  END IF;

  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated';
  ELSIF NOT public.is_member(v_uid, v_o.location_id) THEN
    RAISE EXCEPTION 'Access denied for location';
  ELSIF public.has_role(v_uid, ARRAY['kitchen']) THEN
    IF NOT ((v_from = 'new' AND p_to_status = 'preparing')
        OR (v_from = 'preparing' AND p_to_status = 'ready')) THEN
      RAISE EXCEPTION 'Kitchen may only move new→preparing→ready';
    END IF;
  ELSIF NOT public.has_role(v_uid, ARRAY['owner', 'manager', 'cashier']) THEN
    RAISE EXCEPTION 'Role not permitted to transition orders';
  END IF;

  UPDATE public.orders SET status = p_to_status WHERE id = p_order_id;

  IF p_to_status = 'completed' THEN
    IF NOT EXISTS (SELECT 1 FROM public.inventory_logs il
                   WHERE il.ref_order_id = p_order_id AND il.reason = 'sale') THEN
      FOR v_ing, v_need IN
        SELECT r.ingredient_id, SUM(r.qty_consumed * oi.qty)
        FROM public.order_items oi
        JOIN public.recipes r ON r.menu_item_id = oi.menu_item_id
        WHERE oi.order_id = p_order_id
        GROUP BY r.ingredient_id
      LOOP
        UPDATE public.ingredients SET stock_qty = stock_qty - v_need WHERE id = v_ing;
        INSERT INTO public.inventory_logs (ingredient_id, change_qty, reason, ref_order_id)
          VALUES (v_ing, -v_need, 'sale', p_order_id);
      END LOOP;
    END IF;
    IF v_o.customer_id IS NOT NULL THEN
      v_pts := FLOOR(v_o.grand_total / 10)::int;
      IF v_pts > 0 THEN
        INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
          VALUES (v_o.customer_id, p_order_id, v_pts, 'earn')
          ON CONFLICT (customer_id, order_id, reason) WHERE reason = 'earn' DO NOTHING;
        GET DIAGNOSTICS v_n = ROW_COUNT;
        IF v_n = 1 THEN
          UPDATE public.customers
            SET loyalty_points = loyalty_points + v_pts,
                total_orders = total_orders + 1,
                total_spent = total_spent + v_o.grand_total
            WHERE id = v_o.customer_id;
        END IF;
      ELSE
        UPDATE public.customers
          SET total_orders = total_orders + 1,
              total_spent = total_spent + v_o.grand_total
          WHERE id = v_o.customer_id;
      END IF;
    END IF;
    IF v_o.order_type = 'dine_in' AND v_o.table_id IS NOT NULL THEN
      UPDATE public.dine_tables SET status = 'free' WHERE id = v_o.table_id;
    END IF;
  END IF;

  IF p_to_status = 'cancelled' AND v_o.table_id IS NOT NULL THEN
    UPDATE public.dine_tables SET status = 'free' WHERE id = v_o.table_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (v_uid, v_o.location_id, 'status_' || p_to_status, 'orders', p_order_id::text,
            jsonb_build_object('from', v_from, 'to', p_to_status));

  RETURN (SELECT row_to_json(o)::jsonb FROM public.orders o WHERE o.id = p_order_id);
END;
$func$;

-- ══ record_payment ═════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_payment(
  p_order_id uuid, p_method text, p_amount numeric, p_gateway_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_o   RECORD;
  v_pay RECORD;
BEGIN
  IF p_method NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_method;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  SELECT * INTO v_o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated';
  ELSIF NOT public.is_member(v_uid, v_o.location_id) THEN
    RAISE EXCEPTION 'Access denied for location';
  ELSIF NOT public.has_role(v_uid, ARRAY['owner', 'manager', 'cashier']) THEN
    RAISE EXCEPTION 'Role not permitted to record payments';
  END IF;

  IF p_gateway_ref IS NOT NULL THEN
    SELECT * INTO v_pay FROM public.payments
      WHERE order_id = p_order_id AND gateway_ref = p_gateway_ref;
    IF FOUND THEN RETURN row_to_json(v_pay)::jsonb; END IF;
  END IF;

  INSERT INTO public.payments (order_id, method, amount, status, gateway_ref)
    VALUES (p_order_id, p_method, p_amount, 'paid', p_gateway_ref)
    RETURNING * INTO v_pay;
  UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;

  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (v_uid, v_o.location_id, 'record_payment', 'payments', v_pay.id::text,
            jsonb_build_object('order_id', p_order_id, 'amount', p_amount, 'method', p_method));

  RETURN row_to_json(v_pay)::jsonb;
END;
$func$;

-- ══ Inventory adjustments ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.restock_ingredient(
  p_ingredient_id uuid, p_qty numeric, p_reason text DEFAULT 'restock'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_ing RECORD;
BEGIN
  IF p_reason <> 'restock' THEN RAISE EXCEPTION 'restock_ingredient only accepts reason restock'; END IF;
  IF p_qty IS NULL OR p_qty <= 0 THEN RAISE EXCEPTION 'Restock qty must be > 0'; END IF;
  SELECT * INTO v_ing FROM public.ingredients WHERE id = p_ingredient_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ingredient not found'; END IF;
  IF v_uid IS NULL OR NOT public.is_member(v_uid, v_ing.location_id)
     OR NOT public.has_role(v_uid, ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not permitted to restock';
  END IF;
  UPDATE public.ingredients SET stock_qty = stock_qty + p_qty WHERE id = p_ingredient_id;
  INSERT INTO public.inventory_logs (ingredient_id, change_qty, reason)
    VALUES (p_ingredient_id, p_qty, 'restock');
  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (v_uid, v_ing.location_id, 'restock', 'ingredients', p_ingredient_id::text,
            jsonb_build_object('qty', p_qty));
  RETURN (SELECT row_to_json(i)::jsonb FROM public.ingredients i WHERE i.id = p_ingredient_id);
END;
$func$;

CREATE OR REPLACE FUNCTION public.adjust_ingredient(
  p_ingredient_id uuid, p_change numeric, p_reason text DEFAULT 'adjustment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_ing RECORD;
BEGIN
  IF p_reason NOT IN ('wastage', 'adjustment') THEN
    RAISE EXCEPTION 'adjust_ingredient accepts only wastage/adjustment';
  END IF;
  IF p_change IS NULL OR p_change = 0 THEN RAISE EXCEPTION 'Change must be non-zero'; END IF;
  SELECT * INTO v_ing FROM public.ingredients WHERE id = p_ingredient_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ingredient not found'; END IF;
  IF v_uid IS NULL OR NOT public.is_member(v_uid, v_ing.location_id)
     OR NOT public.has_role(v_uid, ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not permitted to adjust inventory';
  END IF;
  UPDATE public.ingredients SET stock_qty = stock_qty + p_change WHERE id = p_ingredient_id;
  INSERT INTO public.inventory_logs (ingredient_id, change_qty, reason)
    VALUES (p_ingredient_id, p_change, p_reason);
  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (v_uid, v_ing.location_id, p_reason, 'ingredients', p_ingredient_id::text,
            jsonb_build_object('change', p_change));
  RETURN (SELECT row_to_json(i)::jsonb FROM public.ingredients i WHERE i.id = p_ingredient_id);
END;
$func$;

-- ══ Loyalty ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.redeem_loyalty(p_customer_id uuid, p_points int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid  uuid := auth.uid();
  v_cust RECORD;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN RAISE EXCEPTION 'Points must be > 0'; END IF;
  SELECT * INTO v_cust FROM public.customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF v_uid IS NULL OR v_cust.business_id <> public.my_business(v_uid)
     OR NOT public.has_role(v_uid, ARRAY['owner', 'manager', 'cashier']) THEN
    RAISE EXCEPTION 'Not permitted to redeem loyalty';
  END IF;
  IF v_cust.loyalty_points < p_points THEN RAISE EXCEPTION 'Insufficient loyalty balance'; END IF;
  UPDATE public.customers SET loyalty_points = loyalty_points - p_points WHERE id = p_customer_id;
  INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
    VALUES (p_customer_id, NULL, -p_points, 'redeem');
  RETURN jsonb_build_object('customer_id', p_customer_id,
    'remaining', v_cust.loyalty_points - p_points);
END;
$func$;

-- ══ Fee period reset ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.reset_fee_period(p_location_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_cfg RECORD;
BEGIN
  IF v_uid IS NULL OR NOT public.is_member(v_uid, p_location_id)
     OR NOT public.has_role(v_uid, ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not permitted to reset fee period';
  END IF;
  UPDATE public.location_fee_config
    SET period_order_count = 0, period_reset_at = now()
    WHERE location_id = p_location_id
    RETURNING * INTO v_cfg;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fee config not found for location'; END IF;
  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (v_uid, p_location_id, 'reset_fee_period', 'location_fee_config', p_location_id::text, '{}'::jsonb);
  RETURN row_to_json(v_cfg)::jsonb;
END;
$func$;

-- ══ Public (anonymous QR) RPCs ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_public_menu(p_slug citext)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_loc RECORD;
BEGIN
  SELECT l.id, l.name, l.slug::text AS slug, l.address, l.phone, l.timezone
    INTO v_loc FROM public.locations l
    WHERE l.slug = p_slug AND l.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Menu not found'; END IF;

  RETURN jsonb_build_object(
    'location', jsonb_build_object(
      'id', v_loc.id, 'name', v_loc.name, 'slug', v_loc.slug,
      'address', v_loc.address, 'phone', v_loc.phone, 'timezone', v_loc.timezone),
    'categories', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id, 'name', c.name, 'sort_order', c.sort_order,
          'items', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', i.id, 'name', i.name, 'description', i.description,
                'price', i.price, 'image_url', i.image_url,
                'is_veg', i.is_veg, 'tax_rate_pct', i.tax_rate_pct,
                'variants', COALESCE((
                  SELECT jsonb_agg(jsonb_build_object(
                      'id', v.id, 'name', v.name, 'price_delta', v.price_delta)
                    ORDER BY v.name)
                  FROM public.menu_item_variants v WHERE v.menu_item_id = i.id), '[]'::jsonb),
                'addons', COALESCE((
                  SELECT jsonb_agg(jsonb_build_object(
                      'id', a.id, 'name', a.name, 'price', a.price)
                    ORDER BY a.name)
                  FROM public.menu_item_addons mia
                  JOIN public.addons a ON a.id = mia.addon_id
                  WHERE mia.menu_item_id = i.id), '[]'::jsonb)
              ) ORDER BY i.name)
            FROM public.menu_items i
            WHERE i.category_id = c.id AND i.location_id = v_loc.id AND i.is_available = true),
          '[]'::jsonb))
        ORDER BY c.sort_order, c.name)
      FROM public.menu_categories c
      WHERE c.location_id = v_loc.id AND c.is_active = true), '[]'::jsonb),
    'uncategorized', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'id', i.id, 'name', i.name, 'description', i.description,
          'price', i.price, 'image_url', i.image_url,
          'is_veg', i.is_veg, 'tax_rate_pct', i.tax_rate_pct)
        ORDER BY i.name)
      FROM public.menu_items i
      WHERE i.location_id = v_loc.id AND i.category_id IS NULL AND i.is_available = true),
    '[]'::jsonb));
END;
$func$;

CREATE OR REPLACE FUNCTION public.create_public_order(
  p_slug           citext,
  p_items          jsonb,
  p_order_type     text DEFAULT 'dine_in',
  p_table_qr       text DEFAULT NULL,
  p_customer_id    uuid DEFAULT NULL,
  p_offer_id       uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'upi'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_loc      RECORD;
  v_table_id uuid := NULL;
  v_biz      uuid;
  v_order_id uuid;
  v_it       jsonb;
  v_menu_item_id uuid;
  v_variant_id   uuid;
  v_qty          int;
  v_notes        text;
  v_aids         jsonb;
  v_price        numeric(10,2);
  v_tax_rate     numeric(5,2);
  v_delta        numeric(10,2);
  v_addon_sum    numeric;
  v_aid          uuid;
  v_aprice       numeric(10,2);
  v_line_sub     numeric;
  v_line_tax     numeric;
  v_subtotal     numeric := 0;
  v_tax_total    numeric := 0;
  v_discount     numeric := 0;
  v_fee          numeric;
  v_fee_payer    text;
  v_grand        numeric;
  v_total_qty    int := 0;
  v_cheapest     numeric;
  v_o_type       text;
  v_o_value      numeric;
  v_o_min        numeric;
  v_line         RECORD;
  v_oi_id        uuid;
BEGIN
  IF p_order_type NOT IN ('dine_in', 'takeaway', 'delivery') THEN
    RAISE EXCEPTION 'Invalid order_type: %', p_order_type;
  END IF;
  IF p_payment_method NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  SELECT l.id, l.business_id INTO v_loc FROM public.locations l
    WHERE l.slug = p_slug AND l.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet not found or inactive'; END IF;
  v_biz := v_loc.business_id;

  IF p_table_qr IS NOT NULL THEN
    SELECT t.id INTO v_table_id FROM public.dine_tables t
      WHERE t.qr_token = p_table_qr AND t.location_id = v_loc.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'QR table not found at this outlet'; END IF;
  END IF;

  IF p_customer_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers c
      WHERE c.id = p_customer_id AND c.business_id = v_biz;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found in this business'; END IF;
  END IF;

  CREATE TEMP TABLE tmp_pub_lines (
    menu_item_id uuid, variant_id uuid, qty int, notes text,
    unit_price numeric, tax_rate numeric, addon_ids uuid[], addon_total numeric
  ) ON COMMIT DROP;

  FOR v_it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      v_menu_item_id := (v_it ->> 'menu_item_id')::uuid;
      v_qty := (v_it ->> 'qty')::int;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Malformed order item: %', v_it;
    END;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Item qty must be > 0'; END IF;
    v_variant_id := NULLIF(v_it ->> 'variant_id', '')::uuid;
    v_notes := NULLIF(v_it ->> 'notes', '');
    v_aids := COALESCE(v_it -> 'addon_ids', '[]'::jsonb);
    IF jsonb_typeof(v_aids) <> 'array' THEN RAISE EXCEPTION 'addon_ids must be an array'; END IF;

    SELECT mi.price, mi.tax_rate_pct INTO v_price, v_tax_rate
      FROM public.menu_items mi
      WHERE mi.id = v_menu_item_id AND mi.location_id = v_loc.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found at outlet', v_menu_item_id; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.menu_items mi
                   WHERE mi.id = v_menu_item_id AND mi.is_available = true) THEN
      RAISE EXCEPTION 'Menu item % is not available', v_menu_item_id;
    END IF;

    v_delta := 0;
    IF v_variant_id IS NOT NULL THEN
      SELECT v.price_delta INTO v_delta FROM public.menu_item_variants v
        WHERE v.id = v_variant_id AND v.menu_item_id = v_menu_item_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variant does not belong to item'; END IF;
    END IF;

    v_addon_sum := 0;
    FOR v_aid IN SELECT value::uuid FROM jsonb_array_elements_text(v_aids) AS value LOOP
      SELECT a.price INTO v_aprice FROM public.addons a
        WHERE a.id = v_aid AND a.location_id = v_loc.id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Addon % not found at outlet', v_aid; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.menu_item_addons mia
                     WHERE mia.menu_item_id = v_menu_item_id AND mia.addon_id = v_aid) THEN
        RAISE EXCEPTION 'Addon % is not linked to item %', v_aid, v_menu_item_id;
      END IF;
      v_addon_sum := v_addon_sum + v_aprice;
    END LOOP;

    v_line_sub := ((v_price + v_delta) + v_addon_sum) * v_qty;
    v_line_tax := v_line_sub * (v_tax_rate / 100);
    v_subtotal := v_subtotal + v_line_sub;
    v_tax_total := v_tax_total + v_line_tax;
    v_total_qty := v_total_qty + v_qty;
    IF v_cheapest IS NULL OR ((v_price + v_delta) + v_addon_sum) < v_cheapest THEN
      v_cheapest := (v_price + v_delta) + v_addon_sum;
    END IF;

    INSERT INTO tmp_pub_lines
      SELECT v_menu_item_id, v_variant_id, v_qty, v_notes,
             (v_price + v_delta), v_tax_rate,
             COALESCE((SELECT array_agg(value::uuid)
                       FROM jsonb_array_elements_text(v_aids) AS value), '{}'::uuid[]),
             v_addon_sum;
  END LOOP;

  IF p_offer_id IS NOT NULL THEN
    SELECT o.type, o.value, o.min_order_value INTO v_o_type, v_o_value, v_o_min
      FROM public.offers o
      WHERE o.id = p_offer_id AND o.location_id = v_loc.id AND o.is_active = true
        AND (o.valid_from IS NULL OR now() >= o.valid_from)
        AND (o.valid_to IS NULL OR now() <= o.valid_to);
    IF NOT FOUND THEN RAISE EXCEPTION 'Offer invalid, expired or not applicable'; END IF;
    IF v_subtotal < v_o_min THEN RAISE EXCEPTION 'Offer needs minimum order value %', v_o_min; END IF;
    CASE v_o_type
      WHEN 'flat' THEN v_discount := LEAST(v_o_value, v_subtotal);
      WHEN 'percent' THEN v_discount := LEAST(v_subtotal * (v_o_value / 100), v_subtotal);
      WHEN 'bogo' THEN
        IF v_total_qty < 2 THEN RAISE EXCEPTION 'BOGO needs at least 2 items'; END IF;
        v_discount := CASE WHEN v_o_value > 0 THEN LEAST(v_o_value, v_cheapest) ELSE v_cheapest END;
      ELSE RAISE EXCEPTION 'Unknown offer type';
    END CASE;
  END IF;

  SELECT f.fee, f.payer INTO v_fee, v_fee_payer FROM public._next_fee(v_loc.id) AS f;

  v_grand := v_subtotal + v_tax_total - v_discount
             + CASE WHEN v_fee_payer = 'customer' THEN v_fee ELSE 0 END;
  IF v_grand < 0 THEN v_grand := 0; END IF;

  INSERT INTO public.orders
    (location_id, table_id, customer_id, order_type, status, placed_by,
     subtotal, tax_total, discount_total, platform_fee, fee_payer, grand_total, payment_status)
  VALUES
    (v_loc.id, v_table_id, p_customer_id, p_order_type, 'new', NULL,
     v_subtotal, v_tax_total, v_discount, v_fee, v_fee_payer, v_grand, 'unpaid')
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM tmp_pub_lines LOOP
    INSERT INTO public.order_items (order_id, menu_item_id, variant_id, qty, unit_price, notes)
      VALUES (v_order_id, v_line.menu_item_id, v_line.variant_id, v_line.qty,
              v_line.unit_price, v_line.notes)
      RETURNING id INTO v_oi_id;
    INSERT INTO public.order_item_addons (order_item_id, addon_id, price)
      SELECT v_oi_id, u.aid, ad.price
      FROM unnest(v_line.addon_ids) AS u(aid)
      JOIN public.addons ad ON ad.id = u.aid;
  END LOOP;

  IF p_order_type = 'dine_in' AND v_table_id IS NOT NULL THEN
    UPDATE public.dine_tables SET status = 'occupied' WHERE id = v_table_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (NULL, v_loc.id, 'create_public_order', 'orders', v_order_id::text,
            jsonb_build_object('grand_total', v_grand, 'method', p_payment_method));

  RETURN jsonb_build_object(
    'id', v_order_id, 'subtotal', v_subtotal, 'tax_total', v_tax_total,
    'discount_total', v_discount, 'platform_fee', v_fee, 'fee_payer', v_fee_payer,
    'grand_total', v_grand, 'payment_status', 'unpaid');
END;
$func$;

CREATE OR REPLACE FUNCTION public.get_public_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_o RECORD;
BEGIN
  SELECT o.id, o.order_type, o.status, o.subtotal, o.tax_total, o.discount_total,
         o.platform_fee, o.fee_payer, o.grand_total, o.payment_status, o.created_at,
         t.label AS table_label
    INTO v_o FROM public.orders o
    LEFT JOIN public.dine_tables t ON t.id = o.table_id
    WHERE o.id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  RETURN jsonb_build_object(
    'id', v_o.id, 'order_type', v_o.order_type, 'status', v_o.status,
    'subtotal', v_o.subtotal, 'tax_total', v_o.tax_total,
    'discount_total', v_o.discount_total, 'platform_fee', v_o.platform_fee,
    'fee_payer', v_o.fee_payer, 'grand_total', v_o.grand_total,
    'payment_status', v_o.payment_status, 'table_label', v_o.table_label,
    'created_at', v_o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'name', mi.name, 'qty', oi.qty, 'unit_price', oi.unit_price,
          'notes', oi.notes,
          'addons', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('name', a.name, 'price', oia.price))
            FROM public.order_item_addons oia
            JOIN public.addons a ON a.id = oia.addon_id
            WHERE oia.order_item_id = oi.id), '[]'::jsonb))
        ORDER BY mi.name)
      FROM public.order_items oi
      JOIN public.menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = p_order_id), '[]'::jsonb));
END;
$func$;

-- ══ Reports ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.report_top_items(
  p_location_id uuid, p_from timestamptz, p_to timestamptz
)
RETURNS TABLE (item_id uuid, item_name text, total_qty bigint, revenue numeric)
LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_member(auth.uid(), p_location_id) THEN
    RAISE EXCEPTION 'Access denied for location';
  END IF;
  IF NOT public.has_role(auth.uid(), ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Reports require owner/manager role';
  END IF;
  RETURN QUERY
    SELECT oi.menu_item_id, mi.name,
           SUM(oi.qty)::bigint,
           SUM(oi.qty * oi.unit_price)::numeric
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.menu_items mi ON mi.id = oi.menu_item_id
    WHERE o.location_id = p_location_id
      AND o.created_at >= p_from AND o.created_at <= p_to
      AND o.status <> 'cancelled'
    GROUP BY oi.menu_item_id, mi.name
    ORDER BY 4 DESC;
END;
$func$;

-- ══ Post-signup bootstrap ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ensure_business_for_owner()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid   uuid := auth.uid();
  v_prof  RECORD;
  v_biz   uuid;
  v_loc   uuid;
  v_base  text;
  v_slug  citext;
  v_try   int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_prof.business_id IS NOT NULL THEN RETURN v_prof.business_id; END IF;
  IF v_prof.role <> 'owner' THEN
    RAISE EXCEPTION 'Only owners can bootstrap a business';
  END IF;

  INSERT INTO public.businesses (owner_user_id, name)
    VALUES (v_uid, COALESCE(v_prof.name, split_part(COALESCE(v_prof.email, 'cafe'), '@', 1)) || '''s Business')
    RETURNING id INTO v_biz;

  v_base := COALESCE(NULLIF(regexp_replace(lower(COALESCE(v_prof.name, 'cafe')), '[^a-z0-9]+', '-', 'g'), ''), 'outlet');
  v_base := trim(both '-' from v_base);
  LOOP
    v_try := v_try + 1;
    v_slug := CASE WHEN v_try = 1 THEN v_base ELSE (v_base || '-' || v_try::text) END::citext;
    BEGIN
      INSERT INTO public.locations (business_id, name, slug)
        VALUES (v_biz, 'Main Outlet', v_slug)
        RETURNING id INTO v_loc;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try > 20 THEN RAISE; END IF;
    END;
  END LOOP;

  INSERT INTO public.user_locations (user_id, location_id)
    VALUES (v_uid, v_loc) ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET business_id = v_biz WHERE id = v_uid;

  INSERT INTO public.location_fee_config (location_id) VALUES (v_loc)
    ON CONFLICT (location_id) DO NOTHING;

  RETURN v_biz;
END;
$func$;

-- ══ Grants ═════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.is_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, text, uuid, uuid, jsonb, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restock_ingredient(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_ingredient(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_fee_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_top_items(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_business_for_owner() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_menu(citext) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(citext, jsonb, text, text, uuid, uuid, text) TO anon, authenticated;
