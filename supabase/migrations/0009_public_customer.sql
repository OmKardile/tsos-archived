-- 0009_public_customer.sql — let anonymous QR/storefront orders attach (or
-- auto-create) a customer by phone, scoped to the outlet's business.
-- Adds an overload of create_public_order with p_customer_name / p_customer_phone.
-- Phone is normalized by trim; blank phone => anonymous order (unchanged behavior).
-- Explicit p_customer_id still wins when supplied.

CREATE OR REPLACE FUNCTION public.create_public_order(
  p_slug           citext,
  p_items          jsonb,
  p_order_type     text DEFAULT 'dine_in',
  p_table_qr       text DEFAULT NULL,
  p_customer_id    uuid DEFAULT NULL,
  p_offer_id       uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'upi',
  p_customer_name  text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_loc      RECORD;
  v_table_id uuid := NULL;
  v_biz      uuid;
  v_cust_id  uuid := p_customer_id;
  v_phone    text;
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

  -- Customer: explicit id wins; otherwise find-or-create by phone.
  IF v_cust_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers c
      WHERE c.id = v_cust_id AND c.business_id = v_biz;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found in this business'; END IF;
  ELSE
    v_phone := NULLIF(btrim(COALESCE(p_customer_phone, '')), '');
    IF v_phone IS NOT NULL THEN
      SELECT c.id INTO v_cust_id FROM public.customers c
        WHERE c.business_id = v_biz AND c.phone = v_phone;
      IF NOT FOUND THEN
        INSERT INTO public.customers (business_id, name, phone)
          VALUES (v_biz, NULLIF(btrim(COALESCE(p_customer_name, ''))), v_phone)
          ON CONFLICT (business_id, phone) DO NOTHING
          RETURNING id INTO v_cust_id;
        IF v_cust_id IS NULL THEN
          SELECT c.id INTO v_cust_id FROM public.customers c
            WHERE c.business_id = v_biz AND c.phone = v_phone;
        END IF;
      END IF;
    END IF;
  END IF;

  CREATE TEMP TABLE tmp_pub_lines2 (
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

    INSERT INTO tmp_pub_lines2
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
    (v_loc.id, v_table_id, v_cust_id, p_order_type, 'new', NULL,
     v_subtotal, v_tax_total, v_discount, v_fee, v_fee_payer, v_grand, 'unpaid')
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM tmp_pub_lines2 LOOP
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

GRANT EXECUTE ON FUNCTION public.create_public_order(citext, jsonb, text, text, uuid, uuid, text, text, text)
  TO anon, authenticated;
