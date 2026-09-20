-- 0010 hardening + wrapper (mirrors live repairs 2026-09-17, makes fresh
-- setups converge to the hardened production state).
--
-- 1) create_public_order 9-arg overload becomes a thin wrapper: resolve the
--    customer by phone, then delegate to the canonical 7-arg implementation
--    (no duplicated pricing logic). Replaces the full 9-arg body from 0009.
-- 2) Revoke PUBLIC execute on internal trigger/helper functions.
-- 3) Revoke anon execute on all staff-only RPCs (public QR RPCs keep anon).

-- ── 1) wrapper ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_public_order(
  p_slug citext,
  p_items jsonb,
  p_order_type text,
  p_table_qr text,
  p_customer_id uuid,
  p_offer_id uuid,
  p_payment_method text,
  p_customer_name text,
  p_customer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_biz uuid;
  v_cust_id uuid := p_customer_id;
  v_phone text;
BEGIN
  IF v_cust_id IS NULL THEN
    v_phone := NULLIF(btrim(COALESCE(p_customer_phone, '')), '');

    IF v_phone IS NOT NULL THEN
      SELECT l.business_id
        INTO v_biz
        FROM public.locations l
       WHERE l.slug = p_slug
         AND l.is_active = true;

      IF v_biz IS NULL THEN
        RAISE EXCEPTION 'Outlet not found or inactive';
      END IF;

      SELECT c.id
        INTO v_cust_id
        FROM public.customers c
       WHERE c.business_id = v_biz
         AND c.phone = v_phone;

      IF v_cust_id IS NULL THEN
        INSERT INTO public.customers (business_id, name, phone)
        VALUES (
          v_biz,
          NULLIF(btrim(COALESCE(p_customer_name, '')), ''),
          v_phone
        )
        ON CONFLICT (business_id, phone) DO NOTHING
        RETURNING id INTO v_cust_id;

        IF v_cust_id IS NULL THEN
          SELECT c.id
            INTO v_cust_id
            FROM public.customers c
           WHERE c.business_id = v_biz
             AND c.phone = v_phone;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN public.create_public_order(
    p_slug::citext,
    p_items::jsonb,
    p_order_type::text,
    p_table_qr::text,
    v_cust_id::uuid,
    p_offer_id::uuid,
    p_payment_method::text
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_public_order(citext, jsonb, text, text, uuid, uuid, text, text, text)
  TO anon, authenticated;

-- ── 2) internal trigger/helpers: no direct execution by anyone ────────────
REVOKE EXECUTE ON FUNCTION public._next_fee(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ── 3) staff-only RPCs: authenticated members only, never anon ────────────
REVOKE EXECUTE ON FUNCTION public.create_order(uuid, text, uuid, uuid, jsonb, uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transition_order_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_payment(uuid, text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.restock_ingredient(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.adjust_ingredient(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_fee_period(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_top_items(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_business_for_owner() FROM anon;
